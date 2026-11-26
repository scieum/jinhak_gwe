import { convertSubjects } from '../engine/conversion';
import { baseConversionRule, enrollmentRule, distributionRule, placementCandidates } from '../data/conversion-rules';
import { admissionYear, confidenceRule, programs } from '../data/catalog';
import { judgeRange } from '../engine/judgment';
import { compareBasis, type ComparisonBasis } from './comparison';
import { validateGrade, type GradeRecord } from './student';
import { SUBJECT_COMBOS, floor1, ceil1, type SubjectCombo, type FiveToNineResult } from '../engine/fiveToNine';
import { formatScenarioRange, type ScenarioResult } from '../engine/scenarioReference';
import fiveToNineConfig from '../data/conversion-config.json';
import { activeRules } from '../data/sample/rules';
import { referenceConversion, referenceModelRelease } from './referenceConversion';

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
  const rules = activeRules();
  const result = convertSubjects(valid, { base: rules.base, enrollment: rules.enrollment, distribution: rules.distribution,
    confidence: confidenceRule, tables: placementCandidates,
    placement: { basis_semesters: new Set(valid.map(g => g.semester)).size, subject_scope: groups } });
  return { ...result, trace: [...result.trace, ...grades.filter(g => validateGrade(g).length).map(g => ({
    rule: 'R-IN', detail: `${g.name || '미입력 과목'}: 입력 확인 필요로 제외`, subject_id: g.id,
  }))] };
}

export interface AppReferenceConversion extends FiveToNineResult {
  numericModel: ScenarioResult | null;
  modelVersion: string;
  basisNotes: string[];
}

/** User-authorized reference model. Input weighting and exclusions remain explicit. */
export function fiveToNineFor(grades: readonly GradeRecord[], combination: string): AppReferenceConversion {
  const combo = (combination in SUBJECT_COMBOS ? combination : '전 교과') as SubjectCombo;
  const groups: readonly string[] | null = SUBJECT_COMBOS[combo];
  const eligible = grades.filter(g => !validateGrade(g).length
    && ['공통', '일반선택', '진로선택', '융합선택'].includes(g.type)
    && (!groups || groups.includes(g.subject_group)));
  const ranked = eligible.filter(g => g.rank_grade != null && !(g.enrolled_count != null && g.enrolled_count <= 5));
  const semesters = new Set(eligible.map(g => g.semester)).size;
  const totalCredits = ranked.reduce((sum, g) => sum + g.credits, 0);
  const g5 = totalCredits ? ranked.reduce((sum, g) => sum + g.rank_grade! * g.credits, 0) / totalCredits : null;
  const numericModel = g5 === null ? null : referenceConversion(g5);
  const range = numericModel?.grade9Range ?? null;
  const excludedCount = eligible.length - ranked.length;
  const smallCount = eligible.filter(g => g.rank_grade == null || (g.enrolled_count != null
    && g.enrolled_count <= fiveToNineConfig.confidence.smallClassMax)).length;
  const basisNotes = ['선택한 교과의 학점 가중평균을 사용했어요. 자료별 평균 정의와 모집단 차이가 남아 있어요.',
    `입력은 ${semesters}개 학기예요. 예상 대응표와 반영 학기·교과 정의가 일치하는지는 별도 확인이 필요해요.`,
    '낙관·보수는 서로 다른 가정이에요. 하나의 대표값으로 평균내지 않아요.',
    ...(numericModel && numericModel.status !== 'source_scenarios' ? ['자료 지원 구간이 부족해 전체 참고 범위를 산출하지 않아요.'] : [])];
  const legacy = { status: 'unavailable' as const, reason: '자체 수치 모델 v0.5 시나리오 환산으로 통합했어요' };
  return { combo, g5, semesters, numericModel, modelVersion: referenceModelRelease.version, basisNotes,
    a1: legacy, a2: legacy, a3: legacy, b: legacy, bTable: null,
    min: range?.[0] ?? null, max: range?.[1] ?? null, representative: numericModel?.estimate9 ?? null,
    display: range ? { min: floor1(range[0]), max: ceil1(range[1]) } : null,
    spread: range ? range[1] - range[0] : null, confidence: '낮음',
    stats: { rankedCount: ranked.length, excludedCount, smallCount, smallRatio: eligible.length ? smallCount / eligible.length : 0 },
    candidates: { 'R-CONV-012': legacy, 'R-CONV-013': legacy },
    trace: [
      { id: 'model', label: '자체 수치 모델', value: `v${referenceModelRelease.version} · 참고 추정` },
      { id: 'g5', label: '학점 가중 5등급 평균', value: g5 ?? '미산출' },
      { id: 'scope', label: '반영 교과 · 학기', value: `${combo} · ${semesters}개 학기` },
      { id: 'excluded', label: '석차등급 미산출·수강자 5명 이하 제외', value: excludedCount },
      { id: 'optimistic', label: '낙관 시나리오', value: formatScenarioRange(numericModel?.scenarios.optimistic.range9 ?? null) },
      { id: 'conservative', label: '보수 시나리오', value: formatScenarioRange(numericModel?.scenarios.conservative.range9 ?? null) },
      { id: 'range', label: '두 시나리오 전체 범위', value: formatScenarioRange(range) },
      ...basisNotes.map((note, i) => ({ id: `basis-${i}`, label: '해석 기준', value: note })),
    ] };
}

/** 관심 대학 하나의 교과 전형 판정(될각과 같은 조건: 검수된 입결 · 같은 비교 기준, 샘플 모드면 sample 표식 값). 없으면 null(NEVER-1). */
export function judgeUniversity(grades: readonly GradeRecord[], university: string, combo = '국수영사과', department?: string) {
  const conversion = conversionFor(grades, combo), scope = combinations[combo]!;
  if (conversion.status !== 'ready') return null;
  const basis = currentComparisonBasis(grades, scope, true);
  for (const p of programs) {
    if (p.university !== university || (department !== undefined && p.department !== department) || p.admission_year !== admissionYear || (p.admission_type && p.admission_type !== '교과')) continue;
    if (!compareBasis(basis, p.cut_basis).comparable || p.cut_grade_system !== basis.grade_system || p.cut_subject_scope.length !== scope.length || !scope.every(g => p.cut_subject_scope.includes(g))) continue;
    const r = judgeRange(conversion.value, p.license_status === 'allowed' ? p.cut : null, activeRules().judgment);
    if (r.status === 'ready') return { p, v: r.value };
  }
  return null;
}
