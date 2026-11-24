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
export async function encryptBackup(data: StudentBackup, password: string): Promise<string> {
  if (password.length < 8) throw new Error('백업 암호는 8자 이상 입력해 주세요.');
  const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await derive(password, salt, ['encrypt']);
  const payload = new TextEncoder().encode(JSON.stringify(parseStudentBackup(stripSample(data))) /* 샘플 행은 백업에 넣지 않아요 */);
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: new TextEncoder().encode('jnavi:1:student_backup') }, key, payload);
  const result = JSON.stringify({ format: 'jnavi', version: 1, kind: 'student_backup', cipher: 'AES-GCM', kdf: 'PBKDF2-SHA256',
    iterations: 310000, created_at: new Date().toISOString(), salt: base64(salt), iv: base64(iv), ciphertext: base64(new Uint8Array(encrypted)) });
  if (result.length > 5_000_000) throw new Error('백업이 5MB를 넘어요. 긴 메모나 불필요한 준비 기록을 정리한 뒤 다시 시도해 주세요.');
  return result;
}
export async function decryptBackup(text: string, password: string): Promise<StudentBackup> {
  if (text.length > 5_000_000) throw new Error('백업 파일이 너무 커요.');
  try {
    const e = JSON.parse(text);
    if (e.format !== 'jnavi' || e.version !== 1 || e.kind !== 'student_backup' || e.cipher !== 'AES-GCM'
      || e.kdf !== 'PBKDF2-SHA256' || e.iterations !== 310000 || typeof e.ciphertext !== 'string') throw new Error();
    const salt = bytes(e.salt), iv = bytes(e.iv);
    if (salt.length !== 16 || iv.length !== 12) throw new Error();
    const key = await derive(password, salt, ['decrypt']);
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv, additionalData: new TextEncoder().encode('jnavi:1:student_backup') }, key, bytes(e.ciphertext));
    return parseStudentBackup(JSON.parse(new TextDecoder().decode(plain)));
  } catch { throw new Error('암호가 다르거나 파일이 손상됐어요. 지원하는 학생 백업인지 확인해 주세요.'); }
}
export function downloadFile(content: BlobPart, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
