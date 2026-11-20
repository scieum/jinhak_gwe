import { convertSubjects } from '../engine/conversion';
import { baseConversionRule, enrollmentRule, distributionRule, placementCandidates } from '../data/conversion-rules';
import { admissionYear, confidenceRule } from '../data/catalog';
import type { ComparisonBasis } from './comparison';
import { validateGrade, type GradeRecord } from './student';
import { SUBJECT_COMBOS, convertFiveToNine, type SubjectCombo } from '../engine/fiveToNine';
import type { ConversionConfig, GradeSet } from '../engine/fiveToNineTypes';
import fiveToNineConfig from '../data/conversion-config.json';

export const combinations: Record<string, readonly string[] | null> = {
  '전 교과': null, '국수영사과': ['국어', '수학', '영어', '사회', '과학'],
  '국수영사': ['국어', '수학', '영어', '사회'], '국수영과': ['국어', '수학', '영어', '과학'],
};
// Configuration fingerprint changes when any conversion table/rule changes; it is not a security hash.
export function conversionBasisVersion() {
  const content = JSON.stringify({ policy: 'range-v1', baseConversionRule, enrollmentRule, distributionRule, placementCandidates });
  let hash = 2166136261;
  for (let i = 0; i < content.length; i++) hash = Math.imul(hash ^ content.charCodeAt(i), 16777619) >>> 0;
  return `range-v1-${hash.toString(16).padStart(8, '0')}`;
}
export function currentComparisonBasis(grades: readonly GradeRecord[], groups: readonly string[], verified: boolean): ComparisonBasis {
  const valid = grades.filter(g => !validateGrade(g).length && groups.includes(g.subject_group));
  return { year: admissionYear, grade_system: 9, metric: 'converted_grade', statistic: 'individual', max_score: 9,
    subject_scope: groups, semesters: [...new Set(valid.map(g => g.semester))].sort(), method_id: 'five-to-nine-range', method_version: conversionBasisVersion(),
    source: '입력한 성적과 환산 근거', review_status: verified ? 'verified' : 'draft' };
}
export function conversionFor(grades: readonly GradeRecord[], combination: string) {
  const valid = grades.filter(g => !validateGrade(g).length);
  const groups = combinations[combination] ?? [...new Set(valid.map(g => g.subject_group))];
  const result = convertSubjects(valid, { base: baseConversionRule, enrollment: enrollmentRule, distribution: distributionRule,
    confidence: confidenceRule, tables: placementCandidates,
    placement: { basis_semesters: new Set(valid.map(g => g.semester)).size, subject_scope: groups } });
  return { ...result, trace: [...result.trace, ...grades.filter(g => validateGrade(g).length).map(g => ({
    rule: 'R-IN', detail: `${g.name || '미입력 과목'}: 입력 확인 필요로 제외`, subject_id: g.id,
  }))] };
}

/**
 * 5 to 9 내 성적 분석(PRD 9장 R-CONV). 2026-11-20 사용자 결정: PRD 확정 공식 R-CONV-003/004는 검수된 규칙으로 계산해요.
 * 검수 전인 R-CONV-010·011, 허락 전 실측표(B)는 엔진이 계속 막아요(NEVER-1).
 */
export function fiveToNineFor(grades: readonly GradeRecord[], combination: string) {
  const set: GradeSet = {};
  for (const g of grades.filter(x => !validateGrade(x).length)) {
    const d = g.achievement_distribution;
    (set[g.semester] ??= []).push({ name: g.name, group: g.subject_group, type: g.type, credits: g.credits, grade5: g.rank_grade, rawScore: g.raw_score, mean: g.subject_mean,
      achievement: g.achievement === 'F' ? undefined : g.achievement, enrolled: g.enrolled_count, isJoint: g.is_joint, fixedCutoff: g.division === 'fixed' ? true : undefined,
      distribution: d ? { A: d[0], B: d[1], C: d[2], D: d[3], E: d[4] } : undefined });
  }
  return convertFiveToNine(set, (combination in SUBJECT_COMBOS ? combination : '전 교과') as SubjectCombo, fiveToNineConfig as ConversionConfig);
}
