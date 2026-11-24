import 'fake-indexeddb/auto';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { InterestComparison } from '../src/screens/InterestComparison';
import { studentDb } from '../src/store/studentDb';
import * as loader from '../src/data/collectedResults';
import * as national from '../src/data/nationalPlacement';
import { RESULT_COLUMNS, type ResultRow } from '../src/domain/resultReview';
import type { CollectedIndex } from '../src/domain/collectedResults';
import { interestId, type Interest } from '../src/domain/interests';
import { chosenComparisonRecord, comparisonPath, comparisonRecords, comparisonSelection, comparisonStatistic, differsOrUnknown } from '../src/domain/interestComparison';

const interest = (name = '가온대', department: string | undefined = '간호학과'): Interest => ({ id: interestId(name, '일반전형', department), university: name, program: '일반전형', department, created_at: '2026-11-20T00:00:00Z' });
const row = (change: Partial<ResultRow> = {}): ResultRow => ({ ...Object.fromEntries(RESULT_COLUMNS.map(field => [field, ''])), university: '가온대', program: '일반전형', recruit_unit: '간호학과', result_year: '2026', round: '수시', metric: '교과등급', grade_system: '9', cut_70: '2.400', cut_50: '2.100', quota: '20', competition_rate: '5.2', admission_type: '교과', basis: '최종등록자', source_url: 'https://example.invalid/source.pdf', source_page: '12쪽', ...change }) as ResultRow;
const index: CollectedIndex = { format: 'jinhak-navi-collected-index', version: 1, status: 'draft', generated_at: '', source_file: '', source_sha256: 'a'.repeat(64), rows: 2, sources: 2,
  universities: ['가온대', '누리대', '다온대', '라온대', '마루대'].map(university => ({ university, file: 'a'.repeat(64) + '.json', sha256: 'a'.repeat(64), bytes: 1, rows: 1, sources: 1, years: ['2024', '2025', '2026'], rounds: { 수시: 1 } })) };
