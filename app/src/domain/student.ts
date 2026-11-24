import { parseBoards, type Board } from './board';
import { parseMocks, type MockScore } from './mock';
import { parseInterests, type Interest } from './interests';
import type { SubjectGrade } from '../engine/types';
import { parsePlannerData, type PlannerData } from './planner';

export const semesters = ['1-1', '1-2', '2-1', '2-2', '3-1', '3-2'] as const;
export type Semester = typeof semesters[number];
export const subjectTypes = ['공통', '일반선택', '진로선택', '융합선택', '체육예술', '과탐실험', '교양'] as const;
export type SubjectType = typeof subjectTypes[number];
export interface GradeRecord extends SubjectGrade {
  semester: Semester;
  name: string;
  type: SubjectType;
  subject_mean?: number;
  achievement?: 'A' | 'B' | 'C' | 'D' | 'E' | 'P' | 'F';
  is_joint: boolean;
}
export const attendanceKinds = ['absence', 'tardy', 'early_leave', 'class_absence'] as const;
export const attendanceReasons = ['illness', 'unexcused', 'other'] as const;
export interface AttendanceRecord {
  year: 1 | 2 | 3;
  school_days: number;
  absence: Record<typeof attendanceReasons[number], number>;
  tardy: Record<typeof attendanceReasons[number], number>;
  early_leave: Record<typeof attendanceReasons[number], number>;
  class_absence: Record<typeof attendanceReasons[number], number>;
}
export const emptyAttendance = (year: 1 | 2 | 3): AttendanceRecord => ({ year, school_days: 0,
  absence: { illness: 0, unexcused: 0, other: 0 }, tardy: { illness: 0, unexcused: 0, other: 0 },
  early_leave: { illness: 0, unexcused: 0, other: 0 }, class_absence: { illness: 0, unexcused: 0, other: 0 } });
export function hasRank(s: Pick<GradeRecord, 'type' | 'subject_group'> & Partial<Pick<GradeRecord, 'is_joint'>>) {
  return !s.is_joint && !['체육예술', '과탐실험', '교양'].includes(s.type)
    && !(s.type === '융합선택' && ['사회', '과학'].includes(s.subject_group));
}
export const hasScores = (s: Pick<GradeRecord, 'type'>) => !['체육예술', '과탐실험', '교양'].includes(s.type);
export function newGrade(semester: Semester): GradeRecord {
  return { id: crypto.randomUUID(), semester, name: '', subject_group: '국어', type: '일반선택', credits: 1,
    rank_grade: null, is_joint: false, division: 'unknown' };
}
export function validateGrade(s: GradeRecord): string[] {
  const errors: string[] = [];
  const bounded = (n: number, low: number, high: number) => Number.isFinite(n) && n >= low && n <= high;
  if (!s.name.trim() || !s.subject_group.trim()) errors.push('과목명과 교과를 입력해 주세요.');
  if (!semesters.includes(s.semester) || !subjectTypes.includes(s.type)) errors.push('학기와 과목 유형을 확인해 주세요.');
  if (!Number.isInteger(s.credits) || s.credits < 1 || s.credits > 30) errors.push('학점은 1~30의 정수로 입력해 주세요.');
  if (hasRank(s)) {
    const optional = s.enrolled_count !== undefined && s.enrolled_count <= 5 && s.rank_grade === null;
    if (!optional && (s.rank_grade === null || !Number.isInteger(s.rank_grade) || !bounded(s.rank_grade, 1, 5))) errors.push('석차등급은 1~5로 입력해 주세요.');
  } else if (s.rank_grade !== null) errors.push('석차등급 미산출 과목에는 등급을 입력할 수 없어요.');
  for (const [label, value] of [['원점수', s.raw_score], ['과목평균', s.subject_mean]] as const)
    if (value !== undefined && !bounded(value, 0, 100)) errors.push(`${label}는 0~100으로 입력해 주세요.`);
  if (s.enrolled_count !== undefined && (!Number.isSafeInteger(s.enrolled_count) || s.enrolled_count < 1)) errors.push('수강자수는 1명 이상으로 입력해 주세요.');
  if (s.achievement && !(s.type === '교양' ? ['P', 'F'] : hasScores(s) ? ['A', 'B', 'C', 'D', 'E'] : ['A', 'B', 'C']).includes(s.achievement)) errors.push('과목 유형에 맞는 성취도를 선택해 주세요.');
  if (!hasScores(s) && [s.raw_score, s.subject_mean, s.enrolled_count, s.achievement_distribution].some(v => v !== undefined)) errors.push('이 과목 유형에는 원점수·분포비율·수강자수를 입력하지 않아요.');
  if (s.achievement_distribution) {
    const d = s.achievement_distribution;
    if (d.length !== 5 || d.some(n => !bounded(n, 0, 100)) || Math.abs(d.reduce((a, b) => a + b, 0) - 100) > 0.100000001)
      errors.push('분포비율 합은 100%(±0.1)여야 해요.');
  }
  return errors;
}
export function validateAttendance(a: AttendanceRecord): string[] {
  const values = [a.school_days, ...attendanceKinds.flatMap(k => attendanceReasons.map(r => a[k][r]))];
  if (![1, 2, 3].includes(a.year) || values.some(v => !Number.isSafeInteger(v) || v < 0 || v > 366)) return ['출결은 0~366의 정수로 입력해 주세요.'];
  if (Object.values(a.absence).reduce((x, y) => x + y, 0) > a.school_days) return ['결석 합계는 수업일수를 넘을 수 없어요.'];
  return [];
}
export function gradeSummary(grades: readonly GradeRecord[], groups?: readonly string[]) {
  const valid = grades.filter(g => !validateGrade(g).length && (!groups || groups.includes(g.subject_group)));
  const ranked = valid.filter(g => g.rank_grade !== null && (g.enrolled_count === undefined || g.enrolled_count > 5));
  const credits = ranked.reduce((n, g) => n + g.credits, 0);
  return { count: valid.length, credits: valid.reduce((n, g) => n + g.credits, 0), ranked: ranked.length,
    average: credits ? ranked.reduce((n, g) => n + g.credits * g.rank_grade!, 0) / credits : null };
}
export interface StudentBackup { grades: GradeRecord[]; attendance: AttendanceRecord[]; planning?: PlannerData; boards?: Board[]; mocks?: MockScore[]; interests?: Interest[]; targetPriorities?: string[] }

