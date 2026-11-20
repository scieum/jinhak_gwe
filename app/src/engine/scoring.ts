import { hasRank, validateGrade, validateAttendance, type GradeRecord, type AttendanceRecord, type Semester } from '../domain/student';
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
    || !a.deduction_table.length || a.deduction_table.some((d, i) => !Number.isSafeInteger(d.absence_max) || d.absence_max < 0 || !nonnegative(d.points) || d.points > a.max_score
      || (i > 0 && (d.absence_max <= a.deduction_table[i - 1].absence_max || d.points < a.deduction_table[i - 1].points))))) errors.push('출결 감점 구간을 확인해 주세요.');
  return errors;
}
export function scoreUniversity(grades: readonly GradeRecord[], attendance: readonly AttendanceRecord[], rule: ScoringRule): Calculation<ScoreResult> {
  if (!reviewed(rule)) return pending('환산 규칙 준비 중');
  const errors = validateScoringRule(rule);
  if (errors.length) return invalid(errors.join(' '));
  const trace: Trace[] = [{ rule: rule.id, detail: `${rule.university} ${rule.admission_year} ${rule.program} v${rule.version} · ${rule.source}` }];
  if (new Set(grades.map(g => g.id)).size !== grades.length) return invalid('중복 과목 식별자가 있어요.');
  const selectedScope = grades.filter(g => rule.semesters.includes(g.semester) && rule.subject_groups.includes(g.subject_group));
  const valid = selectedScope.filter(g => {
    const error = validateGrade(g);
    const exclude = error.length || (g.is_joint && rule.joint_curriculum_policy === 'exclude');
    if (exclude) trace.push({ rule: rule.id, detail: `${g.name || '미입력 과목'} 제외: ${error.join(' ') || '공동교육과정 제외 규칙'}`, subject_id: g.id });
    return !exclude;
  });
  const rankMax = Math.max(...Object.values(rule.rank_grade_points));
  const achievementMax = Math.max(...Object.values(rule.achievement_points ?? { A: 1 }));
  let bonus = 0;
  const rows: { g: GradeRecord; ratio: number }[] = [];
  for (const g of valid) {
    const rank = hasRank(g) && g.rank_grade !== null ? rule.rank_grade_points[g.rank_grade] / rankMax : null;
    const ach = g.achievement && rule.achievement_points?.[g.achievement];
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
    rows.push({ g, ratio });
  }
  const sorted = rows.sort((a, b) => b.ratio - a.ratio || b.g.credits - a.g.credits || a.g.id.localeCompare(b.g.id));
  const counts = new Map<string, number>();
  const chosen = sorted.filter((r, i) => {
    if (rule.selection.mode === 'top_n_total') return i < rule.selection.n!;
    if (rule.selection.mode === 'top_n_per_group') {
      const n = counts.get(r.g.subject_group) ?? 0; counts.set(r.g.subject_group, n + 1); return n < rule.selection.n!;
    }
    return true;
  });
  if (!chosen.length) return pending('반영할 과목이 없어요.', trace);
  const weight = (g: GradeRecord) => rule.credit_weighted ? g.credits : 1;
  const mean = (items: typeof chosen) => items.reduce((n, r) => n + r.ratio * weight(r.g), 0) / items.reduce((n, r) => n + weight(r.g), 0);
  let ratio = mean(chosen);
  if (rule.year_weights) {
    ratio = 0;
    for (const [year, w] of Object.entries(rule.year_weights)) {
      if (!w) continue;
      const items = chosen.filter(r => r.g.semester[0] === year);
      if (!items.length) return pending(`${year}학년 반영 과목이 필요해요.`, trace);
      ratio += mean(items) * w;
      trace.push({ rule: rule.id, detail: `${year}학년 점수 비율 × 가중치 ${w}`, value: mean(items) * w });
    }
  }
  for (const { g, ratio: subjectRatio } of chosen) trace.push({ rule: rule.id, detail: `${g.semester} ${g.name} · 점수 비율 × 가중 ${weight(g)}`, value: subjectRatio, subject_id: g.id });
  bonus = Math.min(bonus, rule.bonus?.max ?? 0);
  const grade = Math.min(rule.grade_max_score, rule.base_score + ratio * (rule.grade_max_score - rule.base_score) + bonus);
  let attendanceScore = 0, deduction = 0;
  if (rule.attendance_rule) {
    const a = rule.attendance_rule;
    const records = attendance.filter(r => a.years.includes(r.year));
    if (new Set(records.map(r => r.year)).size !== records.length) return invalid('학년별 출결이 중복됐어요.');
    if (records.length !== a.years.length || records.some(r => !r.school_days)) return pending('반영 학년의 출결을 입력해 주세요.', trace);
    if (records.some(r => validateAttendance(r).length)) return invalid('출결 입력을 확인해 주세요.');
    const absence = records.reduce((n, r) => n + r.absence.unexcused, 0);
    const tardy = records.reduce((n, r) => n + r.tardy.unexcused + r.early_leave.unexcused + r.class_absence.unexcused, 0);
    const equivalent = absence + Math.floor(tardy / a.tardy_to_absence);
    const band = a.deduction_table.find(d => equivalent <= d.absence_max);
    if (!band) return pending('해당 결석일수의 출결 감점 구간이 필요해요.', trace);
    deduction = band.points; attendanceScore = a.max_score - deduction;
    trace.push({ rule: rule.id, detail: `미인정 결석 ${absence} + 지각·조퇴·결과 ${tardy} ÷ ${a.tardy_to_absence}의 정수 부분`, value: equivalent },
      { rule: rule.id, detail: `출결 만점 ${a.max_score} − 감점 ${deduction}`, value: attendanceScore });
  }
  const scale = 10 ** rule.rounding.digits;
  const unrounded = grade + attendanceScore;
  const total = Math[rule.rounding.mode](Number((unrounded * scale).toPrecision(15))) / scale;
  trace.push({ rule: rule.id, detail: '교과 환산(중간 반올림 없음)', value: grade },
    { rule: rule.id, detail: `교과 + 출결 · 최종 ${rule.rounding.digits}자리 ${rule.rounding.mode}`, value: total });
  const ranked = chosen.filter(r => r.g.rank_grade !== null);
  return ready({ grade, attendance: attendanceScore, bonus, total, max: rule.max_score, selected_ids: chosen.map(r => r.g.id),
    average_rank: ranked.length ? ranked.reduce((n, r) => n + r.g.rank_grade! * weight(r.g), 0) / ranked.reduce((n, r) => n + weight(r.g), 0) : null,
    attendance_deduction: deduction }, trace);
}
