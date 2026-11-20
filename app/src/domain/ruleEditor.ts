import { scoreUniversity, validateScoringRule, type ScoringRule } from '../engine/scoring';
import { emptyAttendance, type AttendanceRecord, type GradeRecord, type Semester } from './student';

/**
 * 환산 규칙 편집기·검수(admin-rules 02-spec, PRD 6-11): 편집 → 테스트 케이스 3개 이상 모두 통과 → 검수 요청 → 2인 검수(작성자 ≠ 검수자) → 검수 완료.
 * 검수 완료 전 규칙은 review_status가 draft라 엔진이 계산하지 않아요(NEVER-1).
 */
export type RuleStatus = '작성 중' | '검수 대기' | '검수 완료' | '반려';
export const MIN_TESTS = 3;
export const SEMESTERS: Semester[] = ['1-1', '1-2', '2-1', '2-2', '3-1', '3-2'];
export const GROUPS = ['국어', '수학', '영어', '사회', '과학', '한국사'];
type Ach = 'A' | 'B' | 'C' | 'D' | 'E';
export interface TestCase { id: string; name: string; years: Record<'1' | '2' | '3', { grade: number; achievement: Ach }>; absence: number; tardy: number; expected: number }
export interface RuleDraft {
  id: string; source_page: string; rule: ScoringRule; tests: TestCase[]; status: RuleStatus;
  author: string; reviewer: string | null; reject_reason: string; history: { at: string; who: string; action: string }[]; updated_at: string;
}

export function newRuleDraft(author: string, now = new Date()): RuleDraft {
  const id = crypto.randomUUID();
  return { id, source_page: '', status: '작성 중', author, reviewer: null, reject_reason: '', updated_at: now.toISOString(), tests: [],
    history: [{ at: now.toISOString(), who: author, action: '새 규칙을 만들었어요' }],
    rule: { id, source: '', review_status: 'draft', admission_year: 2028, university: '', program: '', version: 1,
      semesters: ['1-1', '1-2', '2-1', '2-2', '3-1'], subject_groups: ['국어', '수학', '영어', '사회', '과학'], selection: { mode: 'all' }, credit_weighted: true,
      rank_grade_points: { 1: 100, 2: 96, 3: 90, 4: 80, 5: 60 }, achievement_points: { A: 100, B: 95, C: 90, D: 80, E: 60 }, achievement_blend: { mode: 'none' },
      no_rank_subject_policy: 'exclude', joint_curriculum_policy: 'include', grade_max_score: 80, base_score: 0,
      attendance_rule: { years: [1, 2, 3], tardy_to_absence: 3, max_score: 20, deduction_table: [{ absence_max: 0, points: 0 }, { absence_max: 2, points: 1 }, { absence_max: 5, points: 3 }, { absence_max: 365, points: 5 }] },
      max_score: 100, rounding: { digits: 2, mode: 'round' } } };
}
export const newTest = (n: number): TestCase => ({ id: crypto.randomUUID(), name: `학생 ${'ABCDEFGHIJ'[n] ?? n + 1}`, absence: 0, tardy: 0, expected: 0,
  years: { 1: { grade: 2, achievement: 'A' }, 2: { grade: 2, achievement: 'A' }, 3: { grade: 2, achievement: 'A' } } });

/**
 * 가상 학생: 학년마다 반영 교과 과목 하나씩, 같은 등급·성취도, 4학점.
 * shortcut: 과목별로 다른 성적·미산출 과목은 아직 못 넣어요 — 모집요강 예시가 그런 학생이면 과목 단위 입력을 더해요.
 */
