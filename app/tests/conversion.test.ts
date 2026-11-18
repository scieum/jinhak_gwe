import { describe, expect, test } from 'vitest';
import { baseConversionRule, distributionRule, enrollmentRule, judgmentRule, placementCandidates } from '../src/data/conversion-rules';
import { convertAverage, convertSubjects, distributionPercentile, enrollmentInterval, selectPlacement, type ConversionOptions } from '../src/engine/conversion';
import { judgeRange } from '../src/engine/judgment';
import type { Calculation, ConfidenceRule, PlacementTable, Provenance, SubjectGrade } from '../src/engine/types';

// Synthetic review states exist only in tests; they do not authorize real-world rules or data.
const verified = <T extends Provenance>(rule: T): T => ({ ...rule, review_status: 'verified' });
function value<T>(result: Calculation<T>): T {
  expect(result.status).toBe('ready');
  if (result.status !== 'ready') throw new Error(result.reason);
  return result.value;
}
const base = verified(baseConversionRule), enrollment = verified(enrollmentRule), distribution = verified(distributionRule);
const confidence: ConfidenceRule = {
  id: 'synthetic-confidence', source: 'test-only policy', review_status: 'verified', small_class_max: 13,
  high: { min_subjects: 2, max_small_ratio: 0.2, max_excluded_ratio: 0.2, max_spread: 1 },
  medium: { min_subjects: 1, max_small_ratio: 0.5, max_excluded_ratio: 0.5, max_spread: 2 },
};
const subject = (patch: Partial<SubjectGrade> = {}): SubjectGrade => ({
  id: 'math', subject_group: '수학', credits: 3, rank_grade: 2, ...patch,
});
const table = (patch: Partial<PlacementTable> = {}): PlacementTable => ({
  id: 'synthetic-table', source: 'test-only table', review_status: 'verified', license_status: 'allowed',
  basis_semesters: 1, subject_scope: ['수학'], region: '테스트', n: 100, year: 2025,
  points: [{ g5: 1, g9: 1.5 }, { g5: 3, g9: 5 }, { g5: 5, g9: 8.5 }], ...patch,
});
const query = { basis_semesters: 1, subject_scope: ['수학'] };
const options = (patch: Partial<ConversionOptions> = {}): ConversionOptions => ({
  base, enrollment, distribution, confidence, placement: query, tables: [], ...patch,
});

describe('R-CONV-001..004', () => {
  test.each([[1, 1.54545454545], [1.5, 2.63157894737], [2, 3.34482758621], [2.5, 4.24324324324], [3, 5], [4, 6.65517241379], [5, 8.45454545455]])('average %s → %s', (input, output) => {
    expect(value(convertAverage(input, base))).toBeCloseTo(output, 9);
  });
  test.each([NaN, Infinity, 0, 5.1])('reject invalid average %s', input => {
    expect(convertAverage(input, base).status).toBe('invalid');
  });
  test('unreviewed rules expose no numeric result', () => {
    expect(convertAverage(2, baseConversionRule)).toMatchObject({ status: 'not_ready' });
    expect(convertSubjects([subject()], options({ base: baseConversionRule })).status).toBe('not_ready');
  });
  test('invalid anchors fail instead of propagating NaN', () => {
    expect(convertAverage(2, { ...base, five_midpoints: [5, 22, 22, 78, 95] }).status).toBe('invalid');
  });
  test('A-1 and A-2 use credits, not subject counts; trace includes each course', () => {
    const result = convertSubjects([subject({ id: 'a', credits: 3, rank_grade: 1 }), subject({ id: 'b', credits: 1 })], options());
    const r = value(result);
    expect(r.a1).toBeCloseTo(value(convertAverage(1.25, base)), 12);
    expect(value(r.a2)).toBeCloseTo((3 * value(convertAverage(1, base)) + value(convertAverage(2, base))) / 4, 12);
    expect(r.min).toBe(Math.min(r.a1, value(r.a2)));
    expect(r.max).toBe(Math.max(r.a1, value(r.a2)));
    expect(result.trace.some(t => t.subject_id === 'a' && t.detail === '학점 가중치' && t.value === 0.75)).toBe(true);
  });
  test('exclude small classes, unranked courses and non-selected subject groups', () => {
    const r = value(convertSubjects([subject(), subject({ id: 'small', enrolled_count: 5, rank_grade: 5 }),
      subject({ id: 'unranked', rank_grade: null }), subject({ id: 'outside', subject_group: '영어', rank_grade: 5 })], options()));
    expect(r.a1).toBeCloseTo(value(convertAverage(2, base)), 12);
    expect(r.included_subjects).toBe(1);
    expect(r.excluded_subjects).toBe(2);
    expect(value(r.confidence)).toBe('낮음');
  });
  test('empty cohort does not produce zero or divide by zero', () => {
    expect(convertSubjects([], options()).status).toBe('not_ready');
    expect(convertSubjects([subject({ rank_grade: null })], options()).status).toBe('not_ready');
  });
  test.each([{ credits: 0 }, { credits: NaN }, { rank_grade: 1.5 }, { enrolled_count: -1 }, { enrolled_count: 2.5 }])('reject invalid subject %o', patch => {
    expect(convertSubjects([subject(patch)], options()).status).toBe('invalid');
  });
  test('duplicate subject IDs are invalid', () => {
    expect(convertSubjects([subject(), subject()], options()).status).toBe('invalid');
  });
});

