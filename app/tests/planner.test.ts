import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { webcrypto } from 'node:crypto';
import { afterEach, beforeAll, expect, test, vi } from 'vitest';
import { StudentDatabase } from '../src/store/studentDb';
import { newApplication, newCounselTask, parsePlannerData, eligibilitySummary, safeSourceUrl, sameApplication, stepDeadline, taskDeadline, validDeadline, updateApplicationIdentity, type PlannerData } from '../src/domain/planner';
import { encryptBackup, decryptBackup } from '../src/io/backup';
import { subject } from './fixtures';
beforeAll(() => vi.stubGlobal('crypto', webcrypto));
const dbs: StudentDatabase[] = [];
const database = () => { const db = new StudentDatabase(`planner-test-${crypto.randomUUID()}`); dbs.push(db); return db; };
afterEach(async () => { for (const db of dbs.splice(0)) await db.delete(); });
const plan = () => ({ ...newApplication(), university: '검증용 대학', program: '가상 전형' });
const sourceSelection = { package_id: 'plan-0000198', program_id: 'source-program', unit_id: 'source-unit', round: '수시', source_sha256: 'a'.repeat(64) };

test('source selection survives storage, encrypted backup and restoration', async () => {
  const db = database(), p = { ...plan(), source_selection: sourceSelection };
  await db.saveApplication(p);
  const snapshot = await db.snapshot();
  const decoded = await decryptBackup(await encryptBackup(snapshot, 'test-password'), 'test-password');
  expect(decoded.planning?.applications[0].source_selection).toEqual(sourceSelection);
  await db.clearStudentData(); await db.restore(decoded);
  expect((await db.applications.get(p.id))?.source_selection).toEqual(sourceSelection);
});

test('source identity separates same-name rounds and resets previous confirmations', () => {
  const a = { ...plan(), source_selection: sourceSelection };
  const b = { ...a, source_selection: { ...sourceSelection, program_id: 'regular', round: '정시' } };
  expect(sameApplication(a, b)).toBe(false);
  a.steps[0].status = 'done'; a.steps[0].checked_at = new Date().toISOString();
  expect(updateApplicationIdentity(a, b).steps[0].status).toBe('pending');
  expect(updateApplicationIdentity(a, { ...a, source_selection: { ...sourceSelection, source_sha256: 'b'.repeat(64) } }).steps[0].status).toBe('pending');
  expect(updateApplicationIdentity(a, { ...a, source_url: 'https://example.com' }).steps[0].status).toBe('done');
});

