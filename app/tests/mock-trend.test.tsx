import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { ScoreTrendContent, mockRows } from '../src/components/ScoreTrendContent';
import { mockTrend } from '../src/domain/mockTrend';
import type { CutTable, MockScore } from '../src/domain/mock';

// Synthetic tables stay in tests; product data remains empty.
vi.mock('../src/data/mock-exams', () => {
  const cutTables = ['첫 시험', '셋째 시험'].map(exam => ({
    id: 'test', source: 'test', review_status: 'verified', exam, version: 'test', as_of: '2026-11-20', areas: {
      국어: { absolute: false, cuts: [{ grade: 1, min: 90, max: 90 }, { grade: 2, min: 80, max: 85 }] },
    },
  }));
  return { mockExams: ['첫 시험', '둘째 시험', '셋째 시험'], cutTables, cutTableFor: (exam: string) => cutTables.find(t => t.exam === exam) };
});

beforeEach(() => localStorage.clear());
afterEach(cleanup);
const score = (exam: string, raw: MockScore['raw'], updated_at = ''): MockScore => ({ exam, raw, updated_at });
const show = (scores: MockScore[]) => render(<MemoryRouter><ScoreTrendContent data={{ grades: [], attendance: [], mocks: scores }} /></MemoryRouter>);
const korean = () => fireEvent.click(within(screen.getByRole('group', { name: '모의고사 영역' })).getByRole('button', { name: '국어' }));

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

test('expanded raw scores preserve zero and legacy areas without inventing grades', () => {
  show([score('둘째 시험', { 국어: 0, 한국사: 40, 통합사회: 38, 통합과학: 42 })]);
  expect(screen.queryByRole('img')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: '둘째 시험 원점수 펼치기' }));
  const table = screen.getByRole('table', { name: '둘째 시험 원점수' });
  for (const text of ['0/100', '40/50', '38/50', '42/50']) expect(within(table).getByText(text)).toBeTruthy();
  expect(within(table).getAllByText('준비 중')).toHaveLength(4);
  expect(screen.getByRole('link', { name: '둘째 시험 성적 수정 ›' }).getAttribute('href')).toBe(`/mock-score?exam=${encodeURIComponent('둘째 시험')}`);
});

test('grade gaps do not connect and ranges do not become a midpoint', () => {
  show([score('첫 시험', { 국어: 95 }), score('둘째 시험', { 수학: 80 }), score('셋째 시험', { 국어: 82 })]);
  korean();
  const chart = screen.getByRole('img', { name: /^모의고사 국어/ });
  expect(chart.querySelectorAll('circle')).toHaveLength(1);
  expect(chart.querySelector('.trd-line--on')?.getAttribute('d')).not.toContain('L');
  expect(screen.getByRole('table').textContent).toContain('2~3');
  expect(mockRows([score('셋째 시험', { 국어: 82 })])[0].cells.국어.value).toBeNull();
});

test('known adjacent grades connect, unknown exams remain outside the chronological chart', () => {
  show([score('첫 시험', { 국어: 95 }), score('셋째 시험', { 국어: 88 }), score('복원한 시험', { 국어: 70 })]);
  korean();
  const chart = screen.getByRole('img', { name: /^모의고사 국어/ });
  expect(chart.querySelector('.trd-line--on')?.getAttribute('d')).toContain('L');
  expect(chart.getAttribute('aria-label')).not.toContain('복원한 시험');
  expect(screen.getByRole('link', { name: '복원한 시험 성적 수정' }).textContent).toBe('순서 미확인');
});

test('a newer exam missing the selected area does not label an older grade as current', () => {
  show([score('첫 시험', { 국어: 95 }), score('둘째 시험', { 영어: 85 })]);
  korean();
  const chart = screen.getByRole('img', { name: /^모의고사 국어/ });
  expect(chart.getAttribute('aria-label')).toContain('둘째 시험 표시할 등급 없음');
  expect(chart.querySelector('.trd-tick--value')).toBeNull();
});
