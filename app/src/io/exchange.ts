// PRD 8장 교환 파일 .jnavi (학생 → 교사). 백업과 달리 암호화하지 않고 학급 코드로 묶어요.
export type ExchangeKind = 'counsel_card' | 'mock_score' | 'teacher_reply';
export interface Sender { class_code: string; number: string; alias: string }
export interface Exchange<T = unknown> extends Sender { format: 'jnavi'; version: 1; kind: ExchangeKind; created_at: string; payload: T; checksum: string }

export const CLASS_CODE = /^[A-HJ-NP-Z2-9]{4}$/; // 헷갈리는 I·O·0·1 빼고 4자
export const normalizeNumber = (n: string) => { const v = Number(n.trim()); return Number.isInteger(v) && v >= 1 && v <= 99 ? String(v).padStart(2, '0') : null; };
export function checkSender(s: Partial<Sender>): Sender {
  const class_code = (s.class_code ?? '').trim().toUpperCase(), number = normalizeNumber(s.number ?? ''), alias = (s.alias ?? '').trim();
  if (!CLASS_CODE.test(class_code)) throw new Error('학급 코드는 선생님이 알려 준 4자예요.');
  if (!number) throw new Error('번호는 1~99 사이 숫자로 적어 주세요.');
  if (!alias || alias.length > 10) throw new Error('별칭은 1~10자로 적어 주세요. 실명 대신 별칭을 써요.');
  return { class_code, number, alias };
}

async function digest(value: unknown) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(value)));
  return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, '0')).join('');
}
const signed = (e: Omit<Exchange, 'checksum' | 'format' | 'version'>) => ({ kind: e.kind, created_at: e.created_at, class_code: e.class_code, number: e.number, alias: e.alias, payload: e.payload });

export async function packExchange<T>(kind: ExchangeKind, sender: Sender, payload: T, now = new Date()): Promise<string> {
  const body = { kind, created_at: now.toISOString(), ...checkSender(sender), payload };
  return JSON.stringify({ format: 'jnavi', version: 1, ...body, checksum: await digest(signed(body)) });
}

export type ReadError = 'not-jnavi' | 'broken';
export class ExchangeError extends Error { constructor(public code: ReadError) { super(code); } }
/** 파일 경계: 모양·체크섬이 맞아야 내용을 믿어요. kind 확인은 부르는 쪽 몫. */
export async function readExchange(text: string): Promise<Exchange> {
  let e: Exchange;
  try { e = JSON.parse(text); } catch { throw new ExchangeError('broken'); }
  if (!e || e.format !== 'jnavi') throw new ExchangeError('not-jnavi');
  if (e.version !== 1 || typeof e.kind !== 'string' || typeof e.created_at !== 'string' || Number.isNaN(Date.parse(e.created_at))) throw new ExchangeError('broken');
  if ((e.kind as string) === 'student_backup') return e; // 암호화 백업은 체크섬 대신 암호로 지켜요
  try { checkSender(e); } catch { throw new ExchangeError('broken'); }
  if (e.checksum !== await digest(signed(e))) throw new ExchangeError('broken');
  return e;
}

const SENDER_KEY = 'jinhak-navi-sender';
export function loadSender(): Partial<Sender> { try { return JSON.parse(localStorage.getItem(SENDER_KEY) ?? '{}'); } catch { return {}; } }
export function saveSender(s: Sender) { try { localStorage.setItem(SENDER_KEY, JSON.stringify(s)); } catch { /* 저장 못 해도 보내기는 돼요 */ } }
