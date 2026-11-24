import 'fake-indexeddb/auto';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { CollectedResultBrowser } from '../src/components/CollectedResultBrowser';
import { AdmissionResults } from '../src/screens/AdmissionResults';
import * as loader from '../src/data/collectedResults';
import { RESULT_COLUMNS, type ResultRow } from '../src/domain/resultReview';
import type { CollectedIndex } from '../src/domain/collectedResults';
import { studentDb } from '../src/store/studentDb';
import { collectedProgramPath, interestId } from '../src/domain/interests';

vi.mock('../src/data/releasedResults', () => ({ useReleasedResults: () => [] }));
const index: CollectedIndex = { format: 'jinhak-navi-collected-index', version: 1, status: 'draft', generated_at: '', source_file: '_all.csv', source_sha256: 'a'.repeat(64), rows: 2, sources: 2,
  universities: ['가온대', '누리대'].map(university => ({ university, file: 'a'.repeat(64) + '.json', sha256: 'a'.repeat(64), bytes: 1, rows: 1, sources: 1, years: ['2026'], rounds: { 수시: 1 } })) };
const row = (change: Partial<ResultRow> = {}): ResultRow => ({ ...Object.fromEntries(RESULT_COLUMNS.map(c => [c, ''])), university: '가온대', result_year: '2026', round: '수시', admission_type: '교과', program: '일반전형', recruit_unit: '국어교육과', metric: '교과등급', cut_70: '2.400', source_url: 'https://example.invalid/result.pdf', source_page: '12쪽 표3', note: 'draft; 원문 대조 필요', ...change }) as ResultRow;
beforeEach(async () => { await studentDb.interests.clear(); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
function setup(rows: ResultRow[]) {
  vi.spyOn(loader, 'loadCollectedIndex').mockResolvedValue(index);
  return vi.spyOn(loader, 'loadCollectedRows').mockResolvedValue(rows);
}

test('정식 이름을 표시해도 선택 값과 불러오는 원본 패키지는 보존한다', async () => {
  const entry = { ...index.universities[0], university: '한국체대' };
  vi.spyOn(loader, 'loadCollectedIndex').mockResolvedValue({ ...index, universities: [entry] });
  const load = vi.spyOn(loader, 'loadCollectedRows').mockResolvedValue([row({ university: '한국체대' })]);
  render(<CollectedResultBrowser initialUniversity="한국체육대학교" />);
  await screen.findByText('한국체육대학교 · 1행 / 1행');
  expect(screen.getByRole('option', { name: '한국체육대학교' })).toHaveProperty('value', '한국체대');
  expect(screen.getByLabelText('수집 대학')).toHaveProperty('value', '한국체대');
  expect(load).toHaveBeenCalledWith(entry);
});

test('구 교명 링크는 현재의 같은 캠퍼스를 열고 구 교명 검색은 해당 캠퍼스만 표시한다', async () => {
  const names = ['강원대학교(춘천)', '강원대학교(강릉)', '강원대학교(원주)'];
  vi.spyOn(loader, 'loadCollectedIndex').mockResolvedValue({ ...index, universities: names.map(university => ({ ...index.universities[0], university })) });
  const load = vi.spyOn(loader, 'loadCollectedRows').mockImplementation(async entry => [row({ university: entry.university })]);
  render(<CollectedResultBrowser initialUniversity="강릉원주대(원주)" />);
  await screen.findByText('강원대학교(원주) · 1행 / 1행');
  expect(load).toHaveBeenLastCalledWith(expect.objectContaining({ university: names[2] }));
  fireEvent.click(screen.getByRole('button', { name: '대학 검색' }));
  const dialog = within(screen.getByRole('dialog', { name: '대학 검색·선택' }));
  fireEvent.change(dialog.getByLabelText('수집 대학 검색'), { target: { value: '강릉원주대' } });
  expect(dialog.queryByRole('button', { name: names[0] })).toBeNull();
  expect(dialog.getByRole('button', { name: names[1] })).toBeTruthy();
  fireEvent.click(dialog.getByRole('button', { name: names[1] }));
  await screen.findByText('강원대학교(강릉) · 1행 / 1행');
});

test('수집 자료 탭에 수집본을 표시하고 같은 전형의 서로 다른 원문과 정밀도를 보존한다', async () => {
  setup([row(), row({ source_url: 'https://example.invalid/other.pdf', metric: '환산점수', cut_70: '910.00' })]);
  render(<MemoryRouter initialEntries={['/admission-results?view=collected']}><AdmissionResults /></MemoryRouter>);
  await screen.findByText('2.400');
  expect(screen.getByText('910.00')).toBeTruthy();
  expect(screen.getAllByText('국어교육과')).toHaveLength(2);
  expect(screen.getByText(/검수 전 참고자료 · 원문 대조/)).toBeTruthy();
  expect(screen.queryByText('내 성적과 비교하는 조건')).toBeNull();
  fireEvent.click(screen.getAllByRole('button', { name: /국어교육과 원문·상세/ })[0]);
  const dialog = await screen.findByRole('dialog');
  expect(within(dialog).getByText('12쪽 표3')).toBeTruthy();
  expect(within(dialog).getByText('draft; 원문 대조 필요')).toBeTruthy();
  expect(within(dialog).getByRole('link')).toHaveProperty('href', 'https://example.invalid/result.pdf');
  expect(within(dialog).getByText('2.400')).toBeTruthy();
  fireEvent.click(within(dialog).getByRole('button', { name: '닫기' }));
  // 검수 완료 입결은 탭이 아니라 기존 주소(view=results)로 열려요(Figma: 대학별 · 내 비교 탭 2개).
  cleanup();
  render(<MemoryRouter initialEntries={['/admission-results?view=results']}><AdmissionResults /></MemoryRouter>);
  expect(screen.getByText('공개된 수시 입결이 아직 없어요')).toBeTruthy();
  expect(screen.queryByText('2.400')).toBeNull();
});

test('학년도·모집시기·전형·학과 필터와 초기화가 동작하고 50행씩 표시한다', async () => {
  setup(Array.from({ length: 55 }, (_, i) => row({ recruit_unit: `학과${i}` })).concat(row({ result_year: '2025', round: '정시', admission_type: '수능', recruit_unit: '물리학과' })));
  render(<CollectedResultBrowser />);
  await screen.findByText('가온대 · 55행 / 56행');
  expect(screen.getByRole('table').querySelectorAll('tbody tr')).toHaveLength(50);
  fireEvent.click(screen.getByRole('button', { name: '다음' }));
  expect(screen.getByRole('table').querySelectorAll('tbody tr')).toHaveLength(5);
  fireEvent.change(screen.getByLabelText('모집시기'), { target: { value: '정시' } });
  fireEvent.change(screen.getByLabelText('학년도'), { target: { value: '2025' } });
  fireEvent.change(screen.getByLabelText('수집 전형 유형'), { target: { value: '수능' } });
  fireEvent.change(screen.getByLabelText('전형·모집단위 검색'), { target: { value: '물리' } });
  expect(screen.getByText('물리학과')).toBeTruthy();
  expect(screen.getByText('1 / 1 페이지')).toBeTruthy();
  fireEvent.change(screen.getByLabelText('전형·모집단위 검색'), { target: { value: '없는학과' } });
  expect(screen.getByText(/조건에 맞는 수집 자료가 없어요/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '검색 조건 초기화' }));
  expect(screen.getByText('가온대 · 56행 / 56행')).toBeTruthy();
});

test('대학을 바꾼 뒤 도착한 이전 응답은 현재 대학을 덮어쓰지 않는다', async () => {
  vi.spyOn(loader, 'loadCollectedIndex').mockResolvedValue(index);
  let resolveOld!: (value: ResultRow[]) => void;
  const load = vi.spyOn(loader, 'loadCollectedRows').mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve; }))
    .mockResolvedValueOnce([row({ university: '누리대', recruit_unit: '누리학과' })]);
  render(<CollectedResultBrowser />);
  await waitFor(() => expect(load).toHaveBeenCalledTimes(1));
  fireEvent.change(screen.getByLabelText('수집 대학'), { target: { value: '누리대' } });
  await screen.findByText('누리학과');
  resolveOld([row({ recruit_unit: '이전학과' })]);
  await waitFor(() => expect(screen.getByText('누리대 · 1행 / 1행')).toBeTruthy());
  expect(screen.queryByText('이전학과')).toBeNull();
});