beforeEach(async () => { await studentDb.clearStudentData(); vi.spyOn(loader, 'loadCollectedIndex').mockResolvedValue(index); vi.spyOn(loader, 'loadCollectedRows').mockImplementation(async entry => [row({ university: entry.university, cut_70: entry.university === '가온대' ? '2.400' : '3.100' })]); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const save = async (items: Interest[]) => { await studentDb.interests.bulkPut(items); };
const show = (ids: string[] = []) => render(<MemoryRouter initialEntries={[comparisonPath(ids)]}><InterestComparison /></MemoryRouter>);

test('대학·캠퍼스·전형·학과·연도·시기·지표가 정확히 맞는 원문만 선택한다', () => {
  const rows = [row(), row({ recruit_unit: '약학과' }), row({ university: '가온대(분교)' }), row({ program: '지역전형' }), row({ result_year: '2025' }), row({ round: '정시' }), row({ metric: '환산점수' })];
  const records = comparisonRecords(interest(), rows, '2026', '수시', '교과등급');
  expect(records.map(record => record.sourceRow)).toEqual([0]);
  expect(comparisonRecords({ ...interest(), department: undefined }, rows, '2026', '수시', '교과등급')).toEqual([]);
  expect(chosenComparisonRecord([...records, { sourceRow: 9, row: row() }])).toBeNull();
  expect(comparisonStatistic(records[0], 'cut_70')).toBe('2.400');
  expect(comparisonStatistic({ sourceRow: 0, row: row({ grade_system: '5' }) }, 'cut_70')).toBeNull();
  expect(comparisonStatistic({ sourceRow: 0, row: row({ cut_70: '' }) }, 'cut_70')).toBeNull();
});

test('중복·삭제·학과 미지정 항목을 제외하고 최대 4개만 비교하며 숫자 표기 차이는 차이로 세지 않는다', () => {
  const items = ['가온대', '누리대', '다온대', '라온대', '마루대'].map(name => interest(name));
  const legacy = { ...interest('옛대'), id: interestId('옛대', '일반전형'), department: undefined };
  expect(comparisonSelection([...items, legacy], [legacy.id, items[0].id, items[0].id, '삭제됨', ...items.slice(1).map(item => item.id)])).toHaveLength(4);
  expect(differsOrUnknown([{ text: '2.400', known: true }, { text: '2.4', known: true }])).toBe(false);
  expect(differsOrUnknown([{ text: '미기재', known: false }, { text: '미기재', known: false }])).toBe(true);
});

test('옛 교명으로 저장한 관심 항목은 같은 캠퍼스 원문을 읽고 저장 기록은 보존한다', async () => {
  const saved = interest('강릉원주대(원주)');
  const current = '강원대학교(원주)';
  const currentIndex = { ...index, universities: [{ ...index.universities[0], university: current }, index.universities[0]] };
  vi.mocked(loader.loadCollectedIndex).mockResolvedValue(currentIndex);
  const candidates = [row({ university: '강원대학교(강릉)' }), row({ university: current }), row({ university: current, recruit_unit: '다른학과' })];
  expect(comparisonRecords(saved, candidates, '2026', '수시', '교과등급').map(r => r.sourceRow)).toEqual([1]);
  const other = interest();
  await save([saved, other]);
  show([saved.id, other.id]);
  await screen.findByRole('button', { name: '강릉원주대(원주) 일반전형 간호학과 2026학년도 원문 상세' });
  expect(loader.loadCollectedRows).toHaveBeenCalledWith(currentIndex.universities[0]);
  expect(await studentDb.interests.get(saved.id)).toEqual(saved);
});

test('관심이 없으면 안내하고 선택 화면에서 입결로 이동한다', async () => {
  show();
  fireEvent.click(await screen.findByRole('button', { name: '관심 전형 선택' }));
  expect(await screen.findByRole('link', { name: '입결에서 관심 학과 담기' })).toBeTruthy();
  expect((screen.getByRole('button', { name: '선택한 0개 비교' }) as HTMLButtonElement).disabled).toBe(true);
});

test('선택기 2~4개 제한·검색·취소와 비교에서 빼기는 하트 기록을 유지한다', async () => {
  const items = ['가온대', '누리대', '다온대', '라온대', '마루대'].map(name => interest(name));
  await save([...items, { ...interest('옛대'), id: interestId('옛대', '일반전형'), department: undefined }]); show();
  fireEvent.click(await screen.findByRole('button', { name: '관심 전형 선택' }));
  const dialog = screen.getByRole('dialog');
  for (const item of items.slice(0, 4)) fireEvent.click(within(dialog).getByRole('checkbox', { name: `${item.university} 일반전형 · 간호학과` }));
  expect((within(dialog).getByRole('checkbox', { name: '마루대 일반전형 · 간호학과' }) as HTMLInputElement).disabled).toBe(true);
  expect((within(dialog).getByRole('checkbox', { name: '옛대 일반전형 · 학과 미지정' }) as HTMLInputElement).disabled).toBe(true);
  fireEvent.click(within(dialog).getByRole('button', { name: '선택한 4개 비교' }));
  await screen.findByRole('table');
  fireEvent.click(screen.getByRole('button', { name: '가온대 일반전형 간호학과 비교에서 빼기' }));
  expect(await studentDb.interests.count()).toBe(6);
  expect(screen.queryByRole('button', { name: '가온대 일반전형 간호학과 비교에서 빼기' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: '전형 추가' }));
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: '가온' } });
  fireEvent.click(screen.getByRole('checkbox', { name: '가온대 일반전형 · 간호학과' }));
  fireEvent.click(screen.getByRole('button', { name: '취소' }));
  expect(screen.queryByRole('button', { name: '가온대 일반전형 간호학과 비교에서 빼기' })).toBeNull();
});

test('여러 원문을 임의로 합치지 않고 선택한 원문의 모집인원·상세만 표시한다', async () => {
  const items = [interest(), interest('누리대')]; await save(items);
  vi.mocked(loader.loadCollectedRows).mockImplementation(async entry => entry.university === '가온대' ? [row(), row({ quota: '31', cut_70: '3.800', source_page: '99쪽', basis: '다른 반영 과목' }), row({ recruit_unit: '약학과', quota: '999' })] : [row({ university: '누리대' })]);
  show(items.map(item => item.id));
  const choice = await screen.findByRole('combobox', { name: '가온대 일반전형 간호학과 2026학년도 원문 선택' });
  expect(screen.queryByText('999')).toBeNull();
  expect(screen.queryByText('3.800')).toBeNull();
  fireEvent.change(choice, { target: { value: '1' } });
  expect(await screen.findByText('31명')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '가온대 일반전형 간호학과 2026학년도 원문 상세' }));
  expect(within(screen.getByRole('dialog')).getByText('99쪽')).toBeTruthy();
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: '닫기' }));
  fireEvent.click(screen.getByRole('button', { name: '다른 점만' }));
  expect(screen.queryByRole('rowheader', { name: '2026 전형 유형' })).toBeNull();
  expect(screen.getByRole('rowheader', { name: '수능최저' })).toBeTruthy();
  fireEvent.change(screen.getByLabelText('입결 학년도'), { target: { value: '2025' } });
  expect(screen.getAllByText('해당 연도·시기·지표 자료 없음').length).toBeGreaterThan(0);
});

