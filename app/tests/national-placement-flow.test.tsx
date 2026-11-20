import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, test, vi } from 'vitest';
import { NationalPlacement } from '../src/screens/NationalPlacement';
import * as loader from '../src/data/nationalPlacement';
import type { NationalPlacementRow } from '../src/domain/nationalPlacement';
import { RESULT_COLUMNS, type ResultRow } from '../src/domain/resultReview';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const catalog: Awaited<ReturnType<typeof loader.loadNationalCatalog>> = {
  index: { format: 'jinhak-national-placement-index', version: 1, status: 'draft', collection_sha256: 'a'.repeat(64), collection_rows: 3, collection_universities: 1,
    years: ['2026', '2025'].map(year => ({ year, file: 'a'.repeat(64) + '.json', sha256: 'a'.repeat(64), bytes: 1, rows: 3, universities: 1 })) },
  collection: { format: 'jinhak-navi-collected-index', version: 1, status: 'draft', generated_at: '', source_file: '', source_sha256: 'a'.repeat(64), rows: 3, sources: 1, universities: [] },
};
const row = (id: string, cut = '2.400'): NationalPlacementRow => ({ id, sourceRow: 0, year: '2026', university: '가상대', recruit_unit: id, program: '교과전형', admission_type: '교과', round: '수시', metric: '교과등급', basis: '최종등록자', cut_50: '2.1', cut_70: cut });
const renderBoard = () => render(<MemoryRouter><NationalPlacement /></MemoryRouter>);

test('같은 좌표의 원문을 선택하고 실제 원문 필드를 조회하며 목록 정렬·검색을 제공한다', async () => {
  vi.spyOn(loader, 'loadNationalCatalog').mockResolvedValue(catalog);
  vi.spyOn(loader, 'loadNationalYear').mockResolvedValue([row('가학과'), row('나학과'), row('다학과', '3.500')]);
  vi.spyOn(loader, 'loadPlacementSource').mockImplementation(async r => ({ ...(Object.fromEntries(RESULT_COLUMNS.map(c => [c, ''])) as ResultRow), ...r, result_year: '2026', grade_system: '9', source_url: 'https://example.invalid/original.pdf', source_page: '12쪽 표3' }));
  renderBoard();
  fireEvent.click(await screen.findByRole('button', { name: '가상대 70% 컷 2.4등급, 원문 2행 상세' }));
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
  fireEvent.change(screen.getByLabelText('입결 학년도'), { target: { value: '2025' } });
  await screen.findByText('자료 연결 실패');
  fireEvent.click(screen.getByRole('button', { name: '자료 다시 불러오기' }));
  await screen.findByRole('button', { name: /가상대 70% 컷/ });
  old([row('이전학과', '8.5')]);
  await waitFor(() => expect(screen.queryByRole('button', { name: /8.5등급/ })).toBeNull());
  fireEvent.click(screen.getByRole('button', { name: '전체 목록' }));
  expect(screen.getByText('새학과')).toBeTruthy();
  expect(screen.queryByText('이전학과')).toBeNull();
});
