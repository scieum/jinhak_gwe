import Dexie, { type Table } from 'dexie';
import { useLiveQuery } from 'dexie-react-hooks';
import type { CardRecord, ClassInfo, HomeroomLog, Memo, Student } from '../domain/classroom';
import type { MockGrades, SchoolGrades } from '../domain/scoreImport';
import type { Target } from '../domain/minimum';
import type { Outcome, RawMock } from '../domain/outcomes';
import type { ClassSchedule, ScheduleDone } from '../domain/classCalendar';

// shortcut: 학급 데이터는 교사 브라우저 IndexedDB에 평문으로 있어요(PRD 7-3은 암호화·서버 RLS). Supabase 붙일 때 서버로 옮겨요.
export class TeacherDatabase extends Dexie {
  meta!: Table<ClassInfo, string>;
  students!: Table<Student, string>;
  cards!: Table<CardRecord, number>;
  memos!: Table<Memo, number>;
  mocks!: Table<MockGrades, [string, string]>;
  school!: Table<SchoolGrades, string>;
  logs!: Table<HomeroomLog, number>;
  targets!: Table<Target, string>;
  outcomes!: Table<Outcome, number>;
  rawMocks!: Table<RawMock, [string, string]>;
  schedules!: Table<ClassSchedule, number>;
  scheduleDone!: Table<ScheduleDone, string>;
  constructor(name = 'jinhak-navi-teacher-v1') {
    super(name);
    this.version(1).stores({ meta: 'key', students: 'number', cards: '++id, number', memos: '++id, number' });
    this.version(2).stores({ meta: 'key', students: 'number', cards: '++id, number', memos: '++id, number', mocks: '[number+exam], number, exam', school: 'number' });
    this.version(3).stores({ meta: 'key', students: 'number', cards: '++id, number', memos: '++id, number', mocks: '[number+exam], number, exam', school: 'number', logs: '++id, date' });
    this.version(4).stores({ meta: 'key', students: 'number', cards: '++id, number', memos: '++id, number', mocks: '[number+exam], number, exam', school: 'number', logs: '++id, date', targets: 'number' });
    this.version(5).stores({ meta: 'key', students: 'number', cards: '++id, number', memos: '++id, number', mocks: '[number+exam], number, exam', school: 'number', logs: '++id, date', targets: 'number', outcomes: '++id, number', rawMocks: '[number+exam], number' });
    // 우리 반 입시 일정(class-calendar): 새 테이블 2개만 더해요. 기존 테이블은 그대로라 데이터 옮기기가 필요 없어요.
    this.version(6).stores({ schedules: '++id', scheduleDone: 'key' });
  }
  async createClass(info: ClassInfo, students: readonly Student[]) {
    await this.transaction('rw', [this.meta, this.students], async () => { await this.meta.put(info); await this.students.clear(); await this.students.bulkPut([...students]); });
  }
  async clearClass() { await Promise.all(this.tables.map(t => t.clear())); }
  /** 백업으로 모든 표를 바꿔요. 한 트랜잭션이라 중간에 실패하면 기존 학급이 그대로 남아요. 백업에 없는 표(옛 백업)는 비워요. */
  async restore(tables: Record<string, readonly unknown[]>) {
    await this.transaction('rw', this.tables, async () => {
      for (const t of this.tables) { await t.clear(); if (tables[t.name]?.length) await t.bulkAdd([...tables[t.name]] as never[]); }
    });
  }
}
export const teacherDb = new TeacherDatabase();

export interface ClassState { info: ClassInfo | null; students: Student[]; cards: CardRecord[]; memos: Memo[]; mocks: MockGrades[]; school: SchoolGrades[]; logs: HomeroomLog[]; targets: Target[]; outcomes: Outcome[]; rawMocks: RawMock[]; schedules: ClassSchedule[]; scheduleDone: ScheduleDone[] }
export function useClass(): { data: ClassState | null; error: string } | undefined {
  return useLiveQuery(async () => {
    try {
      return { error: '', data: await teacherDb.transaction('r', teacherDb.tables, async () => ({ info: (await teacherDb.meta.get('class')) ?? null,
        students: await teacherDb.students.orderBy('number').toArray(), cards: await teacherDb.cards.toArray(), memos: await teacherDb.memos.toArray(),
        mocks: await teacherDb.mocks.toArray(), school: await teacherDb.school.toArray(), logs: await teacherDb.logs.toArray(), targets: await teacherDb.targets.toArray(),
        outcomes: await teacherDb.outcomes.toArray(), rawMocks: await teacherDb.rawMocks.toArray(),
        schedules: await teacherDb.schedules.toArray(), scheduleDone: await teacherDb.scheduleDone.toArray() })) };
    } catch { return { data: null, error: '이 브라우저에서 학급 저장소를 열 수 없어요. 저장 권한과 비공개 모드를 확인해 주세요.' }; }
  }, []);
}
