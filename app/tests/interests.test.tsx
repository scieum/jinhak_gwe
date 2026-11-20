import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { webcrypto } from 'node:crypto';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { App } from '../src/App';
import { InterestButton } from '../src/components/InterestButton';
import { InterestList } from '../src/components/InterestList';
import { collectedProgramPath, interestId, parseInterests, programPath } from '../src/domain/interests';
import { parseStudentBackup } from '../src/domain/student';
import { RESULT_COLUMNS, type ReleasedUnit, type ResultRow } from '../src/domain/resultReview';
import { decryptBackup, encryptBackup } from '../src/io/backup';
import { StudentDatabase, studentDb } from '../src/store/studentDb';
import { subject } from './fixtures';

const release = vi.hoisted(() => ({ units: [] as ReleasedUnit[] }));
vi.mock('../src/data/releasedResults', () => ({ useReleasedResults: () => release.units }));
const university = '검증대학교', program = '학생부교과(지역균형)';
const item = (u = university, p = program) => ({ id: interestId(u, p), university: u, program: p, created_at: '2026-11-20T00:00:00.000Z' });
const at = (path: string) => render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>);
beforeEach(async () => {
  vi.stubGlobal('crypto', webcrypto);
  await studentDb.clearStudentData();
  release.units = [{ university, year: 2026, source_url: 'https://example.invalid/results', license: 'allowed', approvals: [], rows: [
    { ...Object.fromEntries(RESULT_COLUMNS.map(c => [c, ''])), university, program, round: '수시', admission_type: '교과', result_year: '2026', recruit_unit: '검증학과', cut_70: '2.5', metric: '교과등급' } as ResultRow,
  ] }];
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

test('interest identity handles delimiters, trims names, rejects duplicates and malformed backups', () => {
  expect(interestId('가|나', '다')).not.toBe(interestId('가', '나|다'));
  expect(parseInterests([{ ...item(), university: ` ${university} `, extra: 'discard' }])).toEqual([item()]);
  for (const input of [null, {}, [null], [item(), item()], [{ ...item(), id: 'wrong' }], [{ ...item(), program: '' }], [{ ...item(), created_at: 'bad' }], Array(501).fill(item())]) {
    expect(() => parseInterests(input)).toThrow('관심 전형');
  }
  expect(programPath('대학 & 캠퍼스', '전형?추천')).toBe(`/program-detail?u=${encodeURIComponent('대학 & 캠퍼스')}&p=${encodeURIComponent('전형?추천')}`);
});

test('repeated concurrent saves are idempotent, persist on reopen, and removals preserve other interests', async () => {
  const db = new StudentDatabase(`interests-${crypto.randomUUID()}`);
  try {
    await Promise.all([db.setInterest(university, program, true), db.setInterest(university, program, true), db.setInterest('다른대학', program, true)]);
    expect(await db.interests.count()).toBe(2);
    const original = await db.interests.get(interestId(university, program));
    db.close(); await db.open();
    await db.setInterest(university, program, true);
    expect(await db.interests.get(original!.id)).toEqual(original);
    await db.setInterest(university, program, false);
    expect((await db.interests.toArray()).map(i => i.university)).toEqual(['다른대학']);
  } finally { await db.delete(); }
});

test('upgrading v4 adds interests without losing existing grades or mocks', async () => {
  const name = `migration-${crypto.randomUUID()}`;
  const old = new Dexie(name);
  old.version(4).stores({ grades: 'id, semester', attendance: 'year', applications: 'id, year, updated_at', tasks: 'id, application_id, due_date, kind', boards: 'id', mocks: 'exam' });
  await old.table('grades').put(subject());
  await old.table('mocks').put({ exam: '기존 시험', raw: { 국어: 80 }, updated_at: '' });
  old.close();
  const db = new StudentDatabase(name);
  try {
    await db.setInterest(university, program, true);
    expect((await db.snapshot()).grades).toEqual([subject()]);
    expect((await db.snapshot()).mocks?.[0].raw.국어).toBe(80);
    expect(await db.interests.count()).toBe(1);
  } finally { await db.delete(); }
});

test('encrypted backup restores interests, legacy backup preserves them, explicit empty replaces them', async () => {
  await studentDb.setInterest(university, program, true);
  const data = await studentDb.snapshot();
  const encrypted = await encryptBackup(data, 'test-password');
  expect(encrypted).not.toContain(university);
  const restored = await decryptBackup(encrypted, 'test-password');
  expect(restored.interests).toEqual(data.interests);
  await studentDb.clearStudentData(); expect(await studentDb.interests.count()).toBe(0);
  await studentDb.restore(restored); expect(await studentDb.interests.count()).toBe(1);
  await studentDb.restore({ grades: [], attendance: [] }); expect(await studentDb.interests.count()).toBe(1);
  expect(parseStudentBackup({ grades: [], attendance: [] }).interests).toBeUndefined();
  await studentDb.restore({ grades: [], attendance: [], interests: [] }); expect(await studentDb.interests.count()).toBe(0);
});

test('invalid interest backup cannot partially erase existing student data', async () => {
  await studentDb.grades.put(subject()); await studentDb.setInterest(university, program, true);
  const before = await studentDb.snapshot();
  await expect(studentDb.restore({ grades: [], attendance: [], interests: [item(), item()] })).rejects.toThrow();
  expect(await studentDb.snapshot()).toEqual(before);
});

test('save limit allows existing entries and removal while rejecting new ones', async () => {
  await studentDb.interests.bulkPut(Array.from({ length: 500 }, (_, i) => item(`대학${i}`)));
  await expect(studentDb.setInterest(university, program, true)).rejects.toThrow('500개');
  await studentDb.setInterest('대학0', program, true);
  await studentDb.setInterest('대학0', program, false);
  await studentDb.setInterest(university, program, true);
  expect(await studentDb.interests.count()).toBe(500);
});

test('save from university detail, view from admission results after remount, open detail and remove', async () => {
  at(`/univ-detail?u=${encodeURIComponent(university)}`);
  fireEvent.click(await screen.findByRole('link', { name: `${university} ${program} 관심 학과 선택` }));
  const add = await screen.findByRole('button', { name: `${university} ${program} 검증학과 관심에 담기` });
  await waitFor(() => expect((add as HTMLButtonElement).disabled).toBe(false));
  fireEvent.click(add);
  await screen.findByRole('button', { name: `${university} ${program} 검증학과 관심에서 빼기` });
  expect(screen.getByRole('heading', { name: program })).toBeTruthy();
  cleanup(); at('/admission-results?view=interests');
  expect(await screen.findByRole('heading', { name: '관심 전형 1개' })).toBeTruthy();
  fireEvent.click(screen.getByRole('link', { name: program }));
  expect(await screen.findByRole('heading', { name: program })).toBeTruthy();
  const remove = await screen.findByRole('button', { name: `${university} ${program} 검증학과 관심에서 빼기` });
  fireEvent.click(remove);
  await waitFor(async () => expect(await studentDb.interests.count()).toBe(0));
  fireEvent.click(screen.getByRole('link', { name: '관심 전형 모아보기' }));
  expect(await screen.findByText('아직 관심 전형이 없어요')).toBeTruthy();
});

test('interests remain searchable and removable when released results disappear', async () => {
  await studentDb.setInterest(university, program, true);
  release.units = [];
  at('/admission-results?view=interests');
  expect(await screen.findByText('현재 공개 자료에서 찾지 못했어요. 저장한 관심 기록은 유지돼요.')).toBeTruthy();
  fireEvent.change(screen.getByLabelText('관심 전형 검색'), { target: { value: '없는 이름' } });
  expect(screen.getByText('검색한 관심 전형이 없어요')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '검색어 지우기' }));
  fireEvent.click(await screen.findByRole('button', { name: `${university} ${program} 관심에서 빼기` }));
  expect(await screen.findByText('아직 관심 전형이 없어요')).toBeTruthy();
});

