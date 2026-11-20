import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, test, vi } from 'vitest';
import { CollectedResultBrowser } from '../src/components/CollectedResultBrowser';
import { AdmissionResults } from '../src/screens/AdmissionResults';
import * as loader from '../src/data/collectedResults';
import { RESULT_COLUMNS, type ResultRow } from '../src/domain/resultReview';
import type { CollectedIndex } from '../src/domain/collectedResults';

vi.mock('../src/data/releasedResults', () => ({ useReleasedResults: () => [] }));
const index: CollectedIndex = { format: 'jinhak-navi-collected-index', version: 1, status: 'draft', generated_at: '', source_file: '_all.csv', source_sha256: 'a'.repeat(64), rows: 2, sources: 2,
  universities: ['가온대', '누리대'].map(university => ({ university, file: 'a'.repeat(64) + '.json', sha256: 'a'.repeat(64), bytes: 1, rows: 1, sources: 1, years: ['2026'], rounds: { 수시: 1 } })) };
const row = (change: Partial<ResultRow> = {}): ResultRow => ({ ...Object.fromEntries(RESULT_COLUMNS.map(c => [c, ''])), university: '가온대', result_year: '2026', round: '수시', admission_type: '교과', program: '일반전형', recruit_unit: '국어교육과', metric: '교과등급', cut_70: '2.400', source_url: 'https://example.invalid/result.pdf', source_page: '12쪽 표3', note: 'draft; 원문 대조 필요', ...change }) as ResultRow;
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
function setup(rows: ResultRow[]) {
  vi.spyOn(loader, 'loadCollectedIndex').mockResolvedValue(index);
  return vi.spyOn(loader, 'loadCollectedRows').mockResolvedValue(rows);
}

test('학생 기본 화면에 수집본을 표시하고 같은 전형의 서로 다른 원문과 정밀도를 보존한다', async () => {
  setup([row(), row({ source_url: 'https://example.invalid/other.pdf', metric: '환산점수', cut_70: '910.00' })]);
  render(<MemoryRouter><AdmissionResults /></MemoryRouter>);
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
  fireEvent.click(screen.getByRole('button', { name: '검수 완료 입결' }));
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