describe('R-CONV-010 enrollment candidate', () => {
  test.each([
    [69, 25, 6, 2.2916, 2.0918],
    [76, 19, 5, 2.1663, 1.9678],
    [65, 30, 5, 2.3632, 2.1657],
    [82, 14, 4, 2.0589, 1.8617],
  ])('screen specification credit mix %s/%s/%s', (first, second, small, a1, a2) => {
    const r = value(convertSubjects([
      subject({ id: 'first', credits: first, rank_grade: 1, enrolled_count: 100 }),
      subject({ id: 'second', credits: second, enrolled_count: 100 }),
      subject({ id: 'small', credits: small, enrolled_count: 13 }),
    ], options()));
    expect(r.a1).toBeCloseTo(a1, 4);
    expect(value(r.a2)).toBeCloseTo(a2, 4);
  });
  test('13 students, grade 2: cumulative headcounts 1..4, midpoint 19.230769%', () => {
    const interval = value(enrollmentInterval(2, 13, enrollment));
    expect(interval[0]).toBeCloseTo(100 / 13);
    expect(interval[1]).toBeCloseTo(400 / 13);
    const r = value(convertSubjects([subject({ enrolled_count: 13 })], options()));
    expect(value(r.a2)).toBeCloseTo(3.153846153846, 10);
  });
  test('100 students matches nominal grade-2 midpoint', () => {
    const r = value(convertSubjects([subject({ enrolled_count: 100 })], options()));
    expect(value(r.a2)).toBeCloseTo(r.a1, 12);
  });
  test('5-person exclusion and empty rounded intervals stay unavailable', () => {
    expect(enrollmentInterval(1, 5, enrollment).status).toBe('not_ready');
    expect(enrollmentInterval(3, 6, { ...enrollment, cumulative_percentages: [0, 10, 20, 21, 90, 100] }).status).toBe('not_ready');
  });
  test('unreviewed correction does not silently substitute nominal A-2', () => {
    const r = value(convertSubjects([subject({ enrolled_count: 13 })], options({ enrollment: enrollmentRule })));
    expect(r.a2.status).toBe('not_ready');
    expect(value(r.confidence)).toBe('낮음');
  });
});

describe('R-CONV-011 fixed-boundary distribution', () => {
  const input = subject({ division: 'fixed', raw_score: 85, achievement_distribution: [15, 25, 30, 20, 10] });
  test('PRD example: 85 between A=15% and A+B=40% gives 27.5%', () => {
    expect(value(distributionPercentile(input, [10, 34], distribution))).toBeCloseTo(27.5, 12);
  });
  test.each([[100, 10], [90, 15], [80, 34], [0, 34]])('score %s clips to %s in the grade-2 interval', (score, expected) => {
    expect(value(distributionPercentile({ ...input, raw_score: score }, [10, 34], distribution))).toBeCloseTo(expected);
  });
  test.each(['estimated', 'unknown'] as const)('does not apply to %s division', division => {
    expect(distributionPercentile({ ...input, division }, [10, 34], distribution).status).toBe('not_ready');
  });
  test('sum tolerance, negative entries, nonfinite and out-of-range scores', () => {
    expect(distributionPercentile({ ...input, achievement_distribution: [15, 25, 30, 20, 9.9] }, [10, 34], distribution).status).toBe('ready');
    for (const d of [[15, 25, 30, 20, 9.8], [15, 25, 30, 31, -1], [NaN, 25, 30, 20, 10]]) {
      expect(distributionPercentile({ ...input, achievement_distribution: d as [number, number, number, number, number] }, [10, 34], distribution).status).toBe('invalid');
    }
    expect(distributionPercentile({ ...input, raw_score: 101 }, [10, 34], distribution).status).toBe('invalid');
  });
  test('requires verification and complete same-cohort inputs', () => {
    expect(distributionPercentile(input, [10, 34], distributionRule).status).toBe('not_ready');
    const r = value(convertSubjects([input, subject({ id: 'missing' })], options()));
    expect(r.a3.status).toBe('not_ready');
  });
  test('A-3 participates in range and records clipping', () => {
    const r = value(convertSubjects([input], options()));
    expect(value(r.a3)).toBeCloseTo(3 + (27.5 - 17) / 14.5, 12);
    expect(r.min).toBeLessThanOrEqual(value(r.a3));
    expect(r.max).toBeGreaterThanOrEqual(value(r.a3));
    expect(r.a3.trace.some(t => t.value === 27.5 && t.subject_id === input.id)).toBe(true);
  });
});

