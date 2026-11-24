import { parseStudentBackup, type StudentBackup } from '../domain/student';
import { stripSample } from '../data/sample/rows';

const bytes = (s: string) => Uint8Array.from(atob(s), c => c.charCodeAt(0));
const base64 = (data: Uint8Array) => {
  let result = ''; for (let i = 0; i < data.length; i += 8192) result += String.fromCharCode(...data.subarray(i, i + 8192));
  return btoa(result);
};
async function derive(password: string, salt: Uint8Array<ArrayBuffer>, usage: KeyUsage[]) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 310000, hash: 'SHA-256' }, key, { name: 'AES-GCM', length: 256 }, false, usage);
}
async function seal(kind: 'student_backup' | 'teacher_backup', data: unknown, password: string, limit = 5_000_000): Promise<string> {
  if (password.length < 8) throw new Error('백업 암호는 8자 이상 입력해 주세요.');
  const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await derive(password, salt, ['encrypt']);
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: new TextEncoder().encode(`jnavi:1:${kind}`) }, key, new TextEncoder().encode(JSON.stringify(data)));
  const result = JSON.stringify({ format: 'jnavi', version: 1, kind, cipher: 'AES-GCM', kdf: 'PBKDF2-SHA256',
    iterations: 310000, created_at: new Date().toISOString(), salt: base64(salt), iv: base64(iv), ciphertext: base64(new Uint8Array(encrypted)) });
  if (result.length > limit) throw new Error(`백업이 ${limit / 1_000_000}MB를 넘어요. 긴 메모나 불필요한 기록을 정리한 뒤 다시 시도해 주세요.`);
  return result;
}
/** 샘플 행은 백업에 넣지 않아요. */
export const encryptBackup = (data: StudentBackup, password: string) => seal('student_backup', parseStudentBackup(stripSample(data)), password);
/** 교사 학급 데이터(teacherDb 모든 표) 암호화 백업. 되살리기는 decryptTeacherBackup → teacherDb.restore. */
export const encryptTeacherBackup = (tables: Record<string, unknown[]>, password: string) => seal('teacher_backup', tables, password, 20_000_000);
async function unseal(kind: 'student_backup' | 'teacher_backup', text: string, password: string, limit: number, fail: string): Promise<unknown> {
  if (text.length > limit) throw new Error('백업 파일이 너무 커요.');
  try {
    const e = JSON.parse(text);
    if (e.format !== 'jnavi' || e.version !== 1 || e.kind !== kind || e.cipher !== 'AES-GCM'
      || e.kdf !== 'PBKDF2-SHA256' || e.iterations !== 310000 || typeof e.ciphertext !== 'string') throw new Error();
    const salt = bytes(e.salt), iv = bytes(e.iv);
    if (salt.length !== 16 || iv.length !== 12) throw new Error();
    const key = await derive(password, salt, ['decrypt']);
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv, additionalData: new TextEncoder().encode(`jnavi:1:${kind}`) }, key, bytes(e.ciphertext));
    return JSON.parse(new TextDecoder().decode(plain));
  } catch { throw new Error(fail); }
}
export async function decryptBackup(text: string, password: string): Promise<StudentBackup> {
  const fail = '암호가 다르거나 파일이 손상됐어요. 지원하는 학생 백업인지 확인해 주세요.';
  const data = await unseal('student_backup', text, password, 5_000_000, fail);
  try { return parseStudentBackup(data); } catch { throw new Error(fail); }
}
/** 교사 학급 백업 열기. 학생 백업·손상·틀린 암호는 오류로 막고, 표 이름·행 모양까지 확인해요(쓰기 전에 걸러야 기존 학급을 지키니까요). */
export async function decryptTeacherBackup(text: string, password: string, tableNames: readonly string[]): Promise<Record<string, Record<string, unknown>[]>> {
  try { if (JSON.parse(text)?.kind === 'student_backup') throw new Error('student'); }
  catch (e) { if (e instanceof Error && e.message === 'student') throw new Error('학생 백업 파일이에요. 학급 백업 파일을 골라 주세요.'); }
  const fail = '암호가 다르거나 파일이 손상됐어요. 학급 백업 파일인지 확인해 주세요.';
  const data = await unseal('teacher_backup', text, password, 20_000_000, fail);
  const ok = !!data && typeof data === 'object' && !Array.isArray(data) && Object.entries(data).every(([k, rows]) =>
    tableNames.includes(k) && Array.isArray(rows) && rows.every(r => !!r && typeof r === 'object' && !Array.isArray(r)));
  const tables = data as Record<string, Record<string, unknown>[]>;
  if (!ok || !tables.meta?.some(r => r.key === 'class' && typeof r.name === 'string')) throw new Error(fail);
  return tables;
}
export function downloadFile(content: BlobPart, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