test('a failed save is reported and does not claim success or mark the heart', async () => {
  vi.spyOn(studentDb, 'setInterest').mockRejectedValueOnce(new Error('저장 공간이 부족해요.'));
  render(<InterestButton university={university} program={program} />);
  const button = screen.getByRole('button');
  await waitFor(() => expect((button as HTMLButtonElement).disabled).toBe(false));
  fireEvent.click(button);
  expect(await screen.findByRole('alert')).toHaveProperty('textContent', '저장 공간이 부족해요.');
  expect(button.getAttribute('aria-pressed')).toBe('false');
  expect(screen.queryByRole('status')).toBeNull();
  fireEvent.click(button);
  await waitFor(() => expect(button.getAttribute('aria-pressed')).toBe('true'));
});

test('storage failure leaves public results usable and disables the interest action', async () => {
  vi.spyOn(studentDb.interests, 'get').mockRejectedValue(new Error('denied'));
  at(programPath(university, program));
  expect((await screen.findByRole('alert')).getAttribute('aria-label')).toBe('관심 전형 저장소를 열지 못했어요. 브라우저 저장 권한을 확인해 주세요.');
  expect(within(screen.getByRole('table')).getByText('검증학과')).toBeTruthy();
  expect((screen.getByRole('button', { name: `${university} ${program} 검증학과 관심에 담기` }) as HTMLButtonElement).disabled).toBe(true);
});

