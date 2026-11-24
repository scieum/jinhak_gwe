import 'fake-indexeddb/auto';
import { webcrypto } from 'node:crypto';
import { beforeAll, beforeEach, expect, test, vi } from 'vitest';
import { studentDb } from '../src/store/studentDb';
import { teacherDb } from '../src/store/teacherDb';
import { adminDb } from '../src/store/adminDb';
import { clearSample, initSample, isSampleMode, showSample } from '../src/data/sample';
import { programs } from '../src/data/catalog';
import { loadReleasedResults, resetReleasedResults } from '../src/data/releasedResults';
import { gradeSummary, parseStudentBackup, validateGrade } from '../src/domain/student';
import { decryptBackup, encryptBackup } from '../src/io/backup';
import { buildWikiEntries } from '../src/domain/wikiReview';
import { buildWikiFile } from '../src/domain/fieldReview';
import { sampleWikiDrafts, sampleFieldDraft } from '../src/data/sample/admin';
import { subject } from './fixtures';

beforeAll(() => vi.stubGlobal('crypto', webcrypto));
beforeEach(async () => {
  localStorage.clear();
  await Promise.all([studentDb, teacherDb, adminDb].flatMap(db => db.tables.map(t => t.clear())));
  programs.splice(0); resetReleasedResults();
});

test('첫 실행: 빈 기기에 데모 데이터(7번 하늘)를 넣고 샘플 모드를 켜요', async () => {
  await initSample();
  expect(isSampleMode()).toBe(true);
  const grades = await studentDb.grades.toArray();
  expect(grades).toHaveLength(24);
  expect(grades.filter(g => validateGrade(g).length).map(g => g.name)).toEqual(['여행지리']); // 확인 필요 1
  expect(gradeSummary(grades).average!.toFixed(1)).toBe('1.4');
  expect(gradeSummary(grades.filter(g => g.semester === '2-1')).average!.toFixed(1)).toBe('1.3');
  expect((await studentDb.applications.toArray()).map(a => a.university)).toEqual(['경희대학교', '건국대학교', '성균관대학교', '동국대학교', '한양대학교', '중앙대학교']);
  expect(await studentDb.tasks.count()).toBe(8);
  // 저장된 샘플 전체가 앱의 백업 검증을 통과해야 해요(형식이 틀린 샘플 금지).
  const snap = JSON.parse(JSON.stringify(await studentDb.snapshot()));
  expect(() => parseStudentBackup(snap)).not.toThrow();
  expect(await teacherDb.students.count()).toBe(28);
  // 카드 제출 21명 · 7번 하늘은 v1~v3 세 버전(counsel v2 시안 "카드 v3")이라 카드 행은 23개예요.
  const cards = await teacherDb.cards.toArray();
  expect(new Set(cards.map(c => c.number)).size).toBe(21);
  expect(cards.filter(c => c.number === '07')).toHaveLength(3);
  expect(await adminDb.wiki.count()).toBe(6);
  expect(programs.map(p => p.university)).toContain('경희대학교');
  // 2026-11-24 "샘플일 때만": 샘플 전형의 입결·규칙은 모두 sample 표식 + 미검수(draft)예요. 샘플 모드에서만 통과해요.
  expect(programs.every(p => p.rule?.sample === true && p.rule.review_status === 'draft' && p.cut?.sample === true && p.cut.review_status === 'draft')).toBe(true);
  expect((await loadReleasedResults(() => { throw new Error('공개 파일을 읽으면 안 돼요'); })).map(u => u.year).filter((y, i, all) => all.indexOf(y) === i)).toEqual([2024, 2025, 2026]);
});

test('이미 내 학생 기록이 있는 기기에는 샘플을 넣지 않아요', async () => {
  await studentDb.grades.put(subject({ id: 'mine', semester: '1-1' }));
  await initSample();
  expect(isSampleMode()).toBe(false);
  expect(await studentDb.grades.count()).toBe(1);
  expect(await teacherDb.students.count()).toBe(0);
});

