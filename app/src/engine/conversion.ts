import {
  between, invalid, pending, ready, reviewed,
  type Calculation, type ConfidenceRule, type ConversionRule, type DistributionRule,
  type EnrollmentRule, type PlacementTable, type SubjectGrade, type Trace,
} from './types';

function increasing(values: readonly number[], length: number, min: number, max: number) {
  return values.length === length && values.every((v, i) => between(v, min, max) && (i === 0 || v > values[i - 1]));
}
function interpolate(x: number, xs: readonly number[], ys: readonly number[]) {
  if (x <= xs[0]) return ys[0];
  for (let i = 1; i < xs.length; i++) {
    if (x <= xs[i]) return ys[i - 1] + (x - xs[i - 1]) * (ys[i] - ys[i - 1]) / (xs[i] - xs[i - 1]);
  }
  return ys[ys.length - 1];
}
function validRule(rule: ConversionRule) {
  return increasing(rule.five_midpoints, 5, 0, 100) && increasing(rule.nine_midpoints, 9, 0, 100);
}
const percentileGrade = (p: number, rule: ConversionRule) => interpolate(p, rule.nine_midpoints, [1, 2, 3, 4, 5, 6, 7, 8, 9]);

/** R-CONV-001..003. No rounding until presentation. */
export function convertAverage(g5: number, rule: ConversionRule): Calculation<number> {
  if (!reviewed(rule)) return pending('환산 규칙 준비 중');
  if (!validRule(rule) || !between(g5, 1, 5)) return invalid('평균 등급 또는 보간 기준점이 올바르지 않아요.');
  const p = interpolate(g5, [1, 2, 3, 4, 5], rule.five_midpoints);
  return ready(percentileGrade(p, rule), [
    { rule: rule.id, detail: '학점 가중 5등급 평균', value: g5 },
    { rule: rule.id, detail: '중앙 누적비 보간(%)', value: p },
  ]);
}

/** R-CONV-010 candidate, gated until the official rounding/tie rules are reviewed. */
export function enrollmentInterval(grade: number, n: number, rule: EnrollmentRule): Calculation<readonly [number, number]> {
  if (!reviewed(rule)) return pending('수강자수 보정 규칙 준비 중');
  const cuts = rule.cumulative_percentages;
  if (!Number.isSafeInteger(n) || n < 1 || !Number.isInteger(grade) || !between(grade, 1, 5)
      || !increasing(cuts, 6, 0, 100) || cuts[0] !== 0 || cuts[5] !== 100 || rule.rounding !== 'half_up') {
    return invalid('수강자수·석차등급 또는 누적비 기준이 올바르지 않아요.');
  }
  if (n <= 5) return pending('수강자수 5명 이하 과목은 환산에서 제외해요.');
  const lo = Math.round(n * cuts[grade - 1] / 100);
  const hi = Math.round(n * cuts[grade] / 100);
  if (hi <= lo) return pending('산출 가능한 등급 구간이 없어요. 동석차 등 원자료 확인이 필요해요.');
  return ready([lo / n * 100, hi / n * 100], [
    { rule: rule.id, detail: '등급 구간 아래 누적 인원', value: lo },
    { rule: rule.id, detail: '등급 구간 위 누적 인원', value: hi },
  ]);
}

/** R-CONV-011. A~E percentages; only fixed achievement boundaries are supported. */
export function distributionPercentile(
  subject: SubjectGrade, interval: readonly [number, number], rule: DistributionRule,
): Calculation<number> {
  if (!reviewed(rule)) return pending('분포비율 보정 규칙 준비 중');
  if (rule.method !== 'fixed_linear') return invalid('지원하지 않는 분포비율 보정 방식이에요.');
  if (subject.division !== 'fixed' || subject.raw_score === undefined || !subject.achievement_distribution) {
    return pending('고정분할 원점수와 성취도별 분포비율이 필요해요.');
  }
  const d = subject.achievement_distribution;
  const sum = d.reduce((a, b) => a + b, 0);
  if (!between(subject.raw_score, 0, 100) || d.length !== 5 || !d.every(v => between(v, 0, 100))
      || Math.abs(sum - 100) > 0.100000001 || !between(interval[0], 0, 100)
      || !between(interval[1], 0, 100) || interval[0] >= interval[1]) {
    return invalid('원점수·분포비율 합계 또는 석차 구간을 확인해 주세요.');
  }
  const cumulative = [0];
  for (const v of d) cumulative.push(cumulative[cumulative.length - 1] + v / sum * 100);
  const p = interpolate(subject.raw_score, [0, 60, 70, 80, 90, 100], [...cumulative].reverse());
  const clipped = Math.max(interval[0], Math.min(interval[1], p));
  return ready(clipped, [
    { rule: rule.id, detail: '분포비율 합계(100%로 정규화)', value: sum },
    { rule: rule.id, detail: '고정분할 경계 사이 누적비(%)', value: p },
    { rule: rule.id, detail: '석차등급 구간으로 제한한 누적비(%)', value: clipped },
  ]);
}

