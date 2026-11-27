import { hasRank, validateGrade, validateAttendance, subjectTypes, type GradeRecord, type AttendanceRecord, type Semester, type SubjectType } from '../domain/student';
import { invalid, pending, ready, reviewed, type Calculation, type Provenance, type Trace } from './types';

export interface ScoringRule extends Provenance {
  admission_year: number;
  university: string;
  program: string;
  version: number;
  semesters: Semester[];
  year_weights?: Record<string, number>;
  subject_groups: string[];
  selection: { mode: 'all' | 'top_n_per_group' | 'top_n_total'; n?: number };
  credit_weighted: boolean;
  rank_grade_points: Record<string, number>;
  achievement_points?: Record<string, number>;
  achievement_blend: { mode: 'none' | 'weighted' | 'max'; rank_ratio?: number };
  no_rank_subject_policy: 'exclude' | 'achievement_convert' | 'bonus';
  joint_curriculum_policy: 'include' | 'exclude';
  bonus?: { points: Record<string, number>; max: number };
  grade_max_score: number;
  base_score: number;
  attendance_rule?: { years: number[]; tardy_to_absence: number; max_score: number; deduction_table: { absence_max: number; points: number }[] };
  max_score: number;
  rounding: { digits: number; mode: 'round' | 'floor' | 'ceil' };
  /** 추가 규칙(2026-11-27): 기본 모델로 표현되지 않는 대학 방식. 없으면 예전 계산과 똑같아요. */
  advanced?: AdvancedRule;
}
type Rounding = 'round' | 'floor' | 'ceil';
/** 과목 고르기 묶음: 이 교과(·학년)에서 상위 n과목(n 없으면 전부). 앞 묶음에서 고른 과목은 뒤 묶음에서 다시 고르지 않아요. */
export interface RuleBucket { name?: string; groups: string[]; n?: number; years?: number[]; /** 과목이 n보다 모자라면 이 등급·학점의 빈 과목으로 채워요(원문 '부족 과목은 5등급') */ fill?: { grade: number; credits: number } }
export interface AdvancedRule {
  /** 계열(모집단위)마다 반영 교과·묶음·비율이 다를 때. 학과 이름이 units 중 하나를 포함하면 그 계열('*'은 나머지 전부). 학과를 모르면 계산하지 않아요. */
  tracks?: { name: string; units: string[]; subject_groups?: string[]; buckets?: RuleBucket[]; group_weights?: Record<string, number>; top_groups?: number; rank_grade_points?: Record<string, number>; achievement_points?: Record<string, number>;
    /** 이 계열은 나열한 계열들로 각각 계산해 가장 높은 총점을 써요(예: 광역계 = A·B 중 우수) */ best_of?: string[] }[];
  /** 성취도 가산: 반영 과목 성취도 점수의 (학점 가중) 평균을 교과 점수에 더해요(max 상한) */
  achievement_bonus?: { points: Record<string, number>; max: number };
  /** 교과 이름 바꿔 읽기(예: 한국사 → 사회, 원문 '한국사는 사회 교과로 반영') */
  group_alias?: Record<string, string>;
  /** 과목 가중에 곱하는 교과별 배율(학점 × 배율로 평균, 예: 수학·영어·과학 1.1) */
  subject_weights?: Record<string, number>;
  /** 과목 점수 평균(점수표 단위)을 중간에 자르기(예: 소수 셋째자리 반올림 후 ×50) */
  mean_rounding?: { digits: number; mode: Rounding };
  buckets?: RuleBucket[];
  /** 반영 교과 중 (학점 가중) 평균이 높은 K개 교과의 모든 과목 */
  top_groups?: number;
  /** 교과(또는 묶음 이름)별 평균에 곱하는 비율, 합 1 */
  group_weights?: Record<string, number>;
  /** 과목 유형별 반영: rank 석차등급 · achievement 성취도 · max 둘 중 높은 값 · exclude 빼기. limit = 이 규칙에 걸린 과목 중 상위 N개만 */
  type_rules?: { types: SubjectType[]; groups?: string[]; use: 'rank' | 'achievement' | 'max' | 'exclude'; limit?: number; /** limit 밖 과목: drop 빼기(기본) · rank 석차등급으로 반영 */ beyond?: 'drop' | 'rank' }[];
  /** 고른 과목의 평균 석차등급(성취도 A~E = 1~5)을 먼저 내고(digits·mode로 자름) 평균 ≤ upto인 첫 칸의 점수를 교과 점수로 써요 */
  average_table?: { digits: number; mode: Rounding; steps: { upto: number; score: number }[] };
  /** 반영 교과 이수학점 합으로 교과 점수 조정: tiers 배율(가장 큰 min ≤ 합) · shortfall 합 ≤ below면 × (base − 부족학점 × per_credit) · 학점당 가산 · min 이상 가산. cap = 교과 점수 상한(없으면 교과 만점) */
  credits?: { tiers?: { min: number; factor: number }[]; shortfall?: { below: number; base: number; per_credit: number }; per_credit_bonus?: number; bonus_at?: { min: number; points: number }; bonus_tiers?: { min: number; points: number }[]; cap?: number;
    /** 학점을 세는 과목: scope 반영 학기·교과 전 과목(기본) · ranked 석차등급 있는 과목 · chosen 고른 과목 */ count?: 'scope' | 'ranked' | 'chosen'; /** 조정 대상: grade 교과(기본) · total 교과+출결 */ apply_to?: 'grade' | 'total';
    /** 이 학점보다 적으면 계산하지 않고 이유를 알려요(원문 '반영 과목 N학점 미만 지원 불가') */ minimum?: number };
  /** 출결: per_day = 환산 결석 1일당 감점(감점표 대신) · perfect_bonus = 미인정 결석·지각·조퇴·결과 없는 학년마다 가산(총점은 만점까지) */
  attendance?: { per_day?: number; perfect_bonus?: { years: number[]; points: number; cap?: number }; /** 출결 만점 없이 총점에서 감점(감점이 출결 만점을 넘어도 돼요) */ from_total?: boolean;
    /** 출결 종류별 1회당 감점(미인정만): 결석·지각·조퇴·결과. free_absences = 감점 없이 넘기는 결석 횟수(원문 '2회 초과 시 1회당') */ per_kind?: { absence: number; tardy: number; early_leave: number; class_absence: number; free_absences?: number } };
}
export interface ScoreResult {
  grade: number; attendance: number; bonus: number; total: number; max: number;
  selected_ids: string[]; average_rank: number | null; attendance_deduction: number;
}
const finitePositive = (n: number) => Number.isFinite(n) && n > 0;
const nonnegative = (n: number) => Number.isFinite(n) && n >= 0;
const validPoints = (p: Record<string, number>) => Object.keys(p).length > 0 && Object.values(p).every(nonnegative) && Math.max(...Object.values(p)) > 0;
export function validateScoringRule(r: ScoringRule): string[] {
  const errors: string[] = [];
  if (!r.semesters.length || new Set(r.semesters).size !== r.semesters.length || r.semesters.some(s => !/^[123]-[12]$/.test(s)) || !r.subject_groups.length) errors.push('반영 학기·교과를 확인해 주세요.');
  if (!validPoints(r.rank_grade_points) || ['1', '2', '3', '4', '5'].some(k => r.rank_grade_points[k] === undefined)) errors.push('1~5등급 점수표가 필요해요.');
  if (!['all', 'top_n_per_group', 'top_n_total'].includes(r.selection.mode) || (r.selection.mode !== 'all' && (!Number.isSafeInteger(r.selection.n) || r.selection.n! < 1))) errors.push('과목 선택 규칙을 확인해 주세요.');
  if (!['none', 'weighted', 'max'].includes(r.achievement_blend.mode) || (r.achievement_blend.mode === 'weighted' && (!nonnegative(r.achievement_blend.rank_ratio!) || r.achievement_blend.rank_ratio! > 1))) errors.push('성취도 반영 비율을 확인해 주세요.');
  if ((r.achievement_blend.mode !== 'none' || r.no_rank_subject_policy === 'achievement_convert') && (!r.achievement_points || !validPoints(r.achievement_points))) errors.push('성취도 점수표가 필요해요.');
  if (!['exclude', 'achievement_convert', 'bonus'].includes(r.no_rank_subject_policy) || !['include', 'exclude'].includes(r.joint_curriculum_policy)) errors.push('미산출·공동교육과정 규칙을 확인해 주세요.');
  if (r.no_rank_subject_policy === 'bonus' && (!r.bonus || !nonnegative(r.bonus.max) || !Object.values(r.bonus.points).every(nonnegative))) errors.push('가산점 규칙을 확인해 주세요.');
  if (!finitePositive(r.max_score) || !finitePositive(r.grade_max_score) || !nonnegative(r.base_score)
    || r.base_score > r.grade_max_score || Math.abs(r.grade_max_score + (r.attendance_rule?.max_score ?? 0) - r.max_score) > 1e-8) errors.push('교과·출결·총 만점을 확인해 주세요.');
  if (!Number.isInteger(r.rounding.digits) || r.rounding.digits < 0 || r.rounding.digits > 6 || !['round', 'floor', 'ceil'].includes(r.rounding.mode)) errors.push('반올림 규칙을 확인해 주세요.');
  if (r.year_weights && (Object.entries(r.year_weights).some(([k, v]) => !['1', '2', '3'].includes(k) || !nonnegative(v))
    || Math.abs(Object.values(r.year_weights).reduce((a, b) => a + b, 0) - 1) > 1e-8
    || r.semesters.some(s => r.year_weights![s[0]] === undefined))) errors.push('학년별 가중치는 합계 1로 지정해 주세요.');
  const a = r.attendance_rule;
  if (a && (!a.years.length || new Set(a.years).size !== a.years.length || a.years.some(y => ![1, 2, 3].includes(y))
    || !Number.isSafeInteger(a.tardy_to_absence) || a.tardy_to_absence < 1 || !nonnegative(a.max_score)
    || (!a.deduction_table.length && r.advanced?.attendance?.per_day === undefined && !r.advanced?.attendance?.per_kind) || a.deduction_table.some((d, i) => !Number.isSafeInteger(d.absence_max) || d.absence_max < 0 || !nonnegative(d.points) || (d.points > a.max_score && !r.advanced?.attendance?.from_total)
      || (i > 0 && (d.absence_max <= a.deduction_table[i - 1].absence_max || d.points < a.deduction_table[i - 1].points))))) errors.push('출결 감점 구간을 확인해 주세요.');
  if (r.advanced) errors.push(...validateAdvanced(r));
  return errors;
}
const isInt = (n: unknown, min = 0): n is number => Number.isSafeInteger(n) && (n as number) >= min;
const weightsOk = (w: Record<string, number>) => Object.keys(w).length > 0 && Object.values(w).every(nonnegative) && Math.abs(Object.values(w).reduce((a, b) => a + b, 0) - 1) <= 1e-8;
const bucketsOk = (b: RuleBucket[]) => b.length > 0 && b.every(x => x.groups?.length && (x.n === undefined || isInt(x.n, 1)) && (!x.years || x.years.every(y => [1, 2, 3].includes(y)))
  && (!x.fill || (x.n !== undefined && isInt(x.fill.grade, 1) && x.fill.grade <= 5 && finitePositive(x.fill.credits))));