test('자료 읽기 실패는 빈 결과와 구분하고 재시도하며 위험한 주소는 링크로 만들지 않는다', async () => {
  vi.spyOn(loader, 'loadCollectedIndex').mockResolvedValue(index);
  vi.spyOn(loader, 'loadCollectedRows').mockRejectedValueOnce(new Error('자료 연결 실패'))
    .mockResolvedValueOnce([row({ source_url: 'javascript:alert(1)', cut_70: '12', cut_other: '평균 2.35 / 최저 3.10' })]);
  render(<CollectedResultBrowser />);
  await screen.findByText('자료 연결 실패');
  expect(screen.queryByText(/조건에 맞는 수집 자료가 없어요/)).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: '대학 자료 다시 불러오기' }));
  await screen.findByText('확인 필요');
  fireEvent.click(screen.getByRole('button', { name: /원문·상세/ }));
  const dialog = await screen.findByRole('dialog');
  expect(within(dialog).getByText('평균 2.35 / 최저 3.10')).toBeTruthy();
  expect(within(dialog).queryByRole('link')).toBeNull();
  expect(within(dialog).getByText(/등급 범위/)).toBeTruthy();
});

test('대학 검색에서 결과 없음은 현재 선택을 유지하고 선택한 대학 자료를 연다', async () => {
  const load = setup([row()]);
  load.mockImplementation(async entry => [row({ university: entry.university, recruit_unit: `${entry.university} 학과` })]);
  render(<CollectedResultBrowser />);
  await screen.findByText('가온대 학과');
  fireEvent.click(screen.getByRole('button', { name: '대학 검색' }));
  const dialog = screen.getByRole('dialog', { name: '대학 검색·선택' });
  fireEvent.change(within(dialog).getByLabelText('수집 대학 검색'), { target: { value: '없는대학' } });
  expect(within(dialog).getByText(/검색한 대학이 없어요/)).toBeTruthy();
  expect(screen.getByLabelText('수집 대학')).toHaveProperty('value', '가온대');
  fireEvent.change(within(dialog).getByLabelText('수집 대학 검색'), { target: { value: '누리' } });
  fireEvent.click(within(dialog).getByRole('button', { name: '누리대' }));
  await screen.findByText('누리대 학과');
  expect(screen.queryByRole('dialog')).toBeNull();
});