test('지우기: 샘플만 지우고 내가 넣은 기록은 남기며, 다시 자동으로 넣지 않아요', async () => {
  await initSample();
  await studentDb.grades.put(subject({ id: 'mine', semester: '1-1', name: '내 과목' }));
  await studentDb.setInterest('서울대학교', '일반전형', true, '경제학부');
  const mineApp = await studentDb.addApplication({ ...(await studentDb.applications.toArray())[0], id: 'my-app', university: '서울대학교', department: '경제학부' });
  // 사용자가 샘플 전형에 단 할 일은 남고 연결만 끊겨요.
  await studentDb.saveTask({ id: 'my-task', application_id: 'sample-app-1', kind: 'question', title: '내 질문', note: '', session_date: null, due_date: null, done: false, completed_at: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
  await clearSample();
  expect(isSampleMode()).toBe(false);
  expect((await studentDb.grades.toArray()).map(g => g.id)).toEqual(['mine']);
  expect((await studentDb.interests.toArray()).map(i => i.university)).toEqual(['서울대학교']);
  expect((await studentDb.applications.toArray()).map(a => a.id)).toEqual([mineApp.id]);
  expect(await studentDb.tasks.toArray()).toMatchObject([{ id: 'my-task', application_id: null }]);
  expect(await studentDb.attendance.count()).toBe(0);
  expect(await studentDb.boards.count()).toBe(0);
  expect(await teacherDb.meta.get('class')).toBeUndefined();
  expect(await adminDb.wiki.count()).toBe(0);
  expect(programs).toHaveLength(0);
  await initSample();
  expect(await studentDb.grades.count()).toBe(1);
});

test('다시 보기: 빈 자리에만 샘플을 넣고 내 기록은 덮지 않아요', async () => {
  await initSample(); await clearSample();
  await studentDb.attendance.put({ year: 2, school_days: 100, absence: { illness: 0, unexcused: 0, other: 0 }, tardy: { illness: 0, unexcused: 0, other: 0 }, early_leave: { illness: 0, unexcused: 0, other: 0 }, class_absence: { illness: 0, unexcused: 0, other: 0 } });
  await showSample();
  expect(isSampleMode()).toBe(true);
  expect(await studentDb.grades.count()).toBe(24);
  expect((await studentDb.attendance.get(2))!.school_days).toBe(100);
  expect((await studentDb.attendance.get(1))!.school_days).toBe(191);
  await clearSample();
  expect((await studentDb.attendance.toArray()).map(a => a.year)).toEqual([2]); // 내 출결은 남아요
});

test('백업(.jnavi)에는 샘플 행을 넣지 않아요', async () => {
  await initSample();
  await studentDb.grades.put(subject({ id: 'mine', semester: '1-1' }));
  const restored = await decryptBackup(await encryptBackup(await studentDb.snapshot(), 'password1'), 'password1');
  expect(restored.grades.map(g => g.id)).toEqual(['mine']);
  expect(restored.attendance).toEqual([]);
  expect(restored.interests).toEqual([]);
  expect(restored.planning).toEqual({ applications: [], tasks: [] });
  expect(restored.boards).toEqual([]);
});

test('관리자 공개 내보내기는 샘플 초안을 절대 싣지 않아요', () => {
  // 샘플에는 2인 검수 완료 초안(경희대학교 올해 특이점·수능 최저)이 있지만 공개 파일에는 못 들어가요.
  expect(() => buildWikiEntries(null, sampleWikiDrafts)).toThrow(/승인한 요약이 아직 없어요/);
  const real = { ...sampleWikiDrafts[2], sample: undefined };
  expect(buildWikiEntries(null, [...sampleWikiDrafts, real]).count).toBe(1);
  const done = { ...sampleFieldDraft, approvals: [...sampleFieldDraft.approvals, { reviewer: '관리자 B', at: '2026-11-20T01:30:00.000Z' }] };
  expect(() => buildWikiFile(null, done)).toThrow(/샘플 계열표/);
});