describe('R-CONV-006/009 placement selection', () => {
  test('exact knots and linear interpolation; never extrapolate', () => {
    expect(value(selectPlacement(3, query, [table()])).grade).toBe(5);
    expect(value(selectPlacement(2, query, [table()])).grade).toBe(3.25);
    expect(selectPlacement(4, query, [table({ points: [{ g5: 1, g9: 2 }, { g5: 2, g9: 3 }] })]).status).toBe('not_ready');
  });
  test.each([{ review_status: 'draft' }, { license_status: 'unknown' }, { license_status: 'denied' }, { n: 0 }, { source: '' }, { subject_scope: ['영어'] } ] as const)('exclude unsuitable table %o', patch => {
    expect(selectPlacement(2, query, [table(patch)]).status).toBe('not_ready');
  });
  test('exact semester wins; nearest fallback lowers confidence one level', () => {
    const old = table({ id: 'same', year: 2024 }), newer = table({ id: 'near', basis_semesters: 2, year: 2026 });
    expect(value(selectPlacement(2, query, [newer, old])).table_id).toBe('same');
    const subjects = [subject({ id: 'a' }), subject({ id: 'b' })];
    expect(value(value(convertSubjects(subjects, options({ tables: [old] }))).confidence)).toBe('높음');
    const r = value(convertSubjects(subjects, options({ tables: [newer] })));
    expect(value(r.b).semester_mismatch).toBe(true);
    expect(value(r.confidence)).toBe('보통');
  });
  test('malformed, non-monotone and duplicate table knots are excluded', () => {
    for (const points of [[{ g5: 1, g9: 3 }, { g5: 2, g9: 2 }], [{ g5: 1, g9: 2 }, { g5: 1, g9: 3 }]]) {
      expect(selectPlacement(1, query, [table({ points })]).status).toBe('not_ready');
    }
  });
  test('registered real-world partial transcription is disabled', () => {
    const candidate = placementCandidates[0];
    expect(candidate.review_status).toBe('draft');
    expect(candidate.license_status).toBe('unknown');
    expect(selectPlacement(1.35, { basis_semesters: 1, subject_scope: candidate.subject_scope }, placementCandidates).status).toBe('not_ready');
  });
  test('unreviewed confidence thresholds never produce a label', () => {
    const r = value(convertSubjects([subject()], options({ confidence: { ...confidence, review_status: 'draft' } })));
    expect(r.confidence.status).toBe('not_ready');
  });
});

describe('R-JDG-001/002/006', () => {
  const cut = { id: 'fixture', source: 'test-only cut', review_status: 'verified' as const, cut70: 2 };
  const rule = verified(judgmentRule);
  test.each([[1.7, '안정'], [1.70001, '적정'], [2.1, '적정'], [2.10001, '소신'], [2.4, '소신'], [2.40001, '위험']])('boundary %s → %s', (grade, label) => {
    expect(value(judgeRange({ min: grade as number, max: grade as number }, cut, rule)).label).toBe(label);
  });
  test('uses unfavorable endpoint and flags the favorable boundary', () => {
    expect(value(judgeRange({ min: 1.5, max: 2.3 }, cut, rule))).toMatchObject({ label: '소신', favorable_label: '안정', boundary: true });
  });
  test('missing/unreviewed cut or rule does not produce judgment', () => {
    expect(judgeRange({ min: 2, max: 3 }, null, rule).status).toBe('not_ready');
    expect(judgeRange({ min: 2, max: 3 }, { ...cut, review_status: 'draft' }, rule).status).toBe('not_ready');
    expect(judgeRange({ min: 2, max: 3 }, cut, judgmentRule).status).toBe('not_ready');
  });
  test('reversed range and invalid thresholds rejected', () => {
    expect(judgeRange({ min: 3, max: 2 }, cut, rule).status).toBe('invalid');
    expect(judgeRange({ min: 2, max: 3 }, cut, { ...rule, thresholds: [0.4, 0.1, -0.3] }).status).toBe('invalid');
  });
});