test('모바일 조건은 적용 전까지 결과를 유지하고 닫으면 초안을 버린다', async () => {
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
  setup([row(), row({ round: '정시', recruit_unit: '수학과', metric: '환산점수', cut_70: '910.00' })]);
  render(<CollectedResultBrowser />);
  await screen.findByText('국어교육과');
  fireEvent.click(screen.getByRole('button', { name: '조건' }));
  let dialog = screen.getByRole('dialog', { name: '입결 조회 조건' });
  fireEvent.change(within(dialog).getByLabelText('모집시기'), { target: { value: '정시' } });
  expect(screen.getByText('국어교육과')).toBeTruthy();
  fireEvent.click(within(dialog).getByRole('button', { name: '닫기' }));
  fireEvent.click(screen.getByRole('button', { name: '조건' }));
  dialog = screen.getByRole('dialog');
  expect(within(dialog).getByLabelText('모집시기')).toHaveProperty('value', '수시');
  fireEvent.change(within(dialog).getByLabelText('모집시기'), { target: { value: '정시' } });
  fireEvent.click(within(dialog).getByRole('button', { name: '1건 결과 보기' }));
  expect(screen.queryByText('국어교육과')).toBeNull();
  expect(screen.getByText('수학과')).toBeTruthy();
  expect(screen.getByText('환산점수')).toBeTruthy();
  expect(screen.getByText('910.00')).toBeTruthy();
  expect(screen.getAllByRole('columnheader')).toHaveLength(3);
  fireEvent.click(screen.getByRole('button', { name: /수학과 원문·상세/ }));
  expect(within(screen.getByRole('dialog')).getByText('12쪽 표3')).toBeTruthy();
});

