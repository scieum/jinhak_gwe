export interface ComparisonBasis {
  year: number;
  grade_system: 5 | 9 | null;
  metric: 'rank_grade' | 'converted_grade' | 'university_score';
  statistic: 'individual' | 'p50' | 'p70' | 'mean';
  max_score: number;
  subject_scope: readonly string[];
  semesters: readonly string[];
  method_id: string;
  method_version: string;
  source: string;
  review_status: 'draft' | 'verified';
}
export const metricLabels = { rank_grade: '원등급 평균', converted_grade: '환산 등급(추정)', university_score: '대학별 환산점수' };
export const statisticLabels = { individual: '개인 성적', p50: '50% 컷', p70: '70% 컷', mean: '평균' };
const sameSet = (a: readonly string[], b: readonly string[]) => a.length === b.length && new Set(a).size === a.length && [...a].sort().join('\0') === [...b].sort().join('\0');
function complete(b: ComparisonBasis) {
  return Number.isInteger(b.year) && b.year >= 2020 && b.year <= 2100 && Object.hasOwn(metricLabels, b.metric) && Object.hasOwn(statisticLabels, b.statistic)
    && (b.grade_system === 5 || b.grade_system === 9 || b.metric === 'university_score' && b.grade_system === null)
    && Number.isFinite(b.max_score) && b.max_score > 0 && (b.metric === 'university_score' || b.max_score === b.grade_system)
    && Array.isArray(b.subject_scope) && b.subject_scope.length > 0 && b.subject_scope.every(s => typeof s === 'string' && !!s.trim())
    && new Set(b.subject_scope).size === b.subject_scope.length && Array.isArray(b.semesters) && b.semesters.length > 0
    && b.semesters.every(s => ['1-1', '1-2', '2-1', '2-2', '3-1', '3-2'].includes(s)) && new Set(b.semesters).size === b.semesters.length
    && typeof b.method_id === 'string' && !!b.method_id.trim() && typeof b.method_version === 'string' && !!b.method_version.trim()
    && typeof b.source === 'string' && !!b.source.trim();
}
/** Fail closed. Historical values must first be released on an explicitly reviewed, common basis. */
export function compareBasis(input: ComparisonBasis | null | undefined, cut: ComparisonBasis | null | undefined) {
  const reasons: string[] = [];
  if (!input || !cut) return { comparable: false, reasons: ['학년도·등급제·지표·산식 등 비교 조건이 아직 등록되지 않았어요.'] };
  if (!complete(input) || !complete(cut)) return { comparable: false, reasons: ['비교 조건에 빠졌거나 잘못된 항목이 있어요.'] };
  if (input.review_status !== 'verified' || cut.review_status !== 'verified') reasons.push('비교 기준의 검수가 필요해요.');
  if (input.year !== cut.year) reasons.push('학년도가 달라요. 같은 기준으로 검수된 자료가 필요해요.');
  if (input.grade_system !== cut.grade_system) reasons.push('등급제가 달라요. 5등급과 9등급 수치를 직접 비교하지 않아요.');
  if (input.metric !== cut.metric) reasons.push('지표가 달라요. 원등급·추정 환산등급·대학별 점수를 구분해 주세요.');
  if (input.max_score !== cut.max_score) reasons.push('점수 척도 또는 만점이 달라요.');
  if (input.statistic !== 'individual' || cut.statistic !== 'p70') reasons.push('현재 비교는 개인 성적과 70% 컷을 기준으로 해요. 평균·50% 컷을 대신 쓰지 않아요.');
  if (!sameSet(input.subject_scope, cut.subject_scope)) reasons.push('반영 교과가 달라요.');
  if (!sameSet(input.semesters, cut.semesters)) reasons.push('반영 학기가 달라요.');
  if (input.method_id !== cut.method_id || input.method_version !== cut.method_version) reasons.push('산식 또는 산식 버전이 달라요.');
  return { comparable: reasons.length === 0, reasons };
}
