// 샘플 데이터 적재·지우기. 샘플 행은 id 접두어(sample-) · 샘플 학급 코드 · sample 표시 · 샘플 값과 같은지로 골라요.
import type { Table } from 'dexie';
import { studentDb } from '../../store/studentDb';
import { teacherDb } from '../../store/teacherDb';
import { adminDb } from '../../store/adminDb';
import { sameApplication } from '../../domain/planner';
import { programs } from '../catalog';
import { resetReleasedResults } from '../releasedResults';
import { resetUnivWiki } from '../univWiki';
import { sampleFlag, setSampleFlag } from './mode';
import { isSampleAttendance, isSampleId, isSampleInterest } from './rows';
import { sampleApplications, sampleAttendance, sampleBoards, sampleGrades, sampleInterests, sampleTasks } from './student';
import { SAMPLE_CLASS, sampleCards, sampleClassMocks, sampleLogs, sampleMemos, sampleMocks, sampleOutcomes, sampleSchedules, sampleSchool, sampleStudents, sampleTargets } from './teacher';
import { sampleFieldDraft, sampleWikiDrafts } from './admin';
import { samplePrograms } from './public';

export { isSampleMode, useSampleMode } from './mode';
export { stripSample } from './rows';

function showPublicSample() {
  if (!programs.some(p => p.id.startsWith('sample-'))) programs.push(...samplePrograms);
  resetReleasedResults(); resetUnivWiki();
}
function hidePublicSample() {
  for (let i = programs.length - 1; i >= 0; i--) if (programs[i].id.startsWith('sample-')) programs.splice(i, 1);
  resetReleasedResults(); resetUnivWiki();
}
const empty = async (tables: Table[]) => (await Promise.all(tables.map(t => t.count()))).every(n => n === 0);
const addMissing = async <T,>(table: Table<T>, rows: readonly T[], key: (r: T) => unknown) => {
  for (const r of rows) if (await table.get(key(r) as never) === undefined) await table.add(r);
};

/** 빈 저장소에만 샘플을 넣어요(다시 보기도 같아요: 사용자 데이터를 덮지 않아요). 넣은 것이 있으면 true. */
async function loadStudent() {
  const db = studentDb;
  return db.transaction('rw', [db.grades, db.attendance, db.applications, db.tasks, db.boards, db.mocks, db.interests], async () => {
    const existing = await db.applications.toArray();
    // 사용자가 같은 전형을 이미 등록했으면 그 샘플 전형과 거기 딸린 할 일·카드는 넣지 않아요.
    const apps = sampleApplications.filter(a => !existing.some(e => sameApplication(e, a)));
    const ids = new Set(apps.map(a => a.id)), linked = (id: string | null) => id === null || ids.has(id);
    await addMissing(db.grades, sampleGrades, r => r.id);
    await addMissing(db.attendance, sampleAttendance, r => r.year);
    await addMissing(db.interests, sampleInterests, r => r.id);
    await addMissing(db.applications, apps, r => r.id);
    await addMissing(db.tasks, sampleTasks.filter(t => linked(t.application_id)), r => r.id);
    await addMissing(db.boards, sampleBoards.map(b => ({ ...b, slots: b.slots.filter(s => ids.has(s.application_id)) })), r => r.id);
  });
}
async function loadTeacher() {
  // 학급은 하나뿐이라 이미 학급이 있으면 샘플 학급을 넣지 않아요.
  if (await teacherDb.meta.get('class')) return;
  await teacherDb.transaction('rw', teacherDb.tables, async () => {
    await teacherDb.createClass(SAMPLE_CLASS, sampleStudents);
    await teacherDb.cards.bulkAdd(sampleCards); await teacherDb.logs.bulkAdd(sampleLogs);
    await teacherDb.mocks.bulkPut([...sampleMocks, ...sampleClassMocks]); await teacherDb.schedules.bulkAdd(sampleSchedules);
    await teacherDb.memos.bulkAdd(sampleMemos); await teacherDb.school.bulkPut(sampleSchool); await teacherDb.targets.bulkPut(sampleTargets);
    await teacherDb.outcomes.bulkAdd(sampleOutcomes);
  });
}
async function loadAdmin() {
  await adminDb.transaction('rw', [adminDb.wiki, adminDb.fields], async () => {
    await addMissing(adminDb.wiki, sampleWikiDrafts, r => r.key);
    await addMissing(adminDb.fields, [sampleFieldDraft], r => r.key);
  });
}

/** 첫 실행: 아직 정하지 않았으면 저장소가 빈 곳에만 샘플을 넣고 샘플 모드를 켜요. 이미 내 데이터가 있으면 끄고 끝. */
export async function initSample() {
  const flag = sampleFlag();
  if (flag === 'on') { showPublicSample(); return; }
  if (flag === 'off') return;
  const s = studentDb, a = adminDb;
  const studentEmpty = await empty([s.grades, s.attendance, s.applications, s.tasks, s.boards, s.mocks, s.interests]);
  const teacherEmpty = !(await teacherDb.meta.get('class'));
  const adminEmpty = await empty([a.reviews, a.rules, a.fields, a.wiki, a.map]);
  // 학생 기록이 이미 있는 기기(기존 사용자)에는 샘플을 넣지 않아요.
  if (!studentEmpty) { setSampleFlag('off'); return; }
  await loadStudent();
  if (teacherEmpty) await loadTeacher();
  if (adminEmpty) await loadAdmin();
  showPublicSample(); setSampleFlag('on'); // 전형을 먼저 넣고 알려야 다시 그린 화면이 샘플 전형을 봐요
}

/** "샘플 데이터 다시 보기": 빈 자리에만 샘플을 다시 넣어요. */
export async function showSample() {
  await loadStudent(); await loadTeacher(); await loadAdmin();
  showPublicSample(); setSampleFlag('on');
}

/** "샘플 데이터 지우기": 샘플 행만 지우고 다시 자동으로 넣지 않게 표시해요. 사용자가 넣은 행은 그대로예요. */
export async function clearSample() {
  const db = studentDb;
  // 샘플 전형을 지울 때 사용자 할 일·수시로 카드의 연결은 기존 삭제 규칙(deleteApplication)대로 정리돼요.
  for (const a of await db.applications.toArray()) if (isSampleId(a.id)) await db.deleteApplication(a.id);
  await db.transaction('rw', [db.grades, db.attendance, db.tasks, db.boards, db.interests], async () => {
    for (const t of [db.grades, db.tasks, db.boards] as Table<{ id: string }, string>[]) await t.filter(r => isSampleId(r.id)).delete();
    await db.attendance.filter(isSampleAttendance).delete();
    await db.interests.filter(isSampleInterest).delete();
  });
  const info = await teacherDb.meta.get('class');
  if (info?.code === SAMPLE_CLASS.code && info.created_at === SAMPLE_CLASS.created_at) await teacherDb.clearClass();
  await adminDb.transaction('rw', [adminDb.wiki, adminDb.fields], async () => {
    await adminDb.wiki.filter(d => !!d.sample).delete();
    await adminDb.fields.filter(d => !!d.sample).delete();
  });
  hidePublicSample(); setSampleFlag('off');
}
