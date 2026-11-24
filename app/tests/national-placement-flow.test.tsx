import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, test, vi } from 'vitest';
import { NationalPlacement } from '../src/screens/NationalPlacement';
import * as loader from '../src/data/nationalPlacement';
import type { NationalPlacementRow } from '../src/domain/nationalPlacement';
import { RESULT_COLUMNS, type ResultRow } from '../src/domain/resultReview';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const catalog: Awaited<ReturnType<typeof loader.loadNationalCatalog>> = {
  index: { format: 'jinhak-national-placement-index', version: 2, status: 'draft', collection_sha256: 'a'.repeat(64), collection_rows: 3, collection_universities: 1,
    years: ['2026', '2025'].map(year => ({ year, file: 'a'.repeat(64) + '.json', sha256: 'a'.repeat(64), bytes: 1, rows: 3, universities: 1 })) },
  collection: { format: 'jinhak-navi-collected-index', version: 1, status: 'draft', generated_at: '', source_file: '', source_sha256: 'a'.repeat(64), rows: 3, sources: 1, universities: [] },
};
const row = (id: string, cut = '2.400'): NationalPlacementRow => ({ id, sourceRow: 0, year: '2026', university: '가상대', recruit_unit: id, program: '교과전형', admission_type: '교과', round: '수시', metric: '교과등급', grade_system: '9', basis: '최종등록자', cut_50: '2.1', cut_70: cut });
const renderBoard = () => render(<MemoryRouter><NationalPlacement /></MemoryRouter>);

test('70% 컷이 없는 대학도 대체 컷과 수집 원문으로 찾아갈 수 있다', async () => {
  vi.spyOn(loader, 'loadNationalCatalog').mockResolvedValue({ ...catalog, collection: { ...catalog.collection, universities: [
    { university: '강원대(춘천)', file: 'test.json', sha256: 'a'.repeat(64), bytes: 1, rows: 1, years: ['2026'], rounds: { 수시: 1 }, sources: 1 },
    { university: '한라대학교', file: 'test2.json', sha256: 'b'.repeat(64), bytes: 1, rows: 1, years: ['2026'], rounds: { 수시: 1 }, sources: 1 },
  ] } });
  vi.spyOn(loader, 'loadNationalYear').mockResolvedValue([{ ...row('간호학과', ''), university: '강원대(춘천)', cut_50: '2.51' }]);
  renderBoard();
  fireEvent.click(await screen.findByRole('button', { name: '50% 컷으로 보기' }));
  expect(await screen.findByRole('button', { name: /강원대\(춘천\) 50% 컷 2.51등급/ })).toBeTruthy();
  fireEvent.change(screen.getByLabelText('대학 검색'), { target: { value: '한라' } });
  expect(screen.getByText('조건에 맞는 입결 좌표가 없어요')).toBeTruthy();
  const link = screen.getByRole('link', { name: '한라대학교 수집 자료' });
  expect(new URL(link.getAttribute('href')!, 'http://localhost').searchParams.get('cu')).toBe('한라대학교');
  expect(link.closest('details')?.open).toBe(true);
  expect(screen.queryByRole('button', { name: '70% 컷으로 보기' })).toBeNull();
});

test('같은 좌표의 원문을 선택하고 실제 원문 필드를 조회하며 목록 정렬·검색을 제공한다', async () => {
  vi.spyOn(loader, 'loadNationalCatalog').mockResolvedValue(catalog);
  vi.spyOn(loader, 'loadNationalYear').mockResolvedValue([row('가학과'), row('나학과'), row('다학과', '3.500')]);
  vi.spyOn(loader, 'loadPlacementSource').mockImplementation(async r => ({ ...(Object.fromEntries(RESULT_COLUMNS.map(c => [c, ''])) as ResultRow), ...r, result_year: '2026', grade_system: '9', source_url: 'https://example.invalid/original.pdf', source_page: '12쪽 표3' }));
  renderBoard();
  fireEvent.click(await screen.findByRole('button', { name: '가상대 70% 컷 2.4등급, 교과, 원문 2행 상세' }));
  let dialog = screen.getByRole('dialog');
  fireEvent.click(within(dialog).getByRole('button', { name: /나학과 · 교과전형/ }));
  await within(dialog).findByText('12쪽 표3');
  expect(within(dialog).getByText('2.400')).toBeTruthy();
  expect(within(dialog).getByRole('link').getAttribute('href')).toBe('https://example.invalid/original.pdf');
  fireEvent.click(within(dialog).getByRole('button', { name: '같은 위치의 2행 보기' }));
  expect(within(dialog).getByRole('button', { name: /가학과 · 교과전형/ })).toBeTruthy();
  fireEvent.click(within(dialog).getByRole('button', { name: '닫기' }));
  fireEvent.click(screen.getByRole('button', { name: '전체 목록' }));
  fireEvent.click(screen.getByRole('button', { name: '70% 컷 오름차순 정렬' }));
  fireEvent.click(screen.getByRole('button', { name: '70% 컷 내림차순 정렬' }));
  expect(screen.getByRole('table').querySelector('tbody tr')?.textContent).toContain('다학과');
  fireEvent.change(screen.getByLabelText('학과·전형 검색'), { target: { value: '없는학과' } });
  expect(screen.getByText('조건에 맞는 입결 좌표가 없어요')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '조건 초기화' }));
  expect(screen.getByRole('table').querySelectorAll('tbody tr')).toHaveLength(3);
  fireEvent.change(screen.getByLabelText('등급 범위 시작'), { target: { value: '8' } });
  fireEvent.change(screen.getByLabelText('등급 범위 끝'), { target: { value: '2' } });
  expect(screen.getByRole('alert').textContent).toContain('시작 값');
});

