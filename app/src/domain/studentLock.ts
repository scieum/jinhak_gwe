/**
 * 학생 화면 잠금(공용 기기에서 성적 가리기). 잠금 번호는 교사 잠금과 같은 PBKDF2 해시로만 저장하고,
 * 잠긴 상태는 localStorage라 새로고침·새 탭에서도 잠겨 있어요. 교사 잠금·샘플 데이터와는 따로예요.
 * shortcut: 화면만 가려요(학생 기록 자체는 암호화하지 않아 개발자 도구로는 읽혀요). 계정이 생기면 세션으로 바꿔요.
 */
import { checkPin, derive, newSalt, validPin } from './teacherLock';

const KEY = 'jinhak-navi-student-lock', LOCKED = 'jinhak-navi-student-locked';
export const STUDENT_LOCK_EVENT = 'jinhak-student-lock';
export const announceStudentLock = () => window.dispatchEvent(new Event(STUDENT_LOCK_EVENT));

function load(): { salt: string; hash: string } | null {
  try { const v = JSON.parse(localStorage.getItem(KEY) ?? 'null'); return v && typeof v.hash === 'string' && typeof v.salt === 'string' ? v : null; } catch { return null; }
}
export const hasStudentPin = () => !!load();
export async function setStudentPin(pin: string) {
  if (!validPin(pin)) throw new Error('잠금 번호는 숫자 4~8자리로 정해 주세요.');
  const salt = newSalt();
  localStorage.setItem(KEY, JSON.stringify({ salt, hash: await derive(pin, salt) }));
}
export function isStudentLocked() { try { return !!load() && localStorage.getItem(LOCKED) === '1'; } catch { return false; } }
export function lockStudent() { if (load()) localStorage.setItem(LOCKED, '1'); }
export async function unlockStudent(pin: string) {
  const c = load();
  if (!c || !(await checkPin(pin, c))) return false;
  localStorage.removeItem(LOCKED);
  return true;
}
export function clearStudentLock() { try { localStorage.removeItem(KEY); localStorage.removeItem(LOCKED); } catch { /* 없음 */ } }