test('malformed reference metadata is rejected while legacy plans remain valid', () => {
  expect(parsePlannerData({ applications: [plan()], tasks: [] }).applications[0].source_selection).toBeUndefined();
  for (const selection of [null, {}, { ...sourceSelection, source_sha256: 'invalid' }, { ...sourceSelection, program_id: '' }, { ...sourceSelection, package_id: '../private' }]) {
    expect(() => parsePlannerData({ applications: [{ ...plan(), source_selection: selection }], tasks: [] })).toThrow();
  }
});
test('자격은 초기에 확인 필요이며 모든 확인이 끝나도 최종 자격 판정으로 바꾸지 않음', () => {
  const p = plan(); expect(eligibilitySummary(p.eligibility)).toBe('확인 필요');
  p.eligibility.forEach(e => { e.status = 'na'; e.checked_at = new Date().toISOString(); });
  expect(eligibilitySummary(p.eligibility)).toBe('확인 기록 완료');
  p.eligibility[0].status = 'unmet'; expect(eligibilitySummary(p.eligibility)).toBe('미충족 기록 있음');
  expect(eligibilitySummary([])).toBe('확인 항목 없음');
});
test('접수·결제·서류 완료는 독립적이며 한국 시간 경계로 마감을 판정', () => {
  const p = plan(); const s = p.steps[0];
  expect(stepDeadline(s)).toBe('마감 미정');
  s.due_at = '2028-09-10T00:00';
  expect(stepDeadline(s, new Date('2028-09-09T14:59:00Z'))).toBe('예정');
  expect(stepDeadline(s, new Date('2028-09-09T15:01:00Z'))).toBe('기한 지남');
  s.status = 'done'; expect(stepDeadline(s)).toBe('처리 완료');
  expect(p.steps[1].status).toBe('pending'); expect(p.steps[4].status).toBe('pending');
  const t = newCounselTask(); t.due_date = '2028-09-10';
  expect(taskDeadline(t, new Date('2028-09-10T14:59:00Z'))).toBe('오늘까지');
  expect(taskDeadline(t, new Date('2028-09-10T15:00:00Z'))).toBe('기한 지남');
});
test('잘못된 날짜·실행 가능한 링크·중복 ID·연결 없는 상담을 거부', () => {
  expect(validDeadline('2028-02-30T12:00')).toBe(false); expect(validDeadline('2028-02-29T24:00')).toBe(false);
  expect(safeSourceUrl('javascript:alert(1)')).toBe(false); expect(safeSourceUrl('https://user:secret@example.com')).toBe(false);
  const p = plan(); p.source_url = 'javascript:alert(1)';
  expect(() => parsePlannerData({ applications: [p], tasks: [] })).toThrow(); p.source_url = '';
  expect(() => parsePlannerData({ applications: [p, p], tasks: [] })).toThrow();
  expect(() => parsePlannerData({ applications: [p], tasks: [{ ...newCounselTask('missing'), title: '상담' }] })).toThrow();
  p.steps[0].status = 'done';
  expect(() => parsePlannerData({ applications: [p], tasks: [] })).toThrow();
});
test('전형 정체성이 바뀌면 이전 확인·기한·근거 초기화', () => {
  const p = plan(); p.steps[0] = { ...p.steps[0], status: 'done', checked_at: new Date().toISOString(), due_at: '2028-09-01T18:00', note: '이전 메모' };
  p.eligibility[0].status = 'met'; p.eligibility[0].checked_at = new Date().toISOString();
  const next = updateApplicationIdentity(p, { ...p, year: 2029 });
  expect(next.steps[0]).toMatchObject({ status: 'pending', checked_at: null, due_at: null, note: '' });
  expect(next.eligibility[0].status).toBe('unknown');
  expect(updateApplicationIdentity(p, { ...p, source_url: 'https://example.com' }).steps[0].status).toBe('done');
});
test('v1 성적 DB를 v2로 올려도 성적 보존', async () => {
  const db = database(); const legacy = new Dexie(db.name);
  legacy.version(1).stores({ grades: 'id, semester', attendance: 'year' });
  await legacy.table('grades').put(subject()); legacy.close();
  await db.open(); expect((await db.grades.toArray())[0].name).toBe('대수');
  expect(await db.planningSnapshot()).toEqual({ applications: [], tasks: [] });
});
test('저장·재연결, 전형 삭제 시 상담 내용 보존과 연결 해제', async () => {
  const db = database(), p = plan(), t = { ...newCounselTask(p.id), title: '추천 확인하기' };
  await db.saveApplication(p); await db.saveTask(t); db.close(); await db.open();
  expect((await db.planningSnapshot()).tasks[0].title).toBe(t.title);
  await db.deleteApplication(p.id);
  expect(await db.applications.count()).toBe(0); expect((await db.tasks.get(t.id))?.application_id).toBeNull();
});
test('암호화 백업 왕복, 구버전 복원은 준비 기록 유지, 전체 삭제는 함께 삭제', async () => {
  const db = database(), p = plan(); await db.saveApplication(p);
  await db.saveTask({ ...newCounselTask(p.id), title: '교사에게 질문' });
  const snapshot = await db.snapshot(); const encrypted = await encryptBackup(snapshot, 'test-password');
  expect(encrypted).not.toContain('교사에게 질문');
  const decoded = await decryptBackup(encrypted, 'test-password'); expect(decoded).toEqual(snapshot);
  await db.restore({ grades: [subject()], attendance: [] }); expect(await db.tasks.count()).toBe(1);
  await db.clearStudentData(); expect(await db.tasks.count()).toBe(0); expect(await db.applications.count()).toBe(0); expect(await db.grades.count()).toBe(0);
  await db.restore(decoded); expect(await db.tasks.count()).toBe(1);
});
test('잘못된 준비 백업으로 복원 실패 시 기존 성적과 준비 기록 보존', async () => {
  const db = database(), p = plan(); await db.saveApplication(p); await db.grades.put(subject());
  const invalid: PlannerData = { applications: [p], tasks: [{ ...newCounselTask('orphan'), title: '항목' }] };
  await expect(db.restore({ grades: [], attendance: [], planning: invalid })).rejects.toThrow();
  expect(await db.grades.count()).toBe(1); expect(await db.applications.count()).toBe(1);
});
