export const stepStates = { pending: '확인 전', progress: '진행 중', done: '완료', na: '해당 없음' } as const;
export const eligibilityStates = { unknown: '확인 필요', met: '충족으로 확인', unmet: '미충족으로 확인', na: '해당 없음' } as const;
export interface ChecklistStep { id: string; title: string; status: keyof typeof stepStates; due_at: string | null; note: string; source_url: string; checked_at: string | null }
export interface EligibilityItem { id: string; title: string; status: keyof typeof eligibilityStates; note: string; source_url: string; checked_at: string | null }
export interface PlanSourceSelection { package_id: string; program_id: string; unit_id: string; round: string; source_sha256: string }
export interface ApplicationPlan {
  id: string; year: number; university: string; program: string; department: string; source_url: string;
  steps: ChecklistStep[]; eligibility: EligibilityItem[]; created_at: string; updated_at: string;
  source_selection?: PlanSourceSelection;
}
export interface CounselTask { id: string; application_id: string | null; kind: 'question' | 'action'; title: string; note: string; session_date: string | null; due_date: string | null; done: boolean; completed_at: string | null; created_at: string; updated_at: string }
export interface PlannerData { applications: ApplicationPlan[]; tasks: CounselTask[] }
export const emptyPlanner = (): PlannerData => ({ applications: [], tasks: [] });
export function sameApplication(a: Pick<ApplicationPlan, 'year' | 'university' | 'program' | 'department' | 'source_selection'>, b: Pick<ApplicationPlan, 'year' | 'university' | 'program' | 'department' | 'source_selection'>) {
  return a.year === b.year && a.university.trim() === b.university.trim()
    && a.program.trim() === b.program.trim() && a.department.trim() === b.department.trim()
    && (!a.source_selection || !b.source_selection || ['package_id', 'program_id', 'unit_id', 'round'].every(k => a.source_selection![k as keyof PlanSourceSelection] === b.source_selection![k as keyof PlanSourceSelection]));
}
export function applicationIdentityChanged(a: ApplicationPlan, b: ApplicationPlan) {
  return ['year', 'university', 'program', 'department'].some(k => a[k as keyof ApplicationPlan] !== b[k as keyof ApplicationPlan])
    || (['package_id', 'program_id', 'unit_id', 'round', 'source_sha256'] as const).some(k => a.source_selection?.[k] !== b.source_selection?.[k]);
}
export function newApplication(year = 2028): ApplicationPlan {
  const now = new Date().toISOString();
  return { id: crypto.randomUUID(), year, university: '', program: '', department: '', source_url: '', created_at: now, updated_at: now,
    steps: ['원서 작성', '전형료 결제', '접수 완료 확인', '제출서류 준비·제출', '서류 도착 확인'].map(title => ({ id: crypto.randomUUID(), title, status: 'pending', due_at: null, note: '', source_url: '', checked_at: null })),
    eligibility: ['전형별 지원 자격', '졸업연도·재학 조건', '지역·학교 조건', '학교장추천 필요 여부'].map(title => ({ id: crypto.randomUUID(), title, status: 'unknown', note: '', source_url: '', checked_at: null })) };
}
export function newCounselTask(application_id: string | null = null): CounselTask {
  const now = new Date().toISOString();
  return { id: crypto.randomUUID(), application_id, kind: 'action', title: '', note: '', session_date: null, due_date: null, done: false, completed_at: null, created_at: now, updated_at: now };
}
export function safeSourceUrl(value: string) {
  if (!value) return true;
  try { const u = new URL(value); return u.protocol === 'https:' && !u.username && !u.password; } catch { return false; }
}
export function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === value;
}
export function validDeadline(value: string) {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value) && validDate(value.slice(0, 10)) && Number(value.slice(11, 13)) < 24 && Number(value.slice(14, 16)) < 60;
}
export const seoulDate = (now = new Date()) => new Date(now.getTime() + 9 * 3600000).toISOString().slice(0, 10);
export function stepDeadline(step: ChecklistStep, now = new Date()) {
  if (step.status === 'done' || step.status === 'na') return '처리 완료';
  if (!step.due_at) return '마감 미정';
  if (new Date(`${step.due_at}:00+09:00`).getTime() < now.getTime()) return '기한 지남';
  return step.due_at.slice(0, 10) === seoulDate(now) ? '오늘 마감' : '예정';
}
export function taskDeadline(task: CounselTask, now = new Date()) {
  if (task.done) return '완료';
  if (!task.due_date) return '기한 없음';
  return task.due_date < seoulDate(now) ? '기한 지남' : task.due_date === seoulDate(now) ? '오늘까지' : '예정';
}
export function eligibilitySummary(items: EligibilityItem[]) {
  if (!items.length) return '확인 항목 없음';
  if (items.some(i => i.status === 'unmet')) return '미충족 기록 있음';
  if (items.some(i => i.status === 'unknown')) return '확인 필요';
  return '확인 기록 완료';
}
const text = (v: unknown, max = 2000): v is string => typeof v === 'string' && v.length <= max;
const required = (v: unknown, max = 200): v is string => text(v, max) && !!v.trim();
const timestamp = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v) && Number.isFinite(Date.parse(v));
const optionalDate = (v: unknown) => v === null || typeof v === 'string' && validDate(v);
const uniqueIds = (items: { id: string }[]) => new Set(items.map(i => i.id)).size === items.length;
export function parsePlannerData(value: unknown): PlannerData {
  const fail = (): never => { throw new Error('준비 기록의 항목·날짜·링크를 확인해 주세요. 링크는 https:// 주소를 사용해 주세요.'); };
  if (!value || typeof value !== 'object') return fail();
  const p = value as PlannerData;
  if (!Array.isArray(p.applications) || !Array.isArray(p.tasks) || p.applications.length > 100 || p.tasks.length > 1000) return fail();
  for (const a of p.applications) {
    if (!a || !required(a.id) || !Number.isInteger(a.year) || a.year < 2020 || a.year > 2100 || !required(a.university) || !required(a.program) || !text(a.department, 200)
      || !text(a.source_url) || !safeSourceUrl(a.source_url) || !timestamp(a.created_at) || !timestamp(a.updated_at)
      || !Array.isArray(a.steps) || !Array.isArray(a.eligibility) || a.steps.length > 50 || a.eligibility.length > 50) return fail();
    if (a.source_selection !== undefined) {
      const s = a.source_selection;
      if (!s || typeof s !== 'object' || Array.isArray(s) || !/^plan-(?:\d{7}|[a-f0-9]{12})$/.test(s.package_id)
        || !required(s.program_id) || !required(s.unit_id) || !required(s.round) || typeof s.source_sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(s.source_sha256)) return fail();
    }
    for (const s of a.steps) if (!s || !required(s.id) || !required(s.title) || !Object.hasOwn(stepStates, s.status)
      || !(s.due_at === null || typeof s.due_at === 'string' && validDeadline(s.due_at)) || !text(s.note) || !text(s.source_url) || !safeSourceUrl(s.source_url)
      || !(s.checked_at === null || timestamp(s.checked_at)) || (s.status === 'pending' ? s.checked_at !== null : s.checked_at === null)) return fail();
    for (const e of a.eligibility) if (!e || !required(e.id) || !required(e.title) || !Object.hasOwn(eligibilityStates, e.status) || !text(e.note) || !text(e.source_url) || !safeSourceUrl(e.source_url)
      || !(e.checked_at === null || timestamp(e.checked_at)) || (e.status === 'unknown' ? e.checked_at !== null : e.checked_at === null)) return fail();
    if (!uniqueIds(a.steps) || !uniqueIds(a.eligibility)) return fail();
  }
  for (const t of p.tasks) if (!t || !required(t.id) || !required(t.title) || !['question', 'action'].includes(t.kind) || !text(t.note)
    || !(t.application_id === null || p.applications.some(a => a.id === t.application_id)) || !optionalDate(t.session_date) || !optionalDate(t.due_date)
    || typeof t.done !== 'boolean' || !timestamp(t.created_at) || !timestamp(t.updated_at) || (t.done ? !timestamp(t.completed_at) : t.completed_at !== null)) return fail();
  if (!uniqueIds(p.applications) || !uniqueIds(p.tasks)) return fail();
  return { applications: p.applications.map(a => ({ id: a.id, year: a.year, university: a.university.trim(), program: a.program.trim(), department: a.department.trim(), source_url: a.source_url,
    created_at: a.created_at, updated_at: a.updated_at,
    ...(a.source_selection ? { source_selection: { package_id: a.source_selection.package_id, program_id: a.source_selection.program_id,
      unit_id: a.source_selection.unit_id, round: a.source_selection.round, source_sha256: a.source_selection.source_sha256 } } : {}),
    steps: a.steps.map(s => ({ id: s.id, title: s.title.trim(), status: s.status, due_at: s.due_at, note: s.note, source_url: s.source_url, checked_at: s.checked_at })),
    eligibility: a.eligibility.map(e => ({ id: e.id, title: e.title.trim(), status: e.status, note: e.note, source_url: e.source_url, checked_at: e.checked_at })) })),
    tasks: p.tasks.map(t => ({ id: t.id, application_id: t.application_id, kind: t.kind, title: t.title.trim(), note: t.note, session_date: t.session_date, due_date: t.due_date,
      done: t.done, completed_at: t.completed_at, created_at: t.created_at, updated_at: t.updated_at })) };
}
/** Changing a program identity invalidates confirmations, deadlines and evidence from the old program. */
export function updateApplicationIdentity(previous: ApplicationPlan, next: ApplicationPlan): ApplicationPlan {
  const changed = applicationIdentityChanged(previous, next);
  return { ...next, updated_at: new Date().toISOString(), ...(changed ? {
    steps: next.steps.map(s => ({ ...s, status: 'pending' as const, checked_at: null, due_at: null, source_url: '', note: '' })),
    eligibility: next.eligibility.map(e => ({ ...e, status: 'unknown' as const, checked_at: null, source_url: '', note: '' })),
  } : {}) };
}
