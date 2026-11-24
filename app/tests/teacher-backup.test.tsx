import 'fake-indexeddb/auto';
import { webcrypto } from 'node:crypto';
import { afterEach, beforeAll, beforeEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { studentDb } from '../src/store/studentDb';
import { teacherDb } from '../src/store/teacherDb';
import { adminDb } from '../src/store/adminDb';
import { isSampleMode, showSample } from '../src/data/sample';
import { setSampleFlag } from '../src/data/sample/mode';
import { SAMPLE_CLASS } from '../src/data/sample/teacher';
import { decryptTeacherBackup, encryptBackup, encryptTeacherBackup } from '../src/io/backup';
import { TeacherBackupButton } from '../src/components/TeacherBackup';

const names = () => teacherDb.tables.map(t => t.name);
const snapshot = async () => Object.fromEntries(await Promise.all(teacherDb.tables.map(async t => [t.name, await t.toArray()] as const)));
/** 샘플 학급을 "내 학급"(다른 코드)으로 바꿔 모든 표에 행이 있는 실제 학급을 만들어요. */
async function realClass(name = '3학년 1반') {
  await showSample(); setSampleFlag('off');
  await teacherDb.meta.put({ ...SAMPLE_CLASS, name, code: 'REAL' });
  await studentDb.grades.clear();
}

beforeAll(() => vi.stubGlobal('crypto', webcrypto));
afterEach(cleanup);
beforeEach(async () => {
  localStorage.clear();
  await Promise.all([studentDb, teacherDb, adminDb].flatMap(db => db.tables.map(t => t.clear())));
});

test('백업 → 되살리기 왕복: 모든 표가 같아요', async () => {
  await realClass();
  const before = await snapshot();
  const file = await encryptTeacherBackup(before, 'class-password');
  await teacherDb.clearClass();
  await teacherDb.restore(await decryptTeacherBackup(file, 'class-password', names()));
  expect(await snapshot()).toEqual(before);
  expect(before.students.length).toBeGreaterThan(0);
});

test('틀린 암호 · 학생 백업 · 손상 파일은 거부하고 기존 학급은 그대로예요', async () => {
  await realClass();
  const before = await snapshot(), file = await encryptTeacherBackup(before, 'class-password');
  await expect(decryptTeacherBackup(file, 'wrong-password', names())).rejects.toThrow('암호가 다르거나');
  const student = await encryptBackup(await studentDb.snapshot(), 'class-password');
  await expect(decryptTeacherBackup(student, 'class-password', names())).rejects.toThrow('학생 백업 파일이에요');
  const broken = JSON.parse(file); broken.ciphertext = broken.ciphertext.slice(0, -8) + 'AAAAAAAA';
  await expect(decryptTeacherBackup(JSON.stringify(broken), 'class-password', names())).rejects.toThrow('손상');
  await expect(decryptTeacherBackup('not json', 'class-password', names())).rejects.toThrow('손상');
  // 모르는 표 이름 · 학급 정보 없는 백업도 손상으로 봐요.
  await expect(decryptTeacherBackup(await encryptTeacherBackup({ ...before, hacked: [{}] }, 'class-password'), 'class-password', names())).rejects.toThrow('손상');
  await expect(decryptTeacherBackup(await encryptTeacherBackup({ students: before.students }, 'class-password'), 'class-password', names())).rejects.toThrow('손상');
  // 쓰는 도중 실패(키 없는 학생 행)해도 트랜잭션이 되돌려 기존 학급이 남아요.
  await expect(teacherDb.restore({ ...before, students: [{ alias: '키 없음' }] })).rejects.toThrow();
  expect(await snapshot()).toEqual(before);
});

test('UI: 샘플 학급이 있으면 샘플을 지우고 샘플 모드를 끈 뒤 되살려요', async () => {
  await realClass('백업한 반');
  const file = await encryptTeacherBackup(await snapshot(), 'class-password');
  await Promise.all(teacherDb.tables.map(t => t.clear())); localStorage.clear();
  await showSample();
  expect(isSampleMode()).toBe(true); expect(await studentDb.grades.count()).toBeGreaterThan(0);

  render(<TeacherBackupButton />);
  fireEvent.click(screen.getByRole('button', { name: '백업' }));
  fireEvent.click(screen.getByRole('button', { name: '백업 파일 되살리기' }));
  fireEvent.change(screen.getByLabelText('백업 암호'), { target: { value: 'class-password' } });
  fireEvent.change(screen.getByLabelText('학급 백업 파일'), { target: { files: [new File([file], '백업한 반_학급백업.jnavi')] } });
  const dialog = await screen.findByRole('dialog', { name: '되살리기 확인' }, { timeout: 5000 });
  expect(dialog.textContent).toContain('백업한 반(학생 28명');
  expect(dialog.textContent).toContain('샘플 데이터는 지우고 샘플 보기를 꺼요.');
  expect(dialog.textContent).toContain('고른 파일: 백업한 반_학급백업.jnavi');
  fireEvent.click(screen.getByRole('button', { name: '되살리기' }));
  await screen.findByText('백업을 되살렸어요.', undefined, { timeout: 5000 });
  expect(isSampleMode()).toBe(false);
  expect(await studentDb.grades.count()).toBe(0);
  expect((await teacherDb.meta.get('class'))?.name).toBe('백업한 반');
});

test('UI: 지금 학급이 있으면 무엇이 사라지는지 적고, 학생 백업은 오류 줄로 막아요', async () => {
  await realClass('지금 반');
  const file = await encryptTeacherBackup(await snapshot(), 'class-password');
  const student = await encryptBackup(await studentDb.snapshot(), 'class-password');
  render(<TeacherBackupButton />);
  fireEvent.click(screen.getByRole('button', { name: '백업' }));
  fireEvent.click(screen.getByRole('button', { name: '백업 파일 되살리기' }));
  fireEvent.change(screen.getByLabelText('백업 암호'), { target: { value: 'class-password' } });
  fireEvent.change(screen.getByLabelText('학급 백업 파일'), { target: { files: [new File([student], '내-성적.jnavi')] } });
  expect((await screen.findByRole('alert', undefined, { timeout: 5000 })).textContent).toContain('학생 백업 파일이에요');
  fireEvent.change(screen.getByLabelText('학급 백업 파일'), { target: { files: [new File([file], 'a.jnavi')] } });
  const dialog = await screen.findByRole('dialog', { name: '되살리기 확인' }, { timeout: 5000 });
  expect(dialog.textContent).toContain('지금 있는 지금 반(학생 28명');
  expect(dialog.textContent).toContain('모두 지워지고 되돌릴 수 없어요');
  fireEvent.click(screen.getByRole('button', { name: '취소' }));
  await waitFor(() => expect(screen.queryByRole('dialog', { name: '되살리기 확인' })).toBeNull());
});