test('모든 데이터 헤더가 양방향 정렬되고 전체 결과를 정렬한 뒤 첫 페이지부터 표시한다', async () => {
  setup(Array.from({ length: 55 }, (_, i) => row({ recruit_unit: `학과${i}`, cut_70: ((65 - i) / 10).toFixed(3) })).concat(row({ recruit_unit: '미공개학과', cut_70: '' })));
  render(<CollectedResultBrowser />);
  await screen.findByText('6.500');
  const table = screen.getByRole('table');
  const first = () => table.querySelector('tbody tr')!;
  for (const label of ['학년도', '시기', '전형', '모집단위', '모집', '경쟁률', '50% 컷', '70% 컷', '지표']) {
    fireEvent.click(within(table).getByRole('button', { name: `${label} 오름차순 정렬` }));
    expect(within(table).getByRole('button', { name: `${label} 내림차순 정렬` }).closest('th')?.getAttribute('aria-sort')).toBe('ascending');
    fireEvent.click(within(table).getByRole('button', { name: `${label} 내림차순 정렬` }));
    expect(within(table).getByRole('button', { name: `${label} 오름차순 정렬` }).closest('th')?.getAttribute('aria-sort')).toBe('descending');
  }
  fireEvent.click(screen.getByRole('button', { name: '다음' }));
  fireEvent.click(within(table).getByRole('button', { name: '70% 컷 오름차순 정렬' }));
  expect(screen.getByText('1 / 2 페이지')).toBeTruthy();
  expect(first().textContent).toContain('학과54');
  expect(first().textContent).toContain('1.100');
  fireEvent.click(within(table).getByRole('button', { name: '70% 컷 내림차순 정렬' }));
  expect(first().textContent).toContain('6.500');
  fireEvent.click(screen.getByRole('button', { name: '다음' }));
  expect(table.querySelector('tbody tr:last-child')?.textContent).toContain('미공개학과');
  fireEvent.change(screen.getByLabelText('전형·모집단위 검색'), { target: { value: '학과5' } });
  expect(first().textContent).toContain('학과5');
  expect(first().textContent).toContain('6.000');
  fireEvent.click(screen.getByRole('button', { name: '원문 순서로 보기' }));
  expect(table.querySelector('th[aria-sort="ascending"],th[aria-sort="descending"]')).toBeNull();
});

test('모바일에서도 모집단위와 컷 헤더를 눌러 정렬하고 해당 행의 상세를 연다', async () => {
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
  setup([row({ recruit_unit: '나학과', cut_70: '10.000' }), row({ recruit_unit: '가학과', cut_70: '2.400', source_page: '가학과 7쪽' })]);
  render(<CollectedResultBrowser />);
  await screen.findByText('나학과');
  fireEvent.click(screen.getByRole('button', { name: '70% 컷 오름차순 정렬' }));
  const first = screen.getByRole('table').querySelector('tbody tr')!;
  expect(first.textContent).toContain('가학과');
  fireEvent.click(within(first as HTMLElement).getByRole('button', { name: /원문·상세/ }));
  expect(within(screen.getByRole('dialog')).getByText('가학과 7쪽')).toBeTruthy();
});