test('자료 실패는 재시도하여 원문을 다시 읽을 수 있다', async () => {
  const items = [interest(), interest('누리대')]; await save(items);
  vi.mocked(loader.loadCollectedRows).mockRejectedValueOnce(new Error('파일 연결 실패'));
  show(items.map(item => item.id));
  fireEvent.click(await screen.findByRole('button', { name: '자료 다시 불러오기' }));
  await screen.findByRole('button', { name: '가온대 일반전형 간호학과 2026학년도 원문 상세' });
  await waitFor(() => expect(screen.queryByText('파일 연결 실패')).toBeNull());
});

test('추가 통계 로딩 실패를 70%나 평균으로 대체하지 않는다', async () => {
  const items = [interest(), interest('누리대')]; await save(items);
  vi.spyOn(national, 'loadNationalCatalog').mockRejectedValue(new Error('통계 파일 연결 실패'));
  show(items.map(item => item.id));
  await screen.findByRole('button', { name: '가온대 일반전형 간호학과 2026학년도 원문 상세' });
  fireEvent.change(screen.getByLabelText('컷·통계 기준'), { target: { value: 'cut_75' } });
  await screen.findByRole('button', { name: '자료 다시 불러오기' });
  expect(screen.getAllByText(/통계 파일 연결 실패/).length).toBeGreaterThan(0);
  expect(screen.queryByText('2.400')).toBeNull();
});

test('비교에서 선택한 학과만 지원 준비로 이어지고 입결 연도와 지원 학년도를 구분한다', async () => {
  const items = [interest(), interest('누리대')]; await save(items); show(items.map(item => item.id));
  fireEvent.click(await screen.findByRole('button', { name: '가온대 일반전형 간호학과 지원 준비에 추가' }));
  const dialog = within(screen.getByRole('dialog'));
  expect(dialog.getByText(/살펴본 입결은 2026학년도/)).toBeTruthy();
  expect(dialog.getByLabelText('모집단위(선택)')).toHaveProperty('value', '간호학과');
  fireEvent.change(dialog.getByLabelText('학년도'), { target: { value: '2029' } });
  const saveButton = dialog.getByRole('button', { name: '저장' });
  await waitFor(() => expect(saveButton).toHaveProperty('disabled', false));
  fireEvent.click(saveButton);
  await waitFor(async () => expect(await studentDb.applications.count()).toBe(1));
  expect((await studentDb.applications.toArray())[0]).toMatchObject({ university: '가온대', program: '일반전형', department: '간호학과', year: 2029 });
  expect(await studentDb.interests.count()).toBe(2);
  expect(await studentDb.boards.count()).toBe(0);
});

test('샘플 모드는 시안 데모 3개(가천·강원·경북)를 바로 비교하고, 원문이 여러 건이어도 같은 값만 보여 준다', async () => {
  const { setSampleFlag } = await import('../src/data/sample/mode');
  setSampleFlag('on');
  try {
    show();
    expect(await screen.findByRole('button', { name: '경북대학교 학생부교과(교과우수자) 간호학과 비교에서 빼기' })).toBeTruthy();
    expect(screen.getAllByRole('columnheader')).toHaveLength(4);
    expect(await screen.findByText('18명')).toBeTruthy(); // 비동기 자료 로딩 후, 2026 원문 2건 모두 18명
    expect(screen.getByRole('combobox', { name: '경북대학교 학생부교과(교과우수자) 간호학과 2026학년도 원문 선택' })).toBeTruthy();
    expect(screen.getByText('2024 미기재')).toBeTruthy();
    expect(screen.getByText(/샘플의 대학·숫자는 예시예요/)).toBeTruthy();
    expect(loader.loadCollectedIndex).not.toHaveBeenCalled();
  } finally { setSampleFlag('off'); }
});
