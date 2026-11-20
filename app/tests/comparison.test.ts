import { expect, test } from 'vitest';
import { compareBasis, type ComparisonBasis } from '../src/domain/comparison';
const input: ComparisonBasis = { year: 2028, grade_system: 9, metric: 'converted_grade', statistic: 'individual', max_score: 9,
  subject_scope: ['국어', '수학'], semesters: ['1-1', '1-2'], method_id: 'test-only', method_version: '1', source: 'synthetic', review_status: 'verified' };
const cut = (): ComparisonBasis => ({ ...input, statistic: 'p70' });
test('동일 검수 기준만 통과, 교과·학기 순서는 무관', () => {
  expect(compareBasis(input, { ...cut(), subject_scope: ['수학', '국어'], semesters: ['1-2', '1-1'] }).comparable).toBe(true);
});
test.each<Partial<ComparisonBasis>>([
  { year: 2027 }, { grade_system: 5, max_score: 5 }, { metric: 'rank_grade' }, { metric: 'university_score', grade_system: null, max_score: 100 },
  { statistic: 'p50' }, { statistic: 'mean' }, { subject_scope: ['국어'] }, { semesters: ['1-1'] },
  { method_id: 'other' }, { method_version: '2' }, { review_status: 'draft' }, { source: '' }, { semesters: [] }, { subject_scope: ['국어', '국어'] },
])('비교 조건 차이·부족이면 차단: %j', patch => {
  const result = compareBasis(input, { ...cut(), ...patch }); expect(result.comparable).toBe(false); expect(result.reasons.length).toBeGreaterThan(0);
});
test('자료가 없거나 현재 기준이 검수 전이면 차단', () => {
  expect(compareBasis(input, undefined).comparable).toBe(false);
  expect(compareBasis({ ...input, review_status: 'draft' }, cut()).comparable).toBe(false);
});