export function testInputs(rule: ScoringRule, t: TestCase): { grades: GradeRecord[]; attendance: AttendanceRecord[] } {
  const grades = rule.semesters.flatMap(sem => rule.subject_groups.map((group): GradeRecord => {
    const y = t.years[sem[0] as '1' | '2' | '3'];
    return { id: `${sem}-${group}`, semester: sem, name: `${group} 과목`, subject_group: group, type: '일반선택', credits: 4, rank_grade: y.grade, achievement: y.achievement, is_joint: false, division: 'unknown' };
  }));
  const attendance = ([1, 2, 3] as const).map(year => { const a = emptyAttendance(year); a.school_days = 190;
    if (year === 1) { a.absence.unexcused = t.absence; a.tardy.unexcused = t.tardy; } return a; });
  return { grades, attendance };
}
export interface TestRun { ok: boolean; actual: number | null; reason: string; trace: { detail: string; value?: number }[] }
/** 테스트는 검수 전 규칙을 일부러 계산해 봐요(학생 화면이 아니라 검수 도구라서). */
export function runTest(rule: ScoringRule, t: TestCase): TestRun {
  const { grades, attendance } = testInputs(rule, t);
  const r = scoreUniversity(grades, attendance, { ...rule, review_status: 'verified' });
  if (r.status !== 'ready') return { ok: false, actual: null, reason: r.reason, trace: r.trace };
  return { ok: Math.abs(r.value.total - t.expected) < 1e-9, actual: r.value.total, reason: '', trace: r.trace };
}

