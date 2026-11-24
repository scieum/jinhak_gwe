import { CLASS_CODE, ExchangeError, normalizeNumber, readExchange } from '../io/exchange';

/** 학급 데이터(교사 기기 안). 학생은 번호·별칭만(R-PRIV-003). */
export interface ClassInfo { key: 'class'; name: string; code: string; created_at: string }
/** track = 계열, major = 희망 전공(있을 때만 학생 기록 머리에 보여요). */
export interface Student { number: string; alias: string; locked?: boolean; track?: string; major?: string }
export interface CardSlot { priority?: number; university: string; program?: string; department?: string; exam_kind?: string; exam_date?: string | null; csat?: string; memo?: string; judgment?: string | null }
export interface CounselPayload { scenario: string; slots: CardSlot[]; exempt: CardSlot[]; warnings: { code: string; title: string; message: string }[] }
export interface CardRecord { id?: number; number: string; created_at: string; received_at: string; seen: boolean; card: CounselPayload }

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const newClassCode = () => Array.from(crypto.getRandomValues(new Uint8Array(4)), b => CODE_CHARS[b % CODE_CHARS.length]).join('');
export const studentLabel = (s: Pick<Student, 'number' | 'alias'>) => `${s.number} · ${s.alias}`;

/** "7 하늘" / "07,하늘" / "07\t하늘" 한 줄에 한 명. */
export function parseRoster(text: string): Student[] {
  const out: Student[] = [];
  text.split(/\r?\n/).map(l => l.trim()).filter(Boolean).forEach((line, i) => {
    const [n, ...rest] = line.split(/[\s,\t]+/), number = normalizeNumber(n), alias = rest.join(' ').trim();
    if (!number) throw new Error(`${i + 1}번째 줄: 번호는 1~99 숫자로 적어 주세요.`);
    if (!alias || alias.length > 10) throw new Error(`${i + 1}번째 줄: 별칭을 1~10자로 적어 주세요. 실명 대신 별칭을 써요.`);
    if (out.some(s => s.number === number)) throw new Error(`${number}번이 두 번 있어요.`);
    out.push({ number, alias });
  });
  if (!out.length) throw new Error('명단을 한 줄 이상 적어 주세요.');
  return out;
}

const text = (v: unknown, max = 200) => typeof v === 'string' && v.length <= max;
function parseSlot(v: unknown): CardSlot {
  const s = v as CardSlot;
  if (!s || !text(s.university, 60) || !s.university) throw new Error();
  return { priority: s.priority, university: s.university, program: text(s.program) ? s.program : '', department: text(s.department) ? s.department : '',
    exam_kind: text(s.exam_kind, 10) ? s.exam_kind : '', exam_date: text(s.exam_date, 10) ? s.exam_date : null, csat: text(s.csat, 10) ? s.csat : '', memo: text(s.memo) ? s.memo : '',
    judgment: text(s.judgment, 10) ? s.judgment : null };
}
export function parseCounselPayload(v: unknown): CounselPayload {
  const p = v as CounselPayload;
  if (!p || !text(p.scenario, 20) || !Array.isArray(p.slots) || p.slots.length > 6 || !Array.isArray(p.exempt) || p.exempt.length > 20 || !Array.isArray(p.warnings)) throw new Error();
  return { scenario: p.scenario, slots: p.slots.map(parseSlot), exempt: p.exempt.map(parseSlot),
    warnings: p.warnings.filter(w => w && text(w.message) && text(w.title, 60)).slice(0, 10).map(w => ({ code: String(w.code), title: w.title, message: w.message })) };
}

export type ReceiveStatus = 'ok' | 'new' | 'skip' | 'error';
export interface Received { file: string; number: string | null; status: ReceiveStatus; reason: string; record?: CardRecord }
export interface ReceiveContext { code: string; students: readonly Student[]; latest: (number: string) => CardRecord | undefined }

/** card-collect 02-spec 5장 ST4: 오류마다 이유 + 고치는 법. */
export async function receiveCard(file: string, content: string, ctx: ReceiveContext, now = new Date()): Promise<Received> {
  const fail = (reason: string, number: string | null = null): Received => ({ file, number, status: 'error', reason });
  if (!file.toLowerCase().endsWith('.jnavi')) return fail("상담카드 파일(.jnavi)이 아니에요. 학생이 수시로에서 '파일로 저장'한 파일을 넣어 주세요.");
  const broken = '파일이 깨져서 읽을 수 없어요. 학생에게 다시 저장해서 보내 달라고 해 주세요.';
  let e;
  try { e = await readExchange(content); } catch (x) { return fail(x instanceof ExchangeError && x.code === 'not-jnavi' ? "상담카드 파일(.jnavi)이 아니에요. 학생이 수시로에서 '파일로 저장'한 파일을 넣어 주세요." : broken); }
  if (e.kind === 'mock_score') return fail('모의고사 파일이에요. 모의고사 수합에서 받아 주세요.', e.number);
  if (e.kind !== 'counsel_card') return fail("상담카드 파일이 아니에요. 학생이 수시로에서 '파일로 저장'한 파일을 넣어 주세요.");
  if (e.class_code !== ctx.code) return fail(`학급 코드가 우리 반(${ctx.code})과 달라요. 학생에게 ${ctx.code}로 다시 보내 달라고 해 주세요.`, e.number);
  const student = ctx.students.find(s => s.number === e.number);
  if (!student) return fail(`우리 반 명단에 ${e.number}번이 없어요. 우리 반 홈에서 명단을 확인해 주세요.`, e.number);
  let card: CounselPayload;
  try { card = parseCounselPayload(e.payload); } catch { return fail(broken, e.number); }
  if (student.locked) return fail(`${studentLabel(student)} 카드는 확정 잠금이에요. 학생 상담 화면에서 잠금을 풀면 새 버전으로 바꿀 수 있어요.`, e.number);
  const latest = ctx.latest(e.number);
  if (latest && latest.created_at >= e.created_at) return { file, number: e.number, status: 'skip', reason: latest.created_at === e.created_at ? '이미 받은 카드예요. 건너뛸게요.' : '이미 받은 카드보다 예전 버전이에요. 건너뛸게요.' };
  return { file, number: e.number, status: latest ? 'new' : 'ok', reason: '', record: { number: e.number, created_at: e.created_at, received_at: now.toISOString(), seen: false, card } };
}

