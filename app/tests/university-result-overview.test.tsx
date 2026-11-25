import 'fake-indexeddb/auto';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import * as loader from '../src/data/susiResults';
import { AdmissionResults } from '../src/screens/AdmissionResults';
import { RESULT_COLUMNS, type ResultRow } from '../src/domain/resultReview';
import type { CollectedIndex } from '../src/domain/collectedResults';
import { gradeCut, universityPlot } from '../src/domain/universityResultPlot';
import { studentDb } from '../src/store/studentDb';
import { setSampleFlag } from '../src/data/sample/mode';
vi.mock('../src/data/releasedResults', () => ({ useReleasedResults: () => [] }));
const row = (change: Partial<ResultRow> = {}): ResultRow => ({ ...Object.fromEntries(RESULT_COLUMNS.map(c => [c, ''])), university: '가온대', result_year: '2026', round: '수시', admission_type: '교과', program: '지역균형', recruit_unit: '의예과', grade_system: '9', metric: '교과등급', cut_70: '1.230', source_url: 'https://example.invalid/result.pdf', basis: '반영 교과 평균', source_page: '12쪽', ...change }) as ResultRow;
const index: CollectedIndex = { format: 'jinhak-navi-collected-index', version: 1, status: 'draft', generated_at: '', source_file: '_all.csv', source_sha256: 'a'.repeat(64), rows: 2, sources: 2,
  universities: ['가온대', '누리대'].map(university => ({ university, file: 'a'.repeat(64) + '.json', sha256: 'a'.repeat(64), bytes: 1, rows: 1, sources: 1, years: ['2026'], rounds: { 수시: 1 } })) };
