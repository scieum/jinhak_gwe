import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { webcrypto } from 'node:crypto';
import { afterEach, beforeAll, expect, test, vi } from 'vitest';
import { StudentDatabase } from '../src/store/studentDb';
import { newApplication } from '../src/domain/planner';
import { parseStudentBackup } from '../src/domain/student';
import { encryptBackup, decryptBackup } from '../src/io/backup';
import { stripSample } from '../src/data/sample/rows';
import { SAMPLE_PREFIX } from '../src/data/sample/student';

beforeAll(() => vi.stubGlobal('crypto', webcrypto));
const dbs: StudentDatabase[] = [];
const database = (name = `targets-${crypto.randomUUID()}`) => { const db = new StudentDatabase(name); dbs.push(db); return db; };
const plans = () => ['가온대', '누리대', '다온대', '라온대'].map(university => ({ ...newApplication(), university, program: '교과' }));
afterEach(async () => { for (const db of dbs.splice(0)) await db.delete(); localStorage.clear(); });

test('upgrading an existing v5 database preserves applications before saving priorities', async () => {
  const name = `upgrade-${crypto.randomUUID()}`, legacy = new Dexie(name), apps = plans();
  legacy.version(5).stores({ grades: 'id, semester', attendance: 'year', applications: 'id, year, updated_at', tasks: 'id, application_id, due_date, kind', boards: 'id', mocks: 'exam', interests: 'id, university, created_at' });
  await legacy.table('applications').bulkPut(apps); legacy.close();
  const db = database(name);
  expect((await db.snapshot()).planning!.applications).toHaveLength(4);
  expect((await db.snapshot()).targetPriorities).toBeUndefined();
  await db.saveTargetPriorities([apps[1].id]);
  expect((await db.snapshot()).targetPriorities).toEqual([apps[1].id]);
});

test('encrypted backup restores target order on another database', async () => {
  const db = database(), next = database(), apps = plans();
  await db.applications.bulkPut(apps);
  const ids = [apps[2].id, apps[0].id, apps[1].id];
  await db.saveTargetPriorities(ids);
  const backup = await encryptBackup(await db.snapshot(), 'backup-password');
  await next.restore(await decryptBackup(backup, 'backup-password'));
  expect((await next.snapshot()).targetPriorities).toEqual(ids);
  next.close(); await next.open();
  expect((await next.snapshot()).targetPriorities).toEqual(ids);
});

test('legacy backups preserve priorities and remove only missing application references', async () => {
  const db = database(), apps = plans();
  await db.applications.bulkPut(apps); await db.saveTargetPriorities([apps[2].id, apps[0].id]);
  await db.restore({ grades: [], attendance: [] });
  expect((await db.snapshot()).targetPriorities).toEqual([apps[2].id, apps[0].id]);
  await db.restore({ grades: [], attendance: [], planning: { applications: [apps[0]], tasks: [] } });
  expect((await db.snapshot()).targetPriorities).toEqual([apps[0].id]);
  await db.deleteApplication(apps[0].id);
  expect((await db.snapshot()).targetPriorities).toEqual([]);
});

test('invalid priorities cannot overwrite existing student data', async () => {
  const db = database(), apps = plans();
  await db.applications.bulkPut(apps); await db.saveTargetPriorities([apps[0].id]);
  const original = await db.snapshot();
  for (const ids of [['missing'], [apps[0].id, apps[0].id], apps.map(a => a.id), [null]]) {
    await expect(db.restore({ ...original, targetPriorities: ids })).rejects.toThrow();
    expect(await db.snapshot()).toEqual(original);
  }
  expect(() => parseStudentBackup({ grades: [], attendance: [], targetPriorities: [] })).toThrow();
  await expect(db.saveTargetPriorities(['missing'])).rejects.toThrow();
  expect(await db.snapshot()).toEqual(original);
  await db.clearStudentData();
  expect((await db.snapshot()).targetPriorities).toEqual([]);
});

test('legacy local storage migrates once, filtering invalid ids and preserving order', async () => {
  const db = database('jinhak-navi-student-v1'), apps = plans();
  await db.applications.bulkPut(apps);
  localStorage.setItem('jinhak-navi-score-trend-targets', JSON.stringify(['missing', apps[2].id, apps[2].id, 7, apps[0].id]));
  expect((await db.snapshot()).targetPriorities).toEqual([apps[2].id, apps[0].id]);
  expect(localStorage.getItem('jinhak-navi-score-trend-targets')).toBeNull();
  await db.saveTargetPriorities([]);
  localStorage.setItem('jinhak-navi-score-trend-targets', JSON.stringify([apps[0].id]));
  db.close();
  const reopened = database('jinhak-navi-student-v1');
  expect((await reopened.snapshot()).targetPriorities).toEqual([]);
  reopened.close();
});

test('sample removal also strips priorities before backup validation', () => {
  const apps = plans(); apps[1].id = `${SAMPLE_PREFIX}target`;
  const result = stripSample({ grades: [], attendance: [], planning: { applications: apps, tasks: [] }, targetPriorities: [apps[1].id, apps[0].id] });
  expect(parseStudentBackup(result).targetPriorities).toEqual([apps[0].id]);
});
