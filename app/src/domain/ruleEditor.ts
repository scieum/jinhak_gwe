import { scoreUniversity, validateScoringRule, type AdvancedRule, type RuleBucket, type ScoringRule } from '../engine/scoring';
import { isSampleId } from '../data/sample/rows';
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
  /** 샘플 모드 예시(검수 기록 예시, 실제 승인 아님). 배포 파일 · 규칙 기록 내보내기에서 빠져요. */
  sample?: true;
  /** 모집요강에서 자동으로 뽑은 초안이면 true — 편집기에 'AI 초안 · 참고용'을 붙여요(원문 대조 전). */
  ai_draft?: true;
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
  // 계열별 규칙이면 모든 계열의 교과를 넣어 두고, 테스트는 첫 계열(testDepartment)로 계산해요
  const groups = [...new Set([...rule.subject_groups, ...(rule.advanced?.tracks ?? []).flatMap(x => x.subject_groups ?? [])])];
  const grades = rule.semesters.flatMap(sem => groups.map((group): GradeRecord => {
    const y = t.years[sem[0] as '1' | '2' | '3'];
    return { id: `${sem}-${group}`, semester: sem, name: `${group} 과목`, subject_group: group, type: '일반선택', credits: 4, rank_grade: y.grade, achievement: y.achievement, is_joint: false, division: 'unknown' };
  }));
  const attendance = ([1, 2, 3] as const).map(year => { const a = emptyAttendance(year); a.school_days = 190;
    if (year === 1) { a.absence.unexcused = t.absence; a.tardy.unexcused = t.tardy; } return a; });
  return { grades, attendance };
}
/** shortcut: 계열별 규칙은 첫 계열만 테스트해요 — 계열마다 테스트가 필요해지면 TestCase에 학과를 더해요. */
export const testDepartment = (rule: ScoringRule) => rule.advanced?.tracks?.[0]?.units.find(u => u !== '*') ?? (rule.advanced?.tracks ? '*' : undefined);
export interface TestRun { ok: boolean; actual: number | null; reason: string; trace: { detail: string; value?: number }[] }
/** 테스트는 검수 전 규칙을 일부러 계산해 봐요(학생 화면이 아니라 검수 도구라서). */
export function runTest(rule: ScoringRule, t: TestCase): TestRun {
  const { grades, attendance } = testInputs(rule, t);
  const r = scoreUniversity(grades, attendance, { ...rule, review_status: 'verified' }, testDepartment(rule));
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
/** 변경 전·후 비교 표(15개 항목). */
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
    ['추가 규칙', r.advanced ? advancedText(r.advanced) : '없음'],
  ];
}
const bucketText = (b: RuleBucket) => `${b.name ? `${b.name}: ` : ''}${b.years ? `${b.years.join('·')}학년 ` : ''}${b.groups.join('·')} ${b.n === undefined ? '전 과목' : `상위 ${b.n}`}${b.fill ? `(모자라면 ${b.fill.grade}등급 ${b.fill.credits}학점으로 채움)` : ''}`;
const weightText = (w: Record<string, number>) => Object.entries(w).map(([k, v]) => `${k} ${Math.round(v * 1000) / 10}%`).join(' · ');
/** 추가 규칙을 검수자가 읽을 문장으로(편집기에서는 읽기만 해요 — 고칠 때는 초안 파일을 고쳐 '규칙 기록 합치기'). */
export function advancedText(v: AdvancedRule): string {
  const use = { rank: '석차등급', achievement: '성취도', max: '석차등급·성취도 중 높은 값', exclude: '빼요' };
  return [
    v.tracks && `계열별: ${v.tracks.map(x => `${x.name}(${x.units.join('·')}) ${[x.subject_groups?.join('·'), x.buckets?.map(bucketText).join(' + '), x.group_weights && weightText(x.group_weights), x.top_groups && `상위 ${x.top_groups}개 교과`, x.rank_grade_points && `등급 점수 ${pts(x.rank_grade_points)}`, x.achievement_points && `성취도 점수 ${pts(x.achievement_points)}`].filter(Boolean).join(' / ')}`).join(' ; ')}`,
    v.group_alias && `교과 바꿔 읽기: ${Object.entries(v.group_alias).map(([a, b]) => `${a} → ${b}`).join(' · ')}`,
    v.subject_weights && `교과별 배율(학점에 곱함): ${Object.entries(v.subject_weights).map(([k, w]) => `${k} ×${w}`).join(' · ')}`,
    v.mean_rounding && `평균 점수 ${v.mean_rounding.digits}자리 ${{ round: '반올림', floor: '버림', ceil: '올림' }[v.mean_rounding.mode]}`,
    v.buckets && `과목 묶음: ${v.buckets.map(bucketText).join(' + ')}`,
    v.top_groups && `상위 ${v.top_groups}개 교과의 전 과목`,
    v.group_weights && `교과별 비율: ${weightText(v.group_weights)}`,
    v.type_rules && `과목 유형: ${v.type_rules.map(x => `${x.types.join('·')}${x.groups ? `(${x.groups.join('·')})` : ''} ${use[x.use]}${x.limit ? ` 상위 ${x.limit}과목${x.beyond === 'rank' ? '(나머지는 석차등급)' : ''}` : ''}`).join(' · ')}`,
    v.average_table && `평균등급(${v.average_table.digits}자리 ${{ round: '반올림', floor: '버림', ceil: '올림' }[v.average_table.mode]}) → ${v.average_table.steps.map(s => `${s.upto} 이하 ${s.score}`).join(' · ')}`,
    v.credits && `이수학점: ${[v.credits.tiers?.map(x => `${x.min} 이상 ×${x.factor}`).join(' · '), v.credits.shortfall && `${v.credits.shortfall.below} 이하 ×(${v.credits.shortfall.base} − 부족학점×${v.credits.shortfall.per_credit})`, v.credits.per_credit_bonus && `학점당 +${v.credits.per_credit_bonus}`, v.credits.bonus_at && `${v.credits.bonus_at.min} 이상 +${v.credits.bonus_at.points}`, v.credits.bonus_tiers?.map(x => `${x.min} 이상 +${x.points}`).join(' · '), v.credits.cap && `상한 ${v.credits.cap}`, v.credits.count && { scope: '반영 교과 전 과목', ranked: '석차등급 과목', chosen: '고른 과목' }[v.credits.count] + ' 학점', v.credits.apply_to === 'total' && '교과+출결에 적용'].filter(Boolean).join(' · ')}`,
    v.attendance && `출결: ${[v.attendance.per_day !== undefined && `결석 1일당 −${v.attendance.per_day}`, v.attendance.perfect_bonus && `${v.attendance.perfect_bonus.years.join('·')}학년 개근 +${v.attendance.perfect_bonus.points}${v.attendance.perfect_bonus.cap !== undefined ? `(최대 ${v.attendance.perfect_bonus.cap})` : ''}`, v.attendance.from_total && '총점에서 감점'].filter(Boolean).join(' · ')}`,
  ].filter(Boolean).join(' / ');
}
export function diffRules(before: ScoringRule | null, after: ScoringRule) {
  const b = before ? ruleItems(before) : null;
  return ruleItems(after).map(([label, value], i) => ({ label, before: b ? b[i][1] : '–', after: value, changed: !b || b[i][1] !== value }));
}

/** 샘플 규칙: 표식(sample)이 떨어져도 id(SAMPLE_PREFIX)로 거르는 기존 방식과 같아요(백업 · 배포 · 기록 내보내기 공통). */
export const isSample = (d: Pick<RuleDraft, 'id' | 'sample'>) => !!d.sample || isSampleId(d.id);
/** 배포 파일: 검수 완료 규칙만(같은 대학·전형·연도는 최신 버전 하나). */
export function releaseRules(drafts: readonly RuleDraft[], now = new Date()) {
  const latest = new Map<string, ScoringRule>();
  for (const d of drafts.filter(x => x.status === '검수 완료' && !isSample(x))) {
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