beforeEach(async () => { await studentDb.clearStudentData(); });
afterEach(() => { cleanup(); setSampleFlag('off'); vi.restoreAllMocks(); });
function setup(rows: ResultRow[]) { vi.spyOn(loader, 'loadSusiIndex').mockResolvedValue(index); return vi.spyOn(loader, 'loadSusiRows').mockResolvedValue(rows); }
test('샘플 성적 모드에서도 실제 수시를 읽고 선택한 출처의 값을 상세에 연결한다', async () => {
  setSampleFlag('on');
  const load = setup([row(), row({ cut_70: '1.7', source_page: '다른 출처 20쪽' })]);
  render(<MemoryRouter><AdmissionResults /></MemoryRouter>);
  fireEvent.click(await screen.findByRole('button', { name: '의예과 2026학년도 70% 컷 1.7' }));
  expect(load).toHaveBeenCalled();
  fireEvent.click(within(screen.getByRole('region', { name: '고른 학과' })).getByRole('button', { name: '원문 보기 ›' }));
  expect(within(screen.getByRole('dialog')).getByText('다른 출처 20쪽')).toBeTruthy();
});
test('대조 대상은 표에 원문값을 보존하고 상세에서 사유를 표시한다', async () => {
  const flagged = Object.assign(row({ recruit_unit: '확인학과', cut_70: '3.11' }), { collectionIssues: ['different_values_requires_review'] });
  setup([row(), flagged, Object.assign({ ...flagged, cut_70: '3.22' }, { collectionIssues: ['different_values_requires_review'] })]);
  render(<MemoryRouter><AdmissionResults /></MemoryRouter>);
  await screen.findByText(/원문 대조가 필요한 2행/);
  expect(screen.queryByRole('button', { name: /확인학과 2026학년도 70% 컷/ })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: '표' }));
  expect(screen.getByText('3.11 / 3.22')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '확인학과' }));
  fireEvent.click(screen.getByText('출처별 값 2건 확인'));
  fireEvent.click(screen.getByRole('button', { name: /3.22 · 원문 2/ }));
  expect(within(screen.getByRole('dialog')).getByText(/같은 전형·학과·학년도에 다른 값/)).toBeTruthy();
  expect(within(screen.getByRole('dialog')).getByText('3.22')).toBeTruthy();
});
test('최근 3개 학년만 그리고 같은 연도의 출처·산식이 다른 행을 보존한다', () => {
  const rows = [row(), row({ result_year: '2025', cut_70: '1.4' }), row({ result_year: '2023', cut_70: '1.5' }), row({ cut_70: '1.7', basis: '다른 산식', source_url: 'https://example.invalid/other.pdf' }), row({ round: '정시' })];
  const result = universityPlot(rows, '교과', '지역균형');
  expect(result.years).toEqual([2024, 2025, 2026]);
  expect(result.departments[0].points.map(r => r.cut_70)).toEqual(['1.230', '1.4', '1.7']);
  for (const change of [{ grade_system: '' }, { grade_system: '5' }, { metric: '환산점수' }, { cut_70: '' }, { cut_70: '0' }, { cut_70: '10' }, { cut_70: 'NaN' }]) expect(gradeCut(row(change))).toBeNull();
});
test('기본 경로는 그래프·고른 학과 패널을 표시하고 점 원문·관심·표 보기를 연결한다', async () => {
  setup([row(), row({ result_year: '2025', cut_70: '1.4' }), row({ recruit_unit: '약학과', cut_70: '1.8' }), row({ recruit_unit: '미공개학과', cut_70: '', cut_other: '2.1', basis: '최종 등록자 평균' })]);
  render(<MemoryRouter initialEntries={['/admission-results']}><AdmissionResults /></MemoryRouter>);
  const point = await screen.findByRole('button', { name: '의예과 2026학년도 70% 컷 1.230' });
  expect(screen.getByRole('button', { name: '대학별' }).getAttribute('aria-pressed')).toBe('true');
  expect(screen.getByRole('complementary', { name: '고른 학과와 내 비교' })).toBeTruthy();
  expect(screen.queryByText(/내 환산 범위 약/)).toBeNull(); // 성적이 없으면 내 범위를 그리지 않아요
  fireEvent.click(point);
  const panel = within(screen.getByRole('region', { name: '고른 학과' }));
  expect(panel.getByRole('heading', { name: '가온대 의예과' })).toBeTruthy();
  fireEvent.click(panel.getByRole('button', { name: '원문 보기 ›' }));
  expect(within(screen.getByRole('dialog')).getByText('1.230')).toBeTruthy();
  expect(within(screen.getByRole('dialog')).getByText('12쪽')).toBeTruthy();
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: '닫기' }));
  const heart = await screen.findByRole('button', { name: '가온대 지역균형 의예과 관심에 담기' });
  await waitFor(() => expect((heart as HTMLButtonElement).disabled).toBe(false)); fireEvent.click(heart);
  await screen.findByRole('button', { name: '가온대 지역균형 의예과 관심에서 빼기' });
  expect((await studentDb.interests.toArray()).map(r => r.department)).toEqual(['의예과']);
  await screen.findByText('내 비교 1개');
  fireEvent.click(screen.getByRole('button', { name: /다른 기준\(최종 등록자 평균\)으로 공개된 학과 1개/ }));
  const table = await waitFor(() => screen.getAllByRole('table').find(t => t.classList.contains('ar-table'))!);
  expect(table.querySelectorAll('tbody tr')).toHaveLength(3);
  expect(within(table).getByText('최종 등록자 평균 (좌표에 없음)')).toBeTruthy();
});
test('전형 유형·전형 변경, 빈 상태, 대학 변경 중 늦은 응답을 처리한다', async () => {
  vi.spyOn(loader, 'loadSusiIndex').mockResolvedValue(index);
  let resolveOld!: (r: ResultRow[]) => void;
  vi.spyOn(loader, 'loadSusiRows').mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve; }))
    .mockResolvedValueOnce([row({ university: '누리대', admission_type: '종합', program: '학생부종합', recruit_unit: '간호학과' })]);
  render(<MemoryRouter><AdmissionResults /></MemoryRouter>);
  fireEvent.click(await screen.findByRole('button', { name: '대학 바꾸기' }));
  fireEvent.change(screen.getByLabelText('대학 검색'), { target: { value: '누리' } });
  fireEvent.click(screen.getByRole('button', { name: '누리대' }));
  await screen.findByText('조건에 맞는 학과가 없어요');
  fireEvent.click(screen.getByRole('button', { name: '종합' }));
  await screen.findByRole('button', { name: '간호학과' });
  resolveOld([row()]);
  await waitFor(() => expect(screen.getByRole('heading', { name: '누리대' })).toBeTruthy());
  expect(screen.queryByRole('button', { name: '의예과' })).toBeNull();
});
test('실패한 데이터는 재시도하며 빈 자료로 오인하지 않는다', async () => {
  const load = setup([]); load.mockRejectedValueOnce(new Error('대학 자료 오류')).mockResolvedValueOnce([row()]);
  render(<MemoryRouter><AdmissionResults /></MemoryRouter>);
  await screen.findByText('대학 자료 오류');
  expect(screen.queryByText('조건에 맞는 학과가 없어요')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: '대학 자료 다시 불러오기' }));
  await screen.findByRole('button', { name: '의예과 2026학년도 70% 컷 1.230' });
});