export function parseTargetPriorities(value: unknown, applicationIds: Set<string>): string[] {
  if (!Array.isArray(value) || value.length > 3 || new Set(value).size !== value.length || value.some(id => typeof id !== 'string' || !applicationIds.has(id))) throw new Error('목표 대학 순위와 지원 전형 연결을 확인해 주세요.');
  return [...value];
}

// Backups may contain incomplete drafts. Validate their shape without turning drafts into valid results.
export function parseStudentBackup(value: unknown): StudentBackup {
  const obj = value as StudentBackup;
  if (!obj || !Array.isArray(obj.grades) || obj.grades.length > 1000 || !Array.isArray(obj.attendance) || obj.attendance.length > 3) throw new Error('지원하지 않는 학생 백업 형식이에요.');
  const ids = new Set<string>();
  for (const g of obj.grades) {
    if (!g || typeof g.id !== 'string' || !g.id || ids.has(g.id) || typeof g.name !== 'string' || g.name.length > 200
      || typeof g.subject_group !== 'string' || g.subject_group.length > 100 || !semesters.includes(g.semester)
      || !subjectTypes.includes(g.type) || typeof g.is_joint !== 'boolean' || !Number.isFinite(g.credits)
      || (g.rank_grade !== null && !Number.isFinite(g.rank_grade))
      || [g.raw_score, g.subject_mean, g.enrolled_count].some(v => v !== undefined && !Number.isFinite(v))
      || (g.achievement !== undefined && !['A', 'B', 'C', 'D', 'E', 'P', 'F'].includes(g.achievement))
      || (g.division !== undefined && !['fixed', 'estimated', 'unknown'].includes(g.division))
      || (g.achievement_distribution !== undefined && (!Array.isArray(g.achievement_distribution) || g.achievement_distribution.length !== 5 || !g.achievement_distribution.every(Number.isFinite)))) throw new Error('백업의 과목 데이터가 올바르지 않아요.');
    ids.add(g.id);
  }
  const years = new Set<number>();
  for (const a of obj.attendance) {
    if (!a || ![1, 2, 3].includes(a.year) || years.has(a.year) || !Number.isFinite(a.school_days)
      || attendanceKinds.some(k => !a[k] || attendanceReasons.some(r => !Number.isFinite(a[k][r])))) throw new Error('백업의 출결 데이터가 올바르지 않아요.');
    years.add(a.year);
  }
  // Strip unknown properties; names/identifiers from unrelated documents are not retained.
  const planning = obj.planning !== undefined ? parsePlannerData(obj.planning) : undefined;
  if (obj.boards !== undefined && !planning) throw new Error('지원하지 않는 학생 백업 형식이에요.');
  if (obj.targetPriorities !== undefined && !planning) throw new Error('목표 대학 순위에는 지원 준비 기록이 필요해요.');
  const targetPriorities = obj.targetPriorities !== undefined ? parseTargetPriorities(obj.targetPriorities, new Set(planning!.applications.map(a => a.id))) : undefined;
  return { ...(targetPriorities !== undefined ? { targetPriorities } : {}), ...(obj.interests !== undefined ? { interests: parseInterests(obj.interests) } : {}), ...(obj.mocks !== undefined ? { mocks: parseMocks(obj.mocks) } : {}), ...(planning ? { planning } : {}), ...(obj.boards !== undefined ? { boards: parseBoards(obj.boards, new Set(planning!.applications.map(a => a.id))) } : {}), grades: obj.grades.map(g => ({ id: g.id, name: g.name, semester: g.semester, subject_group: g.subject_group,
    type: g.type, credits: g.credits, rank_grade: g.rank_grade, is_joint: g.is_joint, raw_score: g.raw_score,
    subject_mean: g.subject_mean, achievement: g.achievement, enrolled_count: g.enrolled_count,
    division: g.division, achievement_distribution: g.achievement_distribution })),
  attendance: obj.attendance.map(a => ({ year: a.year, school_days: a.school_days,
    ...Object.fromEntries(attendanceKinds.map(k => [k, Object.fromEntries(attendanceReasons.map(r => [r, a[k][r]]))])) } as AttendanceRecord)) };
}