test('list read failure is distinct from an empty saved list', async () => {
  vi.spyOn(studentDb.interests, 'toArray').mockRejectedValue(new Error('denied'));
  render(<MemoryRouter><InterestList units={[]} /></MemoryRouter>);
  expect(await screen.findByRole('alert')).toHaveProperty('textContent', '관심 전형 목록을 읽지 못했어요. 브라우저 저장 권한을 확인해 주세요.');
  expect(screen.queryByText('아직 관심 전형이 없어요')).toBeNull();
});

test('department identity and backups preserve separate departments alongside legacy records', async () => {
  const department = '의예과';
  const saved = { ...item(), id: interestId(university, program, department), department };
  expect(saved.id).not.toBe(item().id);
  expect(saved.id).not.toBe(interestId(university, program, '약학과'));
  expect(parseInterests([item(), { ...saved, department: ` ${department} ` }])).toEqual([item(), saved]);
  for (const value of [{ ...saved, department: '' }, { ...saved, department: null }, { ...saved, department: '약학과' }, { ...saved, id: item().id }]) {
    expect(() => parseInterests([value])).toThrow('관심 전형');
  }
  expect(collectedProgramPath(university, program, '학과 & 전공')).toContain(`&cd=${encodeURIComponent('학과 & 전공')}`);
  await studentDb.setInterest(university, program, true, department);
  await studentDb.setInterest(university, program, true, '약학과');
  const before = await studentDb.snapshot();
  const restored = await decryptBackup(await encryptBackup(before, 'department-backup'), 'department-backup');
  await studentDb.clearStudentData(); await studentDb.restore(restored);
  expect((await studentDb.snapshot()).interests).toEqual(before.interests);
  await studentDb.setInterest(university, program, false, department);
  expect((await studentDb.interests.toArray()).map(i => i.department)).toEqual(['약학과']);
});

test('a department choice replaces only its legacy bookmark even at the limit and rolls back on failure', async () => {
  await studentDb.interests.bulkPut([item(), ...Array.from({ length: 499 }, (_, i) => item(`다른대학${i}`))]);
  const add = vi.spyOn(studentDb.interests, 'add').mockRejectedValueOnce(new Error('storage failure'));
  await expect(studentDb.setInterest(university, program, true, '의예과')).rejects.toThrow('storage failure');
  expect(await studentDb.interests.get(item().id)).toEqual(item());
  expect(await studentDb.interests.count()).toBe(500);
  add.mockRestore();
  await studentDb.setInterest(university, program, true, '의예과');
  expect(await studentDb.interests.get(item().id)).toBeUndefined();
  expect(await studentDb.interests.get(interestId(university, program, '의예과'))).toMatchObject({ department: '의예과' });
  expect(await studentDb.interests.count()).toBe(500);
  await expect(studentDb.setInterest(university, program, true, '약학과')).rejects.toThrow('500개');
  await studentDb.setInterest(university, program, true, '의예과');
  expect(await studentDb.interests.count()).toBe(500);
});

test('legacy entries are explicitly unspecified and department search and removal stay separate', async () => {
  await studentDb.setInterest(university, program, true);
  render(<MemoryRouter><InterestList units={[]} /></MemoryRouter>);
  await screen.findByText('학과 미지정');
  expect(screen.getByRole('link', { name: '학과 선택하기' }).getAttribute('href')).toBe(collectedProgramPath(university, program));
  await studentDb.setInterest(university, program, true, '의예과');
  await studentDb.setInterest(university, program, true, '약학과');
  await screen.findByRole('link', { name: '의예과' });
  expect(screen.queryByText('학과 미지정')).toBeNull();
  fireEvent.change(screen.getByLabelText('관심 전형 검색'), { target: { value: '의예과' } });
  expect(screen.queryByRole('link', { name: '약학과' })).toBeNull();
  fireEvent.click(await screen.findByRole('button', { name: `${university} ${program} 의예과 관심에서 빼기` }));
  await waitFor(async () => expect((await studentDb.interests.toArray()).map(i => i.department)).toEqual(['약학과']));
});
