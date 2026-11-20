import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, test, vi } from 'vitest';
import { MockTrend } from '../src/components/MockTrend';
import { mockTrend } from '../src/domain/mockTrend';
import type { CutTable, MockScore } from '../src/domain/mock';

// Synthetic tables stay in tests; product data remains empty.
vi.mock('../src/data/mock-exams', () => ({ mockExams: ['첫 시험', '둘째 시험', '셋째 시험'], cutTables: [
  { id: 'test', source: 'test', review_status: 'verified', exam: '첫 시험', version: 'test', as_of: '2026-11-20', areas: {
    국어: { absolute: false, cuts: [{ grade: 1, min: 90, max: 90 }, { grade: 2, min: 80, max: 85 }] },
  } },
  { id: 'test', source: 'test', review_status: 'verified', exam: '셋째 시험', version: 'test', as_of: '2026-11-20', areas: {
    국어: { absolute: false, cuts: [{ grade: 1, min: 90, max: 90 }, { grade: 2, min: 80, max: 85 }] },
  } },
] }));

afterEach(cleanup);
const score = (exam: string, raw: MockScore['raw'], updated_at = ''): MockScore => ({ exam, raw, updated_at });
const show = (scores: MockScore[]) => render(<MemoryRouter><MockTrend scores={scores} /></MemoryRouter>);

test('orders known exams by catalog, retains unknown exams and zero, ignores empty records', () => {
  const rows = mockTrend([
    score('셋째', { 국어: 80 }, '2020'), score('첫째', { 국어: 0 }, '2030'),
    score('다른 시험', { 국어: 50 }), score('둘째', {}),
  ], [], ['첫째', '둘째', '셋째']);
  expect(rows.map(r => r.exam)).toEqual(['첫째', '셋째', '다른 시험']);
  expect(rows[0].areas[0].raw).toBe(0);
  expect(rows.at(-1)?.order).toBe(-1);
});

test('never derives a grade from a draft table or a different exam', () => {
  const table: CutTable = { id: 'test', source: 'test', review_status: 'draft', exam: '첫 시험', version: 'test', as_of: '', areas: { 국어: { absolute: false, cuts: [{ grade: 1, min: 90, max: 90 }] } } };
  expect(mockTrend([score('첫 시험', { 국어: 95 })], [table], ['첫 시험'])[0].areas[0].grade.status).toBe('pending');
  expect(mockTrend([score('다른 시험', { 국어: 95 })], [{ ...table, review_status: 'verified' }], ['다른 시험'])[0].areas[0].grade.status).toBe('pending');
});

test('empty and cleared records lead to score entry', () => {
  show([score('첫 시험', {})]);
  expect(screen.getByRole('link', { name: '모의고사 성적 입력' }).getAttribute('href')).toBe('/mock-score');
  expect(screen.queryByRole('table')).toBeNull();
});

test('shows raw scores without inventing grades and changes areas', () => {
  show([score('둘째 시험', { 국어: 0, 한국사: 40 })]);
  expect(screen.queryByRole('img')).toBeNull();
  expect(within(screen.getByRole('table')).getByText('0/100점')).toBeTruthy();
  expect(within(screen.getByRole('table')).getByText('등급컷 준비 중')).toBeTruthy();
  fireEvent.change(screen.getByLabelText('추이를 볼 영역'), { target: { value: '한국사' } });
  expect(within(screen.getByRole('table')).getByText('40/50점')).toBeTruthy();
  expect(screen.getByRole('link', { name: '둘째 시험 성적 수정' }).getAttribute('href')).toBe(`/mock-score?exam=${encodeURIComponent('둘째 시험')}`);
});

test('grade gaps do not connect and ranges do not become a midpoint', () => {
  show([score('첫 시험', { 국어: 95 }), score('둘째 시험', { 수학: 80 }), score('셋째 시험', { 국어: 82 })]);
  const chart = screen.getByRole('img');
  expect(chart.querySelectorAll('circle')).toHaveLength(1);
  expect(chart.querySelectorAll('line[stroke-width="2"]')).toHaveLength(0);
  expect(chart.querySelectorAll('line[stroke-width="3"]')).toHaveLength(1);
  expect(within(screen.getByRole('table')).getByText('약 2~3등급')).toBeTruthy();
  expect(within(screen.getByRole('table')).getByText('원점수를 입력해 주세요')).toBeTruthy();
});

test('known adjacent grades connect, unknown exams remain outside the chronological chart', () => {
  show([score('첫 시험', { 국어: 95 }), score('셋째 시험', { 국어: 88 }), score('복원한 시험', { 국어: 70 })]);
  expect(screen.getByRole('img').querySelectorAll('line[stroke-width="2"]')).toHaveLength(1);
  expect(screen.getByText('순서 미확인')).toBeTruthy();
  expect(screen.getByText('셋째 시험 · 원점수 88/100점')).toBeTruthy();
});

test('a newer exam missing the selected area does not reuse an older grade', () => {
  show([score('첫 시험', { 국어: 95 }), score('둘째 시험', { 영어: 85 })]);
  expect(screen.getByText('둘째 시험', { selector: '.score-trend-summary span' })).toBeTruthy();
  expect(screen.getByText('원점수를 입력해 주세요', { selector: '.score-trend-summary strong' })).toBeTruthy();
});