function validateAdvanced(r: ScoringRule): string[] {
  const v = r.advanced!, e: string[] = [];
  const keysOk = (w: Record<string, number>, groups: string[], buckets?: RuleBucket[]) => Object.keys(w).every(k => groups.includes(k) || !!buckets?.some(b => b.name === k));
  if (v.tracks && (!v.tracks.length || v.tracks.some(t => !t.name || !t.units?.length || (t.subject_groups && !t.subject_groups.length) || (t.buckets && !bucketsOk(t.buckets))
    || (t.group_weights && (!weightsOk(t.group_weights) || !keysOk(t.group_weights, t.subject_groups ?? r.subject_groups, t.buckets ?? v.buckets))) || (t.top_groups !== undefined && !isInt(t.top_groups, 1))
    || (t.rank_grade_points && (!validPoints(t.rank_grade_points) || ['1', '2', '3', '4', '5'].some(k => t.rank_grade_points![k] === undefined))) || (t.achievement_points && !validPoints(t.achievement_points))
    || (t.best_of && (!t.best_of.length || t.best_of.some(n => n === t.name || !v.tracks!.some(o => o.name === n && !o.best_of))))))) e.push('계열별 규칙을 확인해 주세요.');
  if (v.achievement_bonus && (!validPoints(v.achievement_bonus.points) || !nonnegative(v.achievement_bonus.max))) e.push('성취도 가산을 확인해 주세요.');
  if (v.group_alias && Object.entries(v.group_alias).some(([a, b]) => !a || !b || a === b)) e.push('교과 바꿔 읽기를 확인해 주세요.');
  if (v.subject_weights && (!Object.keys(v.subject_weights).length || !Object.values(v.subject_weights).every(finitePositive))) e.push('교과별 배율을 확인해 주세요.');
  if (v.mean_rounding && (!isInt(v.mean_rounding.digits) || v.mean_rounding.digits > 6 || !['round', 'floor', 'ceil'].includes(v.mean_rounding.mode))) e.push('평균 자르기를 확인해 주세요.');
  if (v.buckets && !bucketsOk(v.buckets)) e.push('과목 묶음을 확인해 주세요.');
  if (v.top_groups !== undefined && !isInt(v.top_groups, 1)) e.push('상위 교과 수를 확인해 주세요.');
  if (v.group_weights && (!weightsOk(v.group_weights) || !keysOk(v.group_weights, r.subject_groups, v.buckets))) e.push('교과별 비율은 반영 교과(또는 묶음 이름)에 합계 1로 지정해 주세요.');
  if (v.type_rules && v.type_rules.some(x => !x.types?.length || x.types.some(s => !subjectTypes.includes(s)) || !['rank', 'achievement', 'max', 'exclude'].includes(x.use) || (x.limit !== undefined && !isInt(x.limit, 1)) || (x.beyond !== undefined && (!['drop', 'rank'].includes(x.beyond) || x.limit === undefined)))) e.push('과목 유형 규칙을 확인해 주세요.');
  if (v.type_rules?.some(x => x.use === 'achievement' || x.use === 'max') && !(r.achievement_points && validPoints(r.achievement_points))) e.push('성취도 점수표가 필요해요.');
  const t = v.average_table;
  if (t && (!isInt(t.digits) || t.digits > 6 || !['round', 'floor', 'ceil'].includes(t.mode) || !t.steps?.length
    || t.steps.some((s, i) => !Number.isFinite(s.upto) || !nonnegative(s.score) || (i > 0 && s.upto <= t.steps[i - 1].upto)))) e.push('평균등급 점수표를 확인해 주세요.');
  const c = v.credits;
  if (c && ((c.tiers && c.tiers.some(x => !nonnegative(x.min) || !finitePositive(x.factor))) || (c.shortfall && (!nonnegative(c.shortfall.below) || !finitePositive(c.shortfall.base) || !nonnegative(c.shortfall.per_credit)))
    || (c.per_credit_bonus !== undefined && !nonnegative(c.per_credit_bonus)) || (c.bonus_at && (!nonnegative(c.bonus_at.min) || !nonnegative(c.bonus_at.points))) || (c.cap !== undefined && !finitePositive(c.cap))
    || (c.bonus_tiers && c.bonus_tiers.some(x => !nonnegative(x.min) || !nonnegative(x.points))) || (c.count !== undefined && !['scope', 'ranked', 'chosen'].includes(c.count)) || (c.apply_to !== undefined && !['grade', 'total'].includes(c.apply_to))
    || (c.minimum !== undefined && !nonnegative(c.minimum)))) e.push('이수학점 조정을 확인해 주세요.');
  const at = v.attendance;
  const pk = at?.per_kind;
  if (at && (!r.attendance_rule || (at.per_day !== undefined && !nonnegative(at.per_day)) || (pk && ![pk.absence, pk.tardy, pk.early_leave, pk.class_absence].every(nonnegative)) || (pk?.free_absences !== undefined && !isInt(pk.free_absences))
    || (at.perfect_bonus && (!at.perfect_bonus.years.length || at.perfect_bonus.years.some(y => ![1, 2, 3].includes(y)) || !nonnegative(at.perfect_bonus.points) || (at.perfect_bonus.cap !== undefined && !nonnegative(at.perfect_bonus.cap)))))) e.push('출결 추가 규칙을 확인해 주세요.');
  return e;
}
const roundTo = (v: number, digits: number, mode: Rounding) => Math[mode](Number((v * 10 ** digits).toPrecision(15))) / 10 ** digits;
const LEVEL: Record<string, number> = { A: 1, B: 2, C: 3, D: 4, E: 5 };
/** department: 학생이 고른 학과(계열별 규칙이 있을 때 계열을 고르는 데만 써요). */
export function scoreUniversity(grades: readonly GradeRecord[], attendance: readonly AttendanceRecord[], rule: ScoringRule, department?: string): Calculation<ScoreResult> {
  if (!reviewed(rule)) return pending('환산 규칙 준비 중');
  const errors = validateScoringRule(rule);
  if (errors.length) return invalid(errors.join(' '));
  const trace: Trace[] = [{ rule: rule.id, detail: `${rule.university} ${rule.admission_year} ${rule.program} v${rule.version} · ${rule.source}` }];
  if (new Set(grades.map(g => g.id)).size !== grades.length) return invalid('중복 과목 식별자가 있어요.');
  const adv = rule.advanced ?? {};
  if (adv.group_alias) grades = grades.map(g => adv.group_alias![g.subject_group] ? { ...g, subject_group: adv.group_alias![g.subject_group] } : g);
  let rankPoints = rule.rank_grade_points, achPoints = rule.achievement_points;
  let groups = rule.subject_groups, buckets = adv.buckets, groupWeights = adv.group_weights, topGroups = adv.top_groups;
  if (adv.tracks) {
    const d = department?.trim();
    const track = d ? adv.tracks.find(t => t.units.some(u => u !== '*' && d.includes(u))) ?? adv.tracks.find(t => t.units.includes('*')) : undefined;
    if (!track) return pending('학과를 고르면 계열에 맞춰 계산해요.', trace);
    if (track.best_of) {
      // 나열한 계열로 각각 계산해 총점이 가장 높은 결과(같으면 앞 계열)를 써요
      const runs = track.best_of.map(name => {
        const other = adv.tracks!.find(x => x.name === name)!;
        return { name, r: scoreUniversity(grades, attendance, { ...rule, advanced: { ...adv, tracks: [other] } }, '*' + other.units.find(u => u !== '*')) };
      });
      const ok = runs.filter(x => x.r.status === 'ready') as { name: string; r: Extract<Calculation<ScoreResult>, { status: 'ready' }> }[];
      if (!ok.length) return runs[0].r;
      const best = ok.reduce((a, b) => b.r.value.total > a.r.value.total ? b : a);
      return ready(best.r.value, [...trace, { rule: rule.id, detail: `${track.name}: ${track.best_of.join('·')} 중 높은 ${best.name} 계열로 계산` }, ...best.r.trace]);
    }
    groups = track.subject_groups ?? groups; buckets = track.buckets ?? buckets; groupWeights = track.group_weights ?? groupWeights; topGroups = track.top_groups ?? topGroups;
    rankPoints = track.rank_grade_points ?? rankPoints; achPoints = track.achievement_points ?? achPoints;
    trace.push({ rule: rule.id, detail: `계열 ${track.name}: ${groups.join('·')}` });
  }
  const selectedScope = grades.filter(g => rule.semesters.includes(g.semester) && groups.includes(g.subject_group));
  const valid = selectedScope.filter(g => {
    const error = validateGrade(g);
    const exclude = error.length || (g.is_joint && rule.joint_curriculum_policy === 'exclude');
    if (exclude) trace.push({ rule: rule.id, detail: `${g.name || '미입력 과목'} 제외: ${error.join(' ') || '공동교육과정 제외 규칙'}`, subject_id: g.id });
    return !exclude;
  });
  const rankMax = Math.max(...Object.values(rankPoints));
  const achievementMax = Math.max(...Object.values(achPoints ?? { A: 1 }));
  let bonus = 0;
  type Row = { g: GradeRecord; ratio: number; level: number | null; typeRule?: number; rankRatio?: number | null };
  const rows: Row[] = [];
  for (const g of valid) {
    const rank = hasRank(g) && g.rank_grade !== null ? rankPoints[g.rank_grade] / rankMax : null;
    const ach = g.achievement && achPoints?.[g.achievement];
    const level = hasRank(g) && g.rank_grade !== null ? g.rank_grade : g.achievement ? LEVEL[g.achievement] ?? null : null;
    const ti = adv.type_rules?.findIndex(x => x.types.includes(g.type) && (!x.groups || x.groups.includes(g.subject_group))) ?? -1;
    const tr = ti >= 0 ? adv.type_rules![ti] : undefined;
    if (tr?.use === 'exclude') { trace.push({ rule: rule.id, detail: `${g.name}: ${g.type} 과목 제외`, subject_id: g.id }); continue; }
    if (tr && tr.use !== 'rank') {
      const a = typeof ach === 'number' ? ach / achievementMax : null;
      if (a === null && (tr.use === 'achievement' || rank === null)) return pending(`${g.name}의 성취도 또는 점수표가 필요해요.`, trace);
      rows.push({ g, ratio: tr.use === 'achievement' ? a! : Math.max(rank ?? 0, a ?? 0), level, typeRule: ti, rankRatio: rank }); continue;
    }
    if (rank === null && rule.no_rank_subject_policy === 'exclude') {
      trace.push({ rule: rule.id, detail: `${g.name}: 석차등급 미산출 제외`, subject_id: g.id }); continue;
    }
    if (rank === null && rule.no_rank_subject_policy === 'bonus') {
      const points = g.achievement && rule.bonus!.points[g.achievement];
      if (points === undefined) return pending(`${g.name}의 가산점 성취도 정보가 필요해요.`, trace);
      bonus += points;
      trace.push({ rule: rule.id, detail: `${g.name}: 성취도 가산점`, value: points, subject_id: g.id }); continue;
    }
    if ((rank === null || rule.achievement_blend.mode !== 'none') && ach === undefined) return pending(`${g.name}의 성취도 또는 점수표가 필요해요.`, trace);
    const a = typeof ach === 'number' ? ach / achievementMax : 0;
    const ratio = rank === null ? a : rule.achievement_blend.mode === 'max' ? Math.max(rank, a)
      : rule.achievement_blend.mode === 'weighted' ? rank * rule.achievement_blend.rank_ratio! + a * (1 - rule.achievement_blend.rank_ratio!) : rank;
    rows.push({ g, ratio, level, typeRule: ti >= 0 ? ti : undefined });
  }
  let sorted = rows.sort((a, b) => b.ratio - a.ratio || b.g.credits - a.g.credits || a.g.id.localeCompare(b.g.id));
  // 유형 규칙의 과목 수 제한(예: 융합선택 최대 2과목): 점수 높은 순으로 남겨요
  adv.type_rules?.forEach((x, i) => {
    if (x.limit === undefined) return;
    const keep = new Set(sorted.filter(r => r.typeRule === i).slice(0, x.limit));
    // beyond 'rank': 상위 N과목만 유형 규칙(예: 성취도와 높은 값)을 쓰고 나머지는 석차등급 그대로
    sorted = sorted.flatMap(r => r.typeRule !== i || keep.has(r) ? [r] : x.beyond === 'rank' && r.rankRatio != null ? [{ ...r, ratio: r.rankRatio, typeRule: undefined }] : [])
      .sort((a, b) => b.ratio - a.ratio || b.g.credits - a.g.credits || a.g.id.localeCompare(b.g.id));
  });
  const weight = (g: GradeRecord) => (rule.credit_weighted ? g.credits : 1) * (adv.subject_weights?.[g.subject_group] ?? 1);
  const mean = (items: readonly Row[]) => items.reduce((n, r) => n + r.ratio * weight(r.g), 0) / items.reduce((n, r) => n + weight(r.g), 0);
  const bucketOf = new Map<Row, string>();
  let chosen: Row[];
  if (buckets) {
    chosen = [];
    for (const b of buckets) {
      const pick = sorted.filter(r => !bucketOf.has(r) && b.groups.includes(r.g.subject_group) && (!b.years || b.years.includes(Number(r.g.semester[0]))));
      const take = b.n === undefined ? pick : pick.slice(0, b.n);
      // 모자란 과목은 지정 등급의 빈 과목으로 채워요(원문 '부족 과목은 N등급')
      if (b.fill && b.n !== undefined) for (let k = take.length; k < b.n; k++) {
        const g: GradeRecord = { id: `fill-${b.name ?? b.groups.join('·')}-${k}`, semester: rule.semesters[0], name: '부족 과목 채움', subject_group: b.groups[0], type: '일반선택', credits: b.fill.credits, rank_grade: b.fill.grade, is_joint: false };
        take.push({ g, ratio: rankPoints[b.fill.grade] / rankMax, level: b.fill.grade });
        trace.push({ rule: rule.id, detail: `${b.name ?? b.groups.join('·')} 과목 부족 → ${b.fill.grade}등급으로 채움` });
      }
      for (const r of take) { bucketOf.set(r, b.name ?? b.groups.join('·')); chosen.push(r); }
    }
  } else if (topGroups) {
    const means = [...new Set(sorted.map(r => r.g.subject_group))].map(gr => ({ gr, m: mean(sorted.filter(r => r.g.subject_group === gr)) })).sort((a, b) => b.m - a.m);
    const top = new Set(means.slice(0, topGroups).map(x => x.gr));
    trace.push({ rule: rule.id, detail: `상위 ${topGroups}개 교과: ${[...top].join('·')}` });
    chosen = sorted.filter(r => top.has(r.g.subject_group));
  } else {
    const counts = new Map<string, number>();
    chosen = sorted.filter((r, i) => {
      if (rule.selection.mode === 'top_n_total') return i < rule.selection.n!;
      if (rule.selection.mode === 'top_n_per_group') {
        const n = counts.get(r.g.subject_group) ?? 0; counts.set(r.g.subject_group, n + 1); return n < rule.selection.n!;
      }
      return true;
    });
  }
  if (!chosen.length) return pending('반영할 과목이 없어요.', trace);
  for (const { g, ratio: subjectRatio } of chosen) trace.push({ rule: rule.id, detail: `${g.semester} ${g.name} · 점수 비율 × 가중 ${weight(g)}`, value: subjectRatio, subject_id: g.id });
  bonus = Math.min(bonus, rule.bonus?.max ?? 0);
  let grade: number;
  if (adv.average_table) {
    const t = adv.average_table, leveled = chosen.filter(r => r.level !== null);
    if (!leveled.length) return pending('평균등급을 낼 과목이 없어요.', trace);
    const avg = roundTo(leveled.reduce((n, r) => n + r.level! * weight(r.g), 0) / leveled.reduce((n, r) => n + weight(r.g), 0), t.digits, t.mode);
    const step = t.steps.find(s => avg <= s.upto + 1e-9);
    if (!step) return pending(`평균등급 ${avg}에 맞는 점수 구간이 없어요.`, trace);
    grade = step.score + bonus;
    trace.push({ rule: rule.id, detail: `평균등급 ${avg} → 표 ${step.upto} 이하 칸`, value: step.score });
  } else {
    let ratio = mean(chosen);
    const cut = (v: number) => adv.mean_rounding ? roundTo(v * rankMax, adv.mean_rounding.digits, adv.mean_rounding.mode) / rankMax : v;
    ratio = cut(ratio);
    if (groupWeights) {
      ratio = 0;
      for (const [key, w] of Object.entries(groupWeights)) {
        if (!w) continue;
        const isBucket = !!buckets?.some(b => b.name === key);
        const items = chosen.filter(r => isBucket ? bucketOf.get(r) === key : r.g.subject_group === key);
        if (!items.length) return pending(`${key} 반영 과목이 필요해요.`, trace);
        ratio += mean(items) * w;
        trace.push({ rule: rule.id, detail: `${key} 점수 비율 × 비율 ${w}`, value: mean(items) * w });
      }
    } else if (rule.year_weights) {
      ratio = 0;
      for (const [year, w] of Object.entries(rule.year_weights)) {
        if (!w) continue;
        const items = chosen.filter(r => r.g.semester[0] === year);
        if (!items.length) return pending(`${year}학년 반영 과목이 필요해요.`, trace);
        ratio += mean(items) * w;
        trace.push({ rule: rule.id, detail: `${year}학년 점수 비율 × 가중치 ${w}`, value: mean(items) * w });
      }
    }
    grade = rule.base_score + ratio * (rule.grade_max_score - rule.base_score) + bonus;
  }
  if (adv.achievement_bonus) {
    const b = adv.achievement_bonus, scored = valid.filter(g => g.achievement && b.points[g.achievement] !== undefined);
    const w = scored.reduce((n, g) => n + weight(g), 0);
    const add = w ? Math.min(b.max, scored.reduce((n, g) => n + b.points[g.achievement!] * weight(g), 0) / w) : 0;
    grade += add;
    trace.push({ rule: rule.id, detail: `성취도 가산(${scored.length}과목 평균)`, value: add });
  }
  let gradeCap = rule.grade_max_score, creditFactor = 1, creditAdd = 0;
  if (adv.credits) {
    const c = adv.credits;
    const counted = c.count === 'chosen' ? chosen.map(r => r.g).filter(g => !g.id.startsWith('fill-')) : c.count === 'ranked' ? valid.filter(g => hasRank(g) && g.rank_grade !== null) : valid;
    const credits = counted.reduce((n, g) => n + g.credits, 0);
    if (c.minimum !== undefined && credits < c.minimum) return pending(`반영 과목 이수학점이 ${c.minimum}학점보다 적어요(지금 ${credits}학점) — 원문 지원 기준을 확인해 주세요.`, trace);
    creditFactor = [...(c.tiers ?? [])].sort((a, b) => b.min - a.min).find(x => credits >= x.min)?.factor ?? 1;
    if (c.shortfall && credits <= c.shortfall.below) creditFactor *= c.shortfall.base - (c.shortfall.below - credits) * c.shortfall.per_credit;
    creditAdd = (c.per_credit_bonus ?? 0) * credits + (c.bonus_at && credits >= c.bonus_at.min ? c.bonus_at.points : 0)
      + ([...(c.bonus_tiers ?? [])].sort((a, b) => b.min - a.min).find(x => credits >= x.min)?.points ?? 0);
    trace.push({ rule: rule.id, detail: `이수학점 ${credits} → × ${creditFactor} + ${creditAdd}${c.apply_to === 'total' ? ' (교과+출결에)' : ''}` });
    if (c.apply_to !== 'total') { grade = grade * creditFactor + creditAdd; gradeCap = c.cap ?? gradeCap; }
  }
  grade = Math.min(gradeCap, grade);
  let attendanceScore = 0, deduction = 0, perfect = 0;
  if (rule.attendance_rule) {
    const a = rule.attendance_rule;
    const records = attendance.filter(r => a.years.includes(r.year));
    if (new Set(records.map(r => r.year)).size !== records.length) return invalid('학년별 출결이 중복됐어요.');
    if (records.length !== a.years.length || records.some(r => !r.school_days)) return pending('반영 학년의 출결을 입력해 주세요.', trace);
    if (records.some(r => validateAttendance(r).length)) return invalid('출결 입력을 확인해 주세요.');
    const absence = records.reduce((n, r) => n + r.absence.unexcused, 0);
    const tardy = records.reduce((n, r) => n + r.tardy.unexcused + r.early_leave.unexcused + r.class_absence.unexcused, 0);
    const equivalent = absence + Math.floor(tardy / a.tardy_to_absence);
    const pk = adv.attendance?.per_kind;
    if (pk) {
      const sum = (k: 'absence' | 'tardy' | 'early_leave' | 'class_absence') => records.reduce((n, r) => n + r[k].unexcused, 0);
      deduction = Math.min(a.max_score, Math.max(0, sum('absence') - (pk.free_absences ?? 0)) * pk.absence + sum('tardy') * pk.tardy + sum('early_leave') * pk.early_leave + sum('class_absence') * pk.class_absence);
    } else if (adv.attendance?.per_day !== undefined) deduction = Math.min(a.max_score, equivalent * adv.attendance.per_day);
    else {
      const band = a.deduction_table.find(d => equivalent <= d.absence_max);
      if (!band) return pending('해당 결석일수의 출결 감점 구간이 필요해요.', trace);
      deduction = band.points;
    }
    attendanceScore = adv.attendance?.from_total ? -deduction : a.max_score - deduction;
    trace.push({ rule: rule.id, detail: `미인정 결석 ${absence} + 지각·조퇴·결과 ${tardy} ÷ ${a.tardy_to_absence}의 정수 부분`, value: equivalent },
      { rule: rule.id, detail: `출결 만점 ${a.max_score} − 감점 ${deduction}`, value: attendanceScore });
    const pb = adv.attendance?.perfect_bonus;
    if (pb) {
      const clean = records.filter(r => pb.years.includes(r.year) && r.absence.unexcused + r.tardy.unexcused + r.early_leave.unexcused + r.class_absence.unexcused === 0).length;
      perfect = Math.min(pb.cap ?? Infinity, clean * pb.points);
      trace.push({ rule: rule.id, detail: `개근 ${clean}개 학년 가산`, value: perfect });
    }
  }
  const scale = 10 ** rule.rounding.digits;
  // 개근 가산은 총점 만점을 넘지 않아요(원문 '1000 상한')
  let unrounded = perfect ? Math.min(rule.max_score, grade + attendanceScore + perfect) : grade + attendanceScore;
  if (adv.credits?.apply_to === 'total') unrounded = Math.min(adv.credits.cap ?? rule.max_score, unrounded * creditFactor + creditAdd);
  if (adv.attendance?.from_total) unrounded = Math.max(0, unrounded);
  const total = Math[rule.rounding.mode](Number((unrounded * scale).toPrecision(15))) / scale;
  trace.push({ rule: rule.id, detail: '교과 환산(중간 반올림 없음)', value: grade },
    { rule: rule.id, detail: `교과 + 출결 · 최종 ${rule.rounding.digits}자리 ${rule.rounding.mode}`, value: total });
  const ranked = chosen.filter(r => r.g.rank_grade !== null);
  return ready({ grade, attendance: attendanceScore, bonus: bonus + perfect, total, max: rule.max_score, selected_ids: chosen.map(r => r.g.id),
    average_rank: ranked.length ? ranked.reduce((n, r) => n + r.g.rank_grade! * weight(r.g), 0) / ranked.reduce((n, r) => n + weight(r.g), 0) : null,
    attendance_deduction: deduction }, trace);
}