/** 여러 파일을 한 번에: 같은 학생 카드가 둘이면 새 것만 받아요. */
export async function receiveCards(files: readonly { name: string; text: string }[], ctx: ReceiveContext, now = new Date()): Promise<Received[]> {
  const taken = new Map<string, CardRecord>();
  const out: Received[] = [];
  for (const f of files) {
    const r = await receiveCard(f.name, f.text, { ...ctx, latest: n => taken.get(n) ?? ctx.latest(n) }, now);
    if (r.record) {
      const prev = out.find(o => o.record && o.number === r.number);
      if (prev) { prev.status = 'skip'; prev.reason = '같은 학생의 더 새 카드가 있어서 건너뛸게요.'; prev.record = undefined; r.status = ctx.latest(r.number!) ? 'new' : 'ok'; }
      taken.set(r.number!, r.record);
    }
    out.push(r);
  }
  return out.sort((a, b) => Number(b.status === 'error') - Number(a.status === 'error'));
}

export type Submission = '미제출' | '제출' | '새 버전' | '확정';
export interface SubmissionRow { student: Student; latest?: CardRecord; versions: number; status: Submission; warnings: number }
const STATUS_ORDER: Record<Submission, number> = { '새 버전': 0, 제출: 1, 확정: 2, 미제출: 3 };
/** 경고 많은 순 → 새 버전·제출·확정 → 번호. 미제출은 맨 아래(PRD 6-10). */
export function submissionRows(students: readonly Student[], cards: readonly CardRecord[]): SubmissionRow[] {
  return students.map(student => {
    const mine = cards.filter(c => c.number === student.number).sort((a, b) => b.created_at.localeCompare(a.created_at)), latest = mine[0];
    const status: Submission = !latest ? '미제출' : student.locked ? '확정' : mine.length > 1 && !latest.seen ? '새 버전' : '제출';
    return { student, latest, versions: mine.length, status, warnings: latest?.card.warnings.length ?? 0 };
  }).sort((a, b) => Number(a.status === '미제출') - Number(b.status === '미제출') || b.warnings - a.warnings || STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || a.student.number.localeCompare(b.student.number));
}

export function checkClass(name: string, code: string) {
  if (!name.trim() || name.trim().length > 20) throw new Error('반 이름을 1~20자로 적어 주세요. 예: 3학년 2반');
  if (!CLASS_CODE.test(code)) throw new Error('학급 코드가 올바르지 않아요.');
}

export const MEMO_AREAS = ['진로', '성적', '수시로', '생활'] as const;
export type MemoArea = typeof MEMO_AREAS[number];
export interface Memo { id?: number; number: string; date: string; area: MemoArea; text: string; next: string; next_done: boolean; created_at: string; edited?: boolean }
/** "11-25까지 · …"처럼 앞에 날짜를 쓰면 기한으로 읽어요(counsel 02-spec M4-4). */
export function nextDue(next: string, year: number): string | null {
  const m = next.match(/^\s*(\d{1,2})[-./](\d{1,2})/);
  if (!m) return null;
  const mm = Number(m[1]), dd = Number(m[2]);
  return mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31 ? `${year}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}` : null;
}
export function nextState(memo: Memo, today: string): '대기' | '완료' | '기한 지남' | null {
  if (!memo.next.trim()) return null;
  if (memo.next_done) return '완료';
  const due = nextDue(memo.next, Number(memo.date.slice(0, 4)));
  return due && due < today ? '기한 지남' : '대기';
}

/** 누가기록 화면은 2026-11-23 사용자 결정으로 뺐어요. 기기에 남은 기록과 백업 파일 형식을 깨지 않으려고 타입만 남겨요. */
export const LOG_AREAS = ['자율·자치', '진로'] as const;
export type LogArea = typeof LOG_AREAS[number];
export interface HomeroomLog { id?: number; date: string; area: LogArea; text: string; numbers: string[]; created_at: string }