test.each([false, true])('목록 하트는 선택한 학과만 저장하고 기존 전형 전체 항목을 대체하며 재진입 후 유지한다 (모바일 %s)', async compact => {
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: compact, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
  setup([row(), row({ result_year: '2025' }), row({ recruit_unit: '수학교육과' }), row({ recruit_unit: '국어교육과(야간)' }), row({ program: '일반전형Ⅱ' }), row({ program: '' }), row({ recruit_unit: '' })]);
  await studentDb.setInterest('가온대', '일반전형', true);
  const mount = (path = '/admission-results?view=collected') => render(<MemoryRouter initialEntries={[path]}><AdmissionResults /></MemoryRouter>);
  mount();
  await screen.findAllByText('2.400');
  let hearts = screen.getAllByRole('button', { name: '가온대 일반전형 국어교육과 관심에 담기' });
  expect(hearts).toHaveLength(2);
  await waitFor(() => expect((hearts[0] as HTMLButtonElement).disabled).toBe(false));
  fireEvent.click(hearts[0]);
  await waitFor(() => expect(screen.getAllByRole('button', { name: '가온대 일반전형 국어교육과 관심에서 빼기' })).toHaveLength(2));
  expect(screen.getByRole('button', { name: '가온대 일반전형 수학교육과 관심에 담기' }).getAttribute('aria-pressed')).toBe('false');
  expect(screen.getByRole('button', { name: '가온대 일반전형Ⅱ 국어교육과 관심에 담기' }).getAttribute('aria-pressed')).toBe('false');
  expect(await studentDb.interests.get(interestId('가온대', '일반전형'))).toBeUndefined();
  expect(await studentDb.interests.count()).toBe(1);
  expect(screen.queryByRole('dialog')).toBeNull();
  fireEvent.click(await screen.findByRole('button', { name: '내 비교 1' }));
  await screen.findByRole('heading', { name: '관심 전형 1개' });
  expect(screen.getByRole('link', { name: '국어교육과' })).toBeTruthy();
  expect(screen.queryByText('수학교육과')).toBeNull();
  fireEvent.click(screen.getByRole('link', { name: '수집 입결에서 찾기' }));
  await waitFor(() => expect(screen.getAllByRole('button', { name: '가온대 일반전형 국어교육과 관심에서 빼기' })).toHaveLength(2));
  expect(screen.getByRole('table').querySelectorAll('tbody tr')).toHaveLength(2);
  cleanup(); mount(collectedProgramPath('가온대', '일반전형', '국어교육과'));
  hearts = await screen.findAllByRole('button', { name: '가온대 일반전형 국어교육과 관심에서 빼기' });
  fireEvent.click(hearts[0]);
  await waitFor(() => expect(screen.getAllByRole('button', { name: '가온대 일반전형 국어교육과 관심에 담기' })).toHaveLength(2));
  expect(await studentDb.interests.count()).toBe(0);
  fireEvent.click(screen.getByRole('button', { name: '학과 선택 해제' }));
  expect(screen.getByRole('table').querySelectorAll('tbody tr')).toHaveLength(7);
});

test('관심 링크는 선택한 대학과 전형으로 이동하고 정시 자료도 찾는다', async () => {
  const load = setup([row({ university: '누리대', round: '정시', program: '수능(일반)' }), row({ university: '누리대', program: '다른전형' })]);
  render(<MemoryRouter initialEntries={[collectedProgramPath('누리대', '수능(일반)')]}><AdmissionResults /></MemoryRouter>);
  await screen.findByText('2.400');
  expect(load).toHaveBeenCalledWith(expect.objectContaining({ university: '누리대' }));
  expect(screen.getByLabelText('수집 대학')).toHaveProperty('value', '누리대');
  expect(screen.getByLabelText('전형·모집단위 검색')).toHaveProperty('value', '수능(일반)');
  expect(screen.getByRole('table').querySelectorAll('tbody tr')).toHaveLength(1);
});