export function blockers(d: RuleDraft): string[] {
  const out = validateScoringRule(d.rule);
  if (!d.rule.university.trim() || !d.rule.program.trim()) out.unshift('대학과 전형 이름을 적어 주세요.');
  if (!/^https:\/\//.test(d.rule.source)) out.push('원문(모집요강) https 주소를 적어 주세요.');
  if (d.tests.length < MIN_TESTS) out.push(`테스트 케이스가 ${MIN_TESTS - d.tests.length}개 더 필요해요.`);
  const failed = d.tests.filter(t => !runTest(d.rule, t).ok).length;
  if (failed) out.push(`불통과 테스트가 ${failed}개 있어요.`);
  return out;
}

const stamp = (d: RuleDraft, who: string, action: string, now: Date, patch: Partial<RuleDraft>): RuleDraft =>
  ({ ...d, ...patch, updated_at: now.toISOString(), history: [{ at: now.toISOString(), who, action }, ...d.history] });
export function requestReview(d: RuleDraft, who: string, now = new Date()): RuleDraft {
  if (d.status !== '작성 중' && d.status !== '반려') throw new Error('작성 중이거나 반려된 규칙만 검수를 요청할 수 있어요.');
  const b = blockers(d); if (b.length) throw new Error(b[0]);
  return stamp(d, who, `검수를 요청했어요 · 테스트 ${d.tests.length}/${d.tests.length} 통과`, now, { status: '검수 대기', reject_reason: '' });
}
export function approve(d: RuleDraft, reviewer: string, now = new Date()): RuleDraft {
  if (d.status !== '검수 대기') throw new Error('검수 대기 규칙만 승인할 수 있어요.');
  if (!reviewer.trim() || reviewer.trim() === d.author) throw new Error('작성자가 아닌 다른 관리자가 검수해요.');
  if (blockers(d).length) throw new Error('테스트를 다시 확인해 주세요.');
  return stamp(d, reviewer.trim(), '승인했어요 · 검수 완료', now, { status: '검수 완료', reviewer: reviewer.trim(), rule: { ...d.rule, review_status: 'verified' } });
}
export function reject(d: RuleDraft, reviewer: string, reason: string, now = new Date()): RuleDraft {
  if (d.status !== '검수 대기') throw new Error('검수 대기 규칙만 반려할 수 있어요.');
  if (!reviewer.trim() || reviewer.trim() === d.author) throw new Error('작성자가 아닌 다른 관리자가 검수해요.');
  if (!reason.trim()) throw new Error('반려 사유를 적어야 반려할 수 있어요.');
  return stamp(d, reviewer.trim(), `반려했어요 · ${reason.trim().slice(0, 200)}`, now, { status: '반려', reviewer: reviewer.trim(), reject_reason: reason.trim().slice(0, 200) });
}
/** 검수 완료 규칙을 고치면 새 버전 초안이 돼요(공개 버전은 그대로). */
export function nextVersion(d: RuleDraft, author: string, now = new Date()): RuleDraft {
  const id = crypto.randomUUID();
  return { ...d, id, status: '작성 중', author, reviewer: null, reject_reason: '', updated_at: now.toISOString(),
    history: [{ at: now.toISOString(), who: author, action: `v${d.rule.version}에서 새 수정안을 만들었어요` }], rule: { ...d.rule, id, version: d.rule.version + 1, review_status: 'draft' } };
}

const pts = (p?: Record<string, number>) => p ? Object.entries(p).map(([k, v]) => `${k} ${v}`).join(' · ') : '–';
/** 변경 전·후 비교 표(14개 항목). */
export function ruleItems(r: ScoringRule): [string, string][] {
  const a = r.attendance_rule;
  return [
    ['반영 학기', r.semesters.join(' · ')],
    ['학년 가중', r.year_weights ? Object.entries(r.year_weights).map(([y, w]) => `${y}학년 ${w}`).join(' · ') : '없음'],
    ['반영 교과', r.subject_groups.join(' · ')],
    ['과목 선택', r.selection.mode === 'all' ? '전 과목' : `${r.selection.mode === 'top_n_total' ? '전체' : '교과별'} 상위 ${r.selection.n}개`],
    ['학점 가중', r.credit_weighted ? '예' : '아니요'],
    ['석차등급 점수', pts(r.rank_grade_points)],
    ['성취도 점수', pts(r.achievement_points)],
    ['성취도 병행 반영', r.achievement_blend.mode === 'none' ? '없음' : r.achievement_blend.mode === 'max' ? '등급·성취도 중 높은 값' : `비율 등급 ${Math.round(r.achievement_blend.rank_ratio! * 100)} : 성취도 ${Math.round((1 - r.achievement_blend.rank_ratio!) * 100)}`],
    ['미산출 과목', { exclude: '빼요', achievement_convert: '성취도 환산', bonus: '가산점' }[r.no_rank_subject_policy]],
    ['공동교육과정', r.joint_curriculum_policy === 'include' ? '일반 과목과 같이' : '빼요'],
    ['출결 환산', a ? `미인정 지각·조퇴·결과 ${a.tardy_to_absence}회 = 결석 1일` : '반영 안 함'],
    ['출결 감점', a ? a.deduction_table.map(d => `${d.absence_max}일 이하 −${d.points}`).join(' · ') : '–'],
    ['만점', `교과 ${r.grade_max_score}${a ? ` + 출결 ${a.max_score}` : ''} = ${r.max_score}`],
    ['소수점', `${r.rounding.digits}자리 ${{ round: '반올림', floor: '버림', ceil: '올림' }[r.rounding.mode]}`],
  ];
}
export function diffRules(before: ScoringRule | null, after: ScoringRule) {
  const b = before ? ruleItems(before) : null;
  return ruleItems(after).map(([label, value], i) => ({ label, before: b ? b[i][1] : '–', after: value, changed: !b || b[i][1] !== value }));
}

/** 배포 파일: 검수 완료 규칙만(같은 대학·전형·연도는 최신 버전 하나). */
export function releaseRules(drafts: readonly RuleDraft[], now = new Date()) {
  const latest = new Map<string, ScoringRule>();
  for (const d of drafts.filter(x => x.status === '검수 완료')) {
    const k = `${d.rule.university}|${d.rule.program}|${d.rule.admission_year}`;
    if (!latest.has(k) || latest.get(k)!.version < d.rule.version) latest.set(k, d.rule);
  }
  return { format: 'jinhak-navi-scoring-rules', version: 1, generated_at: now.toISOString(), rules: [...latest.values()] };
}
export const STATUS_ORDER: RuleStatus[] = ['검수 대기', '반려', '작성 중', '검수 완료'];

/** 학생 앱 쪽 파일 경계: 배포 파일을 다시 검사해요. 검수 완료·형식·원문 https가 모두 맞는 규칙만 써요(NEVER-1). */
export function parseRuleRelease(value: unknown): ScoringRule[] {
  const v = value as { format?: unknown; version?: unknown; rules?: unknown };
  if (!v || v.format !== 'jinhak-navi-scoring-rules' || v.version !== 1 || !Array.isArray(v.rules)) return [];
  const seen = new Set<string>();
  return (v.rules as ScoringRule[]).filter(r => {
    try {
      if (!r || r.review_status !== 'verified' || typeof r.university !== 'string' || !r.university.trim() || typeof r.program !== 'string' || !r.program.trim()
        || !Number.isInteger(r.admission_year) || !/^https:\/\//.test(r.source ?? '') || validateScoringRule(r).length) return false;
    } catch { return false; }
    const k = `${r.university}|${r.program}|${r.admission_year}`;
    if (seen.has(k)) return false;
    seen.add(k); return true;
  });
}
