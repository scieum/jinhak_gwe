import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import type { ProgramData } from '../src/data/catalog';
import type { ComparisonBasis } from '../src/domain/comparison';
import { canShowPosition, placementEntries, placementExtent } from '../src/domain/placement';
import { PlacementExplorer } from '../src/components/PlacementExplorer';

// Synthetic data is confined to tests. No test university is registered in the app catalog.
const basis: ComparisonBasis = { year: 2027, grade_system: 9, metric: 'rank_grade', statistic: 'p70', max_score: 9,
  subject_scope: ['국어', '수학'], semesters: ['1-1'], method_id: 'test-method', method_version: '1',
  source: 'https://example.invalid/test-only', review_status: 'verified' };
const program = (patch: Partial<ProgramData> = {}): ProgramData => ({ id: 'fixture-one', admission_year: 2028,
  university: '테스트대', program: '가상전형', department: '검증학과', source: basis.source, license_status: 'allowed',
  rule: null, cut: { id: 'test-cut', source: basis.source, review_status: 'verified', cut70: 2.15 },
  cut_basis: basis, cut_subject_scope: basis.subject_scope, cut_grade_system: 9, minimum_required: false,
  field: '공학', region: '테스트지역', admission_type: '교과', ...patch });
const entry = (patch: Partial<ProgramData> = {}) => placementEntries([program(patch)], 2027, 'rank_grade');
afterEach(cleanup);

test.each<Partial<ProgramData>>([
  { license_status: 'denied' }, { license_status: 'unknown' }, { cut: null },
  { cut: { ...program().cut!, review_status: 'draft' } },
  { cut: { ...program().cut!, cut70: NaN } }, { cut: { ...program().cut!, cut70: 9.1 } },
  { cut: { ...program().cut!, source: 'javascript:alert(1)' } },
  { cut_basis: undefined }, { cut_basis: { ...basis, review_status: 'draft' } },
  { cut_basis: { ...basis, statistic: 'p50' } }, { cut_basis: { ...basis, grade_system: 5 } },
  { cut_basis: { ...basis, semesters: [] } }, { cut_basis: { ...basis, year: 2026 } },
  { cut_basis: { ...basis, metric: 'converted_grade' } }, { cut_grade_system: 5 },
  { region: undefined }, { field: undefined }, { admission_type: undefined },
  { cut_subject_scope: [] }, { cut_subject_scope: ['영어'] },
])('unreleased, incomplete or incompatible data stays out of every view: %j', patch => {
  expect(entry(patch)).toEqual([]);
});
test('released numeric values remain exact, and different historical bases never get a student overlay', () => {
  const rows = entry(); expect(rows).toHaveLength(1); expect(rows[0].value).toBe(2.15);
  const input = { ...basis, statistic: 'individual' as const };
  expect(canShowPosition(input, rows, { min: 2, max: 2.3 })).toBe(true);
  expect(canShowPosition({ ...input, year: 2028 }, rows, { min: 2, max: 2.3 })).toBe(false);
  expect(canShowPosition({ ...input, metric: 'converted_grade' }, rows, { min: 2, max: 2.3 })).toBe(false);
  expect(canShowPosition(input, rows, { min: 2.3, max: 2 })).toBe(false);
  expect(canShowPosition(input, [], { min: 2, max: 2.3 })).toBe(false);
  expect(placementExtent(entry({ cut: { ...program().cut!, cut70: 9 } }))).toEqual({ min: 8.5, max: 9 });
});
test('table, board and dots preserve filters and expose the same released source values', () => {
  render(<PlacementExplorer onClose={() => {}} combination="전 교과" average={1.5} catalog={[
    program(), program({ id: 'two', department: '두번째학과', admission_type: '종합', region: '다른지역', field: '사회' }),
  ]} />);
  expect(screen.getByRole('button', { name: '배치표' }).getAttribute('aria-pressed')).toBe('true');
  expect(screen.getByRole('link', { name: /검증학과.*2.15등급/ }).getAttribute('href')).toBe(basis.source);
  fireEvent.change(screen.getByLabelText('지역'), { target: { value: '테스트지역' } });
  fireEvent.click(screen.getByRole('button', { name: '표' }));
  expect(within(screen.getByRole('table')).getByText('2.15')).toBeTruthy();
  expect(screen.queryByText('두번째학과')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: '대학별 점' }));
  expect(screen.getByLabelText(/검증학과.*2.15등급/)).toBeTruthy();
  fireEvent.click(within(screen.getByRole('group', { name: '입결 전형 유형' })).getByRole('button', { name: '논술' }));
  expect(screen.getByRole('heading', { name: '고른 조건에 맞는 학과가 없어요' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '필터 초기화' }));
  expect(screen.getByText('두번째학과 · 종합')).toBeTruthy();
});
test('empty operational catalog stays empty in all views, and Escape closes the dialog', () => {
  const onClose = vi.fn();
  render(<PlacementExplorer onClose={onClose} combination="전 교과" average={null} catalog={[]} />);
  for (const name of ['표', '배치표', '대학별 점']) {
    fireEvent.click(screen.getByRole('button', { name }));
    expect(screen.getByRole('heading', { name: '공식 입결 자료를 준비하고 있어요' })).toBeTruthy();
    expect(screen.queryByRole('table')).toBeNull();
  }
  fireEvent.keyDown(document, { key: 'Escape' }); expect(onClose).toHaveBeenCalledTimes(1);
});
