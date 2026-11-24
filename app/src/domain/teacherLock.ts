/**
 * 교사 자동 잠금(PRD 6-10 "일정 시간 미사용 시 잠금"). 이 기기 화면 잠금이에요.
 * shortcut: 학급 데이터 자체를 암호화하지는 않아요(개발자 도구로는 읽혀요). Supabase로 옮길 때 계정 세션 만료로 바꿔요.
 */
const KEY = 'jinhak-navi-teacher-lock', ACTIVE = 'jinhak-navi-teacher-active';
export const LOCK_MINUTES = [5, 10, 30] as const;
export interface LockConfig { salt: string; hash: string; minutes: number }

const hex = (b: ArrayBuffer | Uint8Array) => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
export async function derive(pin: string, salt: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits']);
  return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: new TextEncoder().encode(salt), iterations: 100_000, hash: 'SHA-256' }, key, 256));
}
export const newSalt = () => hex(crypto.getRandomValues(new Uint8Array(16)));
export const validPin = (pin: string) => /^\d{4,8}$/.test(pin);

export function loadLock(): LockConfig | null {
  try { const v = JSON.parse(localStorage.getItem(KEY) ?? 'null'); return v && typeof v.hash === 'string' && typeof v.salt === 'string' && LOCK_MINUTES.includes(v.minutes) ? v : null; } catch { return null; }
}
export async function saveLock(pin: string, minutes: number) {
  if (!validPin(pin)) throw new Error('잠금 번호는 숫자 4~8자리로 정해 주세요.');
  if (!LOCK_MINUTES.includes(minutes as 5)) throw new Error('잠금 시간을 골라 주세요.');
  const salt = newSalt();
  localStorage.setItem(KEY, JSON.stringify({ salt, hash: await derive(pin, salt), minutes }));
  touch();
}
export function clearLock() { try { localStorage.removeItem(KEY); sessionStorage.removeItem(ACTIVE); } catch { /* 없음 */ } }
export async function checkPin(pin: string, c: { salt: string; hash: string }) { return (await derive(pin, c.salt)) === c.hash; }

/** 마지막 사용 시각은 탭마다(sessionStorage). 새로 열거나 오래 쉬면 잠겨 있어요. */
export function touch(now = Date.now()) { try { sessionStorage.setItem(ACTIVE, String(now)); } catch { /* 없음 */ } }
export function isExpired(c: LockConfig, now = Date.now()) {
  let last = 0;
  try { last = Number(sessionStorage.getItem(ACTIVE) ?? 0); } catch { /* 없음 */ }
  return !last || now - last > c.minutes * 60_000;
}
export function lockNow() { try { sessionStorage.removeItem(ACTIVE); } catch { /* 없음 */ } }