export interface PlacementQuery { basis_semesters: number; subject_scope: readonly string[]; region?: string }
function sameScope(a: readonly string[], b: readonly string[]) {
  return a.length > 0 && new Set(a).size === a.length && new Set(b).size === b.length
    && a.length === b.length && a.every(group => group.trim().length > 0 && b.includes(group));
}
export function selectPlacement(g5: number, query: PlacementQuery, tables: readonly PlacementTable[]): Calculation<{
  grade: number; table_id: string; semester_mismatch: boolean;
}> {
  if (!between(g5, 1, 5) || !Number.isInteger(query.basis_semesters) || !between(query.basis_semesters, 1, 6)
      || !sameScope(query.subject_scope, query.subject_scope)) return invalid('배치표 조회 조건을 확인해 주세요.');
  const candidates = tables.filter(t => reviewed(t) && t.license_status === 'allowed'
    && sameScope(t.subject_scope, query.subject_scope) && (!query.region || t.region === query.region)
    && t.region.trim() && Number.isSafeInteger(t.n) && t.n > 0 && Number.isInteger(t.year) && t.year > 0
    && Number.isInteger(t.basis_semesters) && between(t.basis_semesters, 1, 6)
    && t.points.length >= 2 && t.points.every((p, i) => between(p.g5, 1, 5) && between(p.g9, 1, 9)
      && (i === 0 || (p.g5 > t.points[i - 1].g5 && p.g9 >= t.points[i - 1].g9)))
    && g5 >= t.points[0].g5 && g5 <= t.points[t.points.length - 1].g5);
  candidates.sort((a, b) => Math.abs(a.basis_semesters - query.basis_semesters) - Math.abs(b.basis_semesters - query.basis_semesters)
    || b.year - a.year || b.n - a.n || a.id.localeCompare(b.id));
  const t = candidates[0];
  if (!t) return pending('조건에 맞는 검수·이용 허락 완료 배치표 준비 중');
  const mismatch = t.basis_semesters !== query.basis_semesters;
  const grade = interpolate(g5, t.points.map(p => p.g5), t.points.map(p => p.g9));
  return ready({ grade, table_id: t.id, semester_mismatch: mismatch }, [
    { rule: t.id, detail: `${t.source} · ${t.region} · ${t.year} · 표본 ${t.n}명 · ${t.basis_semesters}개 학기` },
    { rule: t.id, detail: mismatch ? '가장 가까운 학기 표 사용: 신뢰도 한 단계 하향' : '동일 학기 표 사용', value: grade },
  ]);
}

export type Confidence = '높음' | '보통' | '낮음';
export interface ConversionResult {
  a1: number;
  a2: Calculation<number>;
  a3: Calculation<number>;
  b: ReturnType<typeof selectPlacement>;
  min: number;
  max: number;
  confidence: Calculation<Confidence>;
  included_subjects: number;
  excluded_subjects: number;
}
export interface ConversionOptions {
  base: ConversionRule;
  enrollment: EnrollmentRule;
  distribution: DistributionRule;
  confidence: ConfidenceRule;
  placement: PlacementQuery;
  tables: readonly PlacementTable[];
}
function confidenceFor(subjects: readonly SubjectGrade[], included: number, spread: number, mismatch: boolean,
  complete: boolean, rule: ConfidenceRule): Calculation<Confidence> {
  if (!reviewed(rule)) return pending('신뢰도 기준 준비 중');
  const bands = [rule.high, rule.medium];
  if (!Number.isSafeInteger(rule.small_class_max) || rule.small_class_max < 5
    || bands.some(b => !Number.isInteger(b.min_subjects) || b.min_subjects < 1 || !between(b.max_small_ratio, 0, 1)
      || !between(b.max_excluded_ratio, 0, 1) || !between(b.max_spread, 0, 8))
    || rule.high.min_subjects < rule.medium.min_subjects || rule.high.max_small_ratio > rule.medium.max_small_ratio
    || rule.high.max_excluded_ratio > rule.medium.max_excluded_ratio || rule.high.max_spread > rule.medium.max_spread) {
    return invalid('신뢰도 기준을 확인해 주세요.');
  }
  const small = subjects.filter(s => s.enrolled_count !== undefined && s.enrolled_count <= rule.small_class_max).length / subjects.length;
  const excluded = (subjects.length - included) / subjects.length;
  const index = complete ? bands.findIndex(b => included >= b.min_subjects && small <= b.max_small_ratio
    && excluded <= b.max_excluded_ratio && spread <= b.max_spread) : -1;
  const level = Math.min(2, (index < 0 ? 2 : index) + Number(mismatch));
  return ready((['높음', '보통', '낮음'] as const)[level], [
    { rule: rule.id, detail: '산출 과목 수', value: included },
    { rule: rule.id, detail: '소수 수강 과목 비율', value: small },
    { rule: rule.id, detail: '미산출·제외 과목 비율', value: excluded },
    { rule: rule.id, detail: '방법 간 차이', value: spread },
  ]);
}