test('학년도를 바꾼 뒤 늦게 도착한 이전 결과를 표시하지 않고 자료 오류는 재시도한다', async () => {
  vi.spyOn(loader, 'loadNationalCatalog').mockResolvedValue(catalog);
  let old!: (rows: NationalPlacementRow[]) => void;
  const load = vi.spyOn(loader, 'loadNationalYear').mockImplementationOnce(() => new Promise(resolve => { old = resolve; }))
    .mockRejectedValueOnce(new Error('자료 연결 실패')).mockResolvedValueOnce([{ ...row('새학과'), year: '2025' }]);
  renderBoard();
  await waitFor(() => expect(load).toHaveBeenCalledTimes(1));
  fireEvent.click(within(screen.getByRole('group', { name: '입결 학년도' })).getByRole('button', { name: '2025' }));
  await screen.findByText('자료 연결 실패');
  fireEvent.click(screen.getByRole('button', { name: '자료 다시 불러오기' }));
  await screen.findByRole('button', { name: /가상대 70% 컷/ });
  old([row('이전학과', '8.5')]);
  await waitFor(() => expect(screen.queryByRole('button', { name: /8.5등급/ })).toBeNull());
  fireEvent.click(screen.getByRole('button', { name: '전체 목록' }));
  expect(screen.getByText('새학과')).toBeTruthy();
  expect(screen.queryByText('이전학과')).toBeNull();
});

test('좌표가 없는 대학도 모두 보이며 추가 통계 선택과 해당 원문으로 연결된다', async () => {
  const universities = ['한라대학교', '자료없는대학교', '다른연도대학교'].map((university, i) => ({ university, file: 'test.json', sha256: 'a'.repeat(64), bytes: 1, rows: 1, years: [i === 2 ? '2024' : '2026'], rounds: { 수시: 1 }, sources: 1 }));
  vi.spyOn(loader, 'loadNationalCatalog').mockResolvedValue({ ...catalog, collection: { ...catalog.collection, universities } });
  const halla = { ...row('학과', ''), university: '한라대학교', cut_50: '', statistics: { cut_75: { value: '5.43', population: '최종등록자', evidence: '최종등록자 75%컷 5.43' } } };
  vi.spyOn(loader, 'loadNationalYear').mockResolvedValue([halla, { ...row('미공개', ''), university: '자료없는대학교', cut_50: '', metric: '기타', grade_system: '' }]);
  vi.spyOn(loader, 'loadPlacementSource').mockResolvedValue({ ...(Object.fromEntries(RESULT_COLUMNS.map(c => [c, ''])) as ResultRow), ...halla, result_year: '2026', cut_other: '최종등록자 75%컷 5.43', source_page: '원문 1쪽' });
  renderBoard();
  fireEvent.click(await screen.findByRole('button', { name: '수집 대학 3' }));
  expect(screen.getByRole('link', { name: '자료없는대학교 수집 원문' })).toBeTruthy();
  expect(screen.getByText('선택 학년도 수집 자료 없음')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '한라대학교 75% 컷 1행 보기' }));
  expect(within(screen.getByRole('group', { name: '컷·통계 기준' })).getByRole('button', { name: '75% 컷' }).getAttribute('aria-pressed')).toBe('true');
  fireEvent.click(await screen.findByRole('button', { name: '한라대학교 75% 컷 5.43등급, 교과, 원문 1행 상세' }));
  await within(screen.getByRole('dialog')).findByText('원문 1쪽');
  expect(within(screen.getByRole('dialog')).getByText('75% 컷 · 5.43등급')).toBeTruthy();
});
