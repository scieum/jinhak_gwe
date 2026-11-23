import { supabase } from './supabase';
import { CLASS_CODE } from './exchange';
import { teacherDb } from '../store/teacherDb';
import type { ClassInfo } from '../domain/classroom';

/**
 * 학급 데이터 서버 보관(PRD 7-3, supabase/migrations class_snapshots). 기기 저장소(Dexie) 표를 통째로 한 행에 올려요.
 * shortcut: 마지막 저장이 이겨요. 여러 기기에서 동시에 고치는 일이 잦아지면 표별 동기화로 바꿔요.
 */
const TABLES = ['meta', 'students', 'cards', 'memos', 'mocks', 'school', 'logs', 'targets', 'outcomes', 'rawMocks', 'schedules', 'scheduleDone'] as const; // 예전 묶음에 없는 테이블은 빈 목록으로 읽어요
type Snapshot = { version: 1; tables: Record<string, unknown[]> };
const db = () => { if (!supabase) throw new Error('계정 서버를 준비하고 있어요.'); return supabase; };

export async function saveClassToServer(): Promise<string> {
  const tables: Record<string, unknown[]> = {};
  await teacherDb.transaction('r', teacherDb.tables, async () => { for (const t of TABLES) tables[t] = await teacherDb.table(t).toArray(); });
  const info = (tables.meta as ClassInfo[]).find(m => m.key === 'class');
  if (!info) throw new Error('먼저 학급을 만들어 주세요.');
  const { data: user } = await db().auth.getUser();
  if (!user.user) throw new Error('로그인한 뒤에 서버에 저장할 수 있어요.');
  const { data, error } = await db().from('class_snapshots').upsert({ owner: user.user.id, class_code: info.code, class_name: info.name, data: { version: 1, tables } satisfies Snapshot }).select('updated_at').single();
  if (error) throw new Error('서버에 저장하지 못했어요. 잠시 후 다시 시도해 주세요.');
  return data.updated_at as string;
}

export interface ServerClass { class_code: string; class_name: string; updated_at: string }
export async function listServerClasses(): Promise<ServerClass[]> {
  const { data, error } = await db().from('class_snapshots').select('class_code, class_name, updated_at').order('updated_at', { ascending: false });
  if (error) throw new Error('서버의 학급 목록을 읽지 못했어요.');
  return data as ServerClass[];
}

/** 서버 묶음으로 이 기기 학급 데이터를 바꿔요. 받은 묶음도 모양을 확인해요. */
export async function loadClassFromServer(code: string) {
  if (!CLASS_CODE.test(code)) throw new Error('학급 코드가 올바르지 않아요.');
  const { data, error } = await db().from('class_snapshots').select('data').eq('class_code', code).single();
  if (error || !data) throw new Error('서버에서 학급을 읽지 못했어요.');
  const snap = data.data as Snapshot;
  if (!snap || snap.version !== 1 || typeof snap.tables !== 'object' || !TABLES.every(t => Array.isArray(snap.tables[t] ?? []))) throw new Error('서버의 학급 묶음 모양이 맞지 않아요.');
  const info = (snap.tables.meta as ClassInfo[] | undefined)?.find(m => m?.key === 'class');
  if (!info || info.code !== code) throw new Error('서버의 학급 묶음 모양이 맞지 않아요.');
  await teacherDb.transaction('rw', teacherDb.tables, async () => {
    for (const t of TABLES) { const table = teacherDb.table(t); await table.clear(); await table.bulkPut(snap.tables[t] ?? []); }
  });
}
