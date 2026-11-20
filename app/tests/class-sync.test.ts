import 'fake-indexeddb/auto';
import { beforeEach, expect, test, vi } from 'vitest';

// 서버 대신 메모리 행 하나. RLS는 서버 쪽(supabase/migrations) 몫이라 여기서는 묶음 왕복만 봐요.
const rows = new Map<string, { class_code: string; class_name: string; data: unknown; updated_at: string }>();
vi.mock('../src/io/supabase', () => {
  const query = (filter?: string) => ({
    single: async () => { const r = filter ? rows.get(filter) : [...rows.values()].at(-1); return r ? { data: r, error: null } : { data: null, error: { message: 'none' } }; },
  });
  return { supabase: {
    auth: { getUser: async () => ({ data: { user: { id: 'teacher-1' } } }) },
    from: () => ({
      upsert: (row: { class_code: string; class_name: string; data: unknown }) => { const r = { ...row, updated_at: '2026-11-20T03:00:00.000Z' }; rows.set(row.class_code, r); return { select: () => query(row.class_code) }; },
      select: () => ({ eq: (_c: string, code: string) => query(code), order: async () => ({ data: [...rows.values()], error: null }) }),
    }),
  } };
});

const { saveClassToServer, loadClassFromServer, listServerClasses } = await import('../src/io/classSync');
const { teacherDb } = await import('../src/store/teacherDb');
const { parseRoster } = await import('../src/domain/classroom');

beforeEach(async () => { rows.clear(); await teacherDb.clearClass(); });

test('학급 묶음을 서버에 올리고, 새 기기에서 그대로 불러온다', async () => {
  await teacherDb.createClass({ key: 'class', name: '3학년 2반', code: '7Q4K', created_at: '2026-11-20' }, parseRoster('7 하늘\n15 바다'));
  await teacherDb.memos.add({ number: '07', date: '2026-11-20', area: '진로', text: '간호 희망', next: '', next_done: false, created_at: '' });
  expect(await saveClassToServer()).toContain('2026-11-20');
  expect((await listServerClasses()).map(c => c.class_name)).toEqual(['3학년 2반']);
  await teacherDb.clearClass();
  await loadClassFromServer('7Q4K');
  expect((await teacherDb.students.toArray()).map(s => s.alias)).toEqual(['하늘', '바다']);
  expect((await teacherDb.memos.toArray())[0].text).toBe('간호 희망');
});

test('모양이 맞지 않는 서버 묶음은 기기 데이터를 바꾸지 않는다', async () => {
  await teacherDb.createClass({ key: 'class', name: '3학년 2반', code: '7Q4K', created_at: '2026-11-20' }, parseRoster('7 하늘'));
  rows.set('7Q4K', { class_code: '7Q4K', class_name: 'x', data: { version: 1, tables: { meta: [{ key: 'class', code: 'ZZZZ' }] } }, updated_at: '' });
  await expect(loadClassFromServer('7Q4K')).rejects.toThrow('모양');
  expect(await teacherDb.students.count()).toBe(1);
  await expect(saveClassToServer()).resolves.toBeTruthy();
});