export function convertSubjects(subjects: readonly SubjectGrade[], options: ConversionOptions): Calculation<ConversionResult> {
  if (!reviewed(options.base)) return pending('환산 규칙 준비 중');
  if (!sameScope(options.placement.subject_scope, options.placement.subject_scope)) return invalid('교과 범위를 확인해 주세요.');
  if (new Set(subjects.map(s => s.id)).size !== subjects.length || subjects.some(s => !s.id.trim()
    || !s.subject_group.trim() || !Number.isFinite(s.credits) || s.credits <= 0
    || (s.rank_grade !== null && (!Number.isInteger(s.rank_grade) || !between(s.rank_grade, 1, 5)))
    || (s.enrolled_count !== undefined && (!Number.isSafeInteger(s.enrolled_count) || s.enrolled_count < 1)))) {
    return invalid('과목 식별자·학점·석차등급·수강자수를 확인해 주세요.');
  }
  const selected = subjects.filter(s => options.placement.subject_scope.includes(s.subject_group));
  const included = selected.filter(s => s.rank_grade !== null && (s.enrolled_count === undefined || s.enrolled_count > 5));
  if (!included.length) return pending('환산할 석차등급 과목이 없어요.');
  const credits = included.reduce((sum, s) => sum + s.credits, 0);
  const g5 = included.reduce((sum, s) => sum + s.credits * s.rank_grade!, 0) / credits;
  const a1 = convertAverage(g5, options.base);
  if (a1.status !== 'ready') return a1;
  const trace: Trace[] = [...a1.trace, ...selected.filter(s => !included.includes(s)).map(s => ({
    rule: 'R-CONV-010', detail: '미산출 또는 5명 이하 과목 제외', subject_id: s.id,
  }))];
  const intervals = included.map(s => s.enrolled_count === undefined
    ? ready<readonly [number, number]>([([0, 10, 34, 66, 90, 100])[s.rank_grade! - 1], ([0, 10, 34, 66, 90, 100])[s.rank_grade!]])
    : enrollmentInterval(s.rank_grade!, s.enrolled_count, options.enrollment));
  function weighted(method: 'a2' | 'a3'): Calculation<number> {
    let sum = 0;
    const steps: Trace[] = [];
    for (let i = 0; i < included.length; i++) {
      const s = included[i];
      const interval = intervals[i];
      if (interval.status !== 'ready') return interval;
      const p = method === 'a3' ? distributionPercentile(s, interval.value, options.distribution)
        : ready(s.enrolled_count === undefined ? options.base.five_midpoints[s.rank_grade! - 1]
          : (interval.value[0] + interval.value[1]) / 2, interval.trace);
      if (p.status !== 'ready') return p;
      const grade = percentileGrade(p.value, options.base);
      sum += grade * (s.credits / credits);
      steps.push(...p.trace.map(t => ({ ...t, subject_id: s.id })),
        { rule: method === 'a2' ? 'R-CONV-004' : 'R-CONV-011', detail: '과목 환산 9등급', value: grade, subject_id: s.id },
        { rule: options.base.id, detail: '학점 가중치', value: s.credits / credits, subject_id: s.id });
    }
    return ready(sum, steps);
  }
  const a2 = weighted('a2');
  // A-3 is all-or-nothing for this subject scope: do not compare averages of different cohorts.
  const a3 = weighted('a3');
  const b = selectPlacement(g5, options.placement, options.tables);
  const values = [a1.value];
  for (const result of [a2, a3]) if (result.status === 'ready') values.push(result.value);
  if (b.status === 'ready') values.push(b.value.grade);
  const min = Math.min(...values), max = Math.max(...values);
  const confidence = confidenceFor(selected, included.length, max - min,
    b.status === 'ready' && b.value.semester_mismatch, a2.status === 'ready', options.confidence);
  return ready({ a1: a1.value, a2, a3, b, min, max, confidence,
    included_subjects: included.length, excluded_subjects: selected.length - included.length },
  [...trace, ...a2.trace, ...a3.trace, ...b.trace, ...confidence.trace]);
}
