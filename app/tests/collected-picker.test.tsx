import 'fake-indexeddb/auto';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { CollectedResultPicker } from '../src/components/CollectedResultPicker';
import { AdminReview } from '../src/screens/AdminReview';
import * as loader from '../src/data/collectedResults';
import { RESULT_COLUMNS, type ResultRow } from '../src/domain/resultReview';
import type { CollectedIndex } from '../src/domain/collectedResults';

const index: CollectedIndex = { format: 'jinhak-navi-collected-index', version: 1, status: 'draft', generated_at: '', source_file: '_all.csv', source_sha256: 'a'.repeat(64), rows: 2, sources: 2,
  universities: ['가온대', '누리대'].map(university => ({ university, file: 'a'.repeat(64) + '.json', sha256: 'a'.repeat(64), bytes: 1, rows: 1, sources: 1, years: ['2026'], rounds: { 수시: 1 } })) };
const row = (university: string) => ({ ...Object.fromEntries(RESULT_COLUMNS.map(c => [c, ''])), university, result_year: '2026', round: '수시', admission_type: '교과', program: '일반전형', recruit_unit: '국어교육과', metric: '교과등급', cut_70: '2.400', source_url: 'https://example.invalid/result.pdf' }) as ResultRow;
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

test('대학을 골라 불러오고 실패 시 기존 자료를 바꾸지 않으며 재시도한다', async () => {
  vi.spyOn(loader, 'loadCollectedIndex').mockResolvedValue(index);
  const load = vi.spyOn(loader, 'loadCollectedRows').mockRejectedValueOnce(new Error('연결 실패')).mockResolvedValueOnce([row('누리대')]);
  const onLoad = vi.fn();
  render(<CollectedResultPicker busy={false} onLoad={onLoad} />);
  await screen.findByText(/대학·캠퍼스명 2개/);
  expect(load).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText('수집 대학'), { target: { value: '누리대' } });
  fireEvent.click(screen.getByRole('button', { name: '수집본 불러오기' }));
  await screen.findByText('연결 실패');
  expect(onLoad).not.toHaveBeenCalled();
  expect(screen.getByLabelText('수집 대학')).toHaveProperty('value', '누리대');
  fireEvent.click(screen.getByRole('button', { name: '수집본 불러오기' }));
  await waitFor(() => expect(onLoad).toHaveBeenCalledWith([row('누리대')], '수집본 · 누리대 · 2026학년도'));
  expect(load).toHaveBeenLastCalledWith(index.universities[1]);
});

test('목록 조회 실패를 표시하고 새로고침으로 복구한다', async () => {
  vi.spyOn(loader, 'loadCollectedIndex').mockRejectedValueOnce(new Error('목록 연결 실패')).mockResolvedValueOnce(index);
  render(<CollectedResultPicker busy={false} onLoad={vi.fn()} />);
  await screen.findByText('목록 연결 실패');
  fireEvent.click(screen.getByRole('button', { name: '수집 목록 새로고침' }));
  await screen.findByText(/대학·캠퍼스명 2개/);
  expect(screen.queryByRole('alert')).toBeNull();
});

test('수집본은 검수 대기로 열리고 잘못된 원문 링크는 클릭할 수 없다', async () => {
  vi.spyOn(loader, 'loadCollectedIndex').mockResolvedValue(index);
  vi.spyOn(loader, 'loadCollectedRows').mockResolvedValue([{ ...row('가온대'), source_url: 'javascript:alert(1)' }]);
  render(<AdminReview />);
  await screen.findByText(/대학·캠퍼스명 2개/);
  fireEvent.click(screen.getByRole('button', { name: '수집본 불러오기' }));
  await screen.findByText('1행, 원문 1건을 불러왔어요.');
  expect(screen.getByText('이용 조건 미확인')).toBeTruthy();
  expect(screen.getByText('링크 오류')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '가온대' }));
  await screen.findByRole('dialog');
  expect(screen.queryByRole('link', { name: '원문 보기 ↗' })).toBeNull();
  expect(screen.getByRole('button', { name: '승인' })).toHaveProperty('disabled', true);
});
