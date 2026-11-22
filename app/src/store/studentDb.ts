import Dexie, { type Table } from 'dexie';
import { useLiveQuery } from 'dexie-react-hooks';
import { parseStudentBackup, type GradeRecord, type AttendanceRecord, type StudentBackup } from '../domain/student';
import { addToBoard, moveSlot, newBoard, nextBoardName, parseBoards, removeFromBoard, updateSlot, type Board, type BoardChange } from '../domain/board';
import { parseMocks, type MockScore, type Area } from '../domain/mock';
import { interestId, parseInterests, type Interest } from '../domain/interests';
import { parsePlannerData, emptyPlanner, sameApplication, type ApplicationPlan, type CounselTask, type PlannerData } from '../domain/planner';

export class StudentDatabase extends Dexie {
  grades!: Table<GradeRecord, string>;
  attendance!: Table<AttendanceRecord, number>;
  applications!: Table<ApplicationPlan, string>;
  tasks!: Table<CounselTask, string>;
  boards!: Table<Board, string>;
  mocks!: Table<MockScore, string>;
  interests!: Table<Interest, string>;
  constructor(name = 'jinhak-navi-student-v1') {
    super(name);
    this.version(1).stores({ grades: 'id, semester', attendance: 'year' });
    this.version(2).stores({ grades: 'id, semester', attendance: 'year', applications: 'id, year, updated_at', tasks: 'id, application_id, due_date, kind' });
    this.version(3).stores({ grades: 'id, semester', attendance: 'year', applications: 'id, year, updated_at', tasks: 'id, application_id, due_date, kind', boards: 'id' });
    this.version(4).stores({ grades: 'id, semester', attendance: 'year', applications: 'id, year, updated_at', tasks: 'id, application_id, due_date, kind', boards: 'id', mocks: 'exam' });
    this.version(5).stores({ interests: 'id, university, created_at' });
  }
  async snapshot(): Promise<StudentBackup> {
    return this.transaction('r', [this.grades, this.attendance, this.applications, this.tasks, this.boards, this.mocks, this.interests], async () => ({ grades: await this.grades.toArray(), attendance: await this.attendance.toArray(), planning: await this.planningSnapshot(), boards: await this.boards.toArray(), mocks: await this.mocks.toArray(), interests: await this.interests.toArray() }));
  }
  async planningSnapshot(): Promise<PlannerData> { return { applications: await this.applications.toArray(), tasks: await this.tasks.toArray() }; }
  async addApplication(value: ApplicationPlan): Promise<{ id: string; created: boolean }> {
    const candidate = parsePlannerData({ applications: [value], tasks: [] }).applications[0];
    // Duplicate detection and insert share a transaction, including across tabs.
    // Returning an existing record must never reset its completed work or notes.
    return this.transaction('rw', [this.applications, this.tasks], async () => {
      const all = await this.planningSnapshot();
      const existing = all.applications.find(a => sameApplication(a, candidate));
      if (existing) return { id: existing.id, created: false };
      if (all.applications.length >= 100) throw new Error('지원 준비 전형은 100개까지 등록할 수 있어요. 기존 목록을 정리해 주세요.');
      const clean = parsePlannerData({ ...all, applications: [...all.applications, candidate] });
      await this.applications.add(clean.applications.find(a => a.id === candidate.id)!);
      return { id: candidate.id, created: true };
    });
  }
  async saveApplication(value: ApplicationPlan) {
    await this.transaction('rw', [this.applications, this.tasks], async () => {
      const all = await this.planningSnapshot();
      const clean = parsePlannerData({ ...all, applications: [...all.applications.filter(a => a.id !== value.id), value] });
      await this.applications.put(clean.applications.find(a => a.id === value.id)!);
    });
  }
  async saveTask(value: CounselTask) {
    await this.transaction('rw', [this.applications, this.tasks], async () => {
      const all = await this.planningSnapshot();
      const clean = parsePlannerData({ ...all, tasks: [...all.tasks.filter(t => t.id !== value.id), value] });
      await this.tasks.put(clean.tasks.find(t => t.id === value.id)!);
    });
  }
  async deleteApplication(id: string) {
    await this.transaction('rw', [this.applications, this.tasks, this.boards], async () => {
      await this.applications.delete(id);
      for (const b of await this.boards.toArray()) await this.boards.put(removeFromBoard(b, id));
      await this.tasks.where('application_id').equals(id).modify({ application_id: null, updated_at: new Date().toISOString() });
    });
  }
  async saveBoard(value: Board) {
    await this.transaction('rw', [this.applications, this.boards], async () => {
      const ids = new Set((await this.applications.toArray()).map(a => a.id));
      await this.boards.put(parseBoards([value], ids)[0]);
    });
  }
  async createScenario(sourceId?: string): Promise<Board> {
    return this.transaction('rw', [this.applications, this.boards], async () => {
      const boards = await this.boards.toArray();
      const source = sourceId ? boards.find(b => b.id === sourceId) : undefined;
      if (sourceId && !source) throw new Error('복사할 안이 없어요. 다른 안을 선택해 주세요.');
      const next = newBoard(nextBoardName(boards));
      if (source) { next.slots = source.slots.map(s => ({ ...s })); next.exempt = source.exempt.map(s => ({ ...s })); }
      const ids = new Set((await this.applications.toArray()).map(a => a.id));
      const clean = parseBoards([next], ids)[0];
      await this.boards.add(clean);
      return clean;
    });
  }
  async changeBoard(id: string, change: BoardChange, create = false): Promise<Board> {
    return this.transaction('rw', [this.applications, this.boards], async () => {
      let board = await this.boards.get(id);
      if (!board) {
        if (!create || change.kind !== 'add') throw new Error('이 안이 삭제됐어요. 다른 안을 선택해 주세요.');
        board = { ...newBoard(nextBoardName(await this.boards.toArray())), id };
      }
      const apps = await this.applications.toArray();
      let next: Board;
      if (change.kind === 'add') {
        const app = apps.find(a => a.id === change.application_id);
        if (!app) throw new Error('지원 준비에서 삭제된 전형이에요. 목록을 다시 확인해 주세요.');
        if ([...board.slots, ...board.exempt].some(slot => apps.find(item => item.id === slot.application_id)?.year !== app.year)) throw new Error('같은 지원 학년도의 전형만 한 안에 담을 수 있어요. 다른 안을 선택하거나 새 안을 만들어 주세요.');
        next = addToBoard(board, app.id, app.university);
      } else {
        const applicationId = change.kind === 'update' ? change.slot.application_id : change.application_id;
        if (![...board.slots, ...board.exempt].some(s => s.application_id === applicationId)) throw new Error('이 카드는 이미 안에서 빠졌어요. 목록을 다시 확인해 주세요.');
        if (change.kind === 'update') next = updateSlot(board, change.slot);
        else if (change.kind === 'remove') next = removeFromBoard(board, applicationId);
        else {
          const index = board.slots.findIndex(s => s.application_id === applicationId);
          if (index < 0) throw new Error('6회 제외 카드는 순위를 바꾸지 않아요.');
          next = moveSlot(board, index, change.delta);
        }
      }
      const clean = parseBoards([next], new Set(apps.map(a => a.id)))[0];
      await this.boards.put(clean);
      return clean;
    });
  }
  async saveMock(value: MockScore) { await this.mocks.put(parseMocks([value])[0]); }
  async saveMockArea(exam: string, area: Area, value: number | undefined) {
    // Read and merge inside one transaction so rapid edits cannot overwrite other areas.
    await this.transaction('rw', this.mocks, async () => {
      const saved = await this.mocks.get(exam);
      const raw = { ...saved?.raw };
      if (value === undefined) delete raw[area]; else raw[area] = value;
      await this.saveMock({ exam, raw, updated_at: new Date().toISOString() });
    });
  }
  async deleteBoard(id: string) { await this.boards.delete(id); }
  async setInterest(university: string, program: string, saved: boolean, department?: string) {
    const item = parseInterests([{ id: interestId(university, program, department), university, program,
      ...(department !== undefined ? { department } : {}), created_at: new Date().toISOString() }])[0];
    await this.transaction('rw', this.interests, async () => {
      if (!saved) { await this.interests.delete(item.id); return; }
      const existing = await this.interests.get(item.id);
      const legacy = item.department ? await this.interests.get(interestId(item.university, item.program)) : undefined;
      if (!existing && await this.interests.count() - (legacy ? 1 : 0) >= 500) throw new Error('관심 전형은 500개까지 담을 수 있어요. 먼저 목록을 정리해 주세요.');
      if (!existing) await this.interests.add(item);
      // A deliberate department choice replaces the old unspecified bookmark atomically.
      if (legacy) await this.interests.delete(legacy.id);
    });
  }
  async clearStudentData() { await this.restore({ grades: [], attendance: [], planning: emptyPlanner(), boards: [], mocks: [], interests: [] }); }
  async restore(value: unknown) {
    const data = parseStudentBackup(value);
    await this.transaction('rw', [this.grades, this.attendance, this.applications, this.tasks, this.boards, this.mocks, this.interests], async () => {
      await this.grades.clear();
      // Older backups have no interests field and must preserve this device's list.
      if (data.interests !== undefined) { await this.interests.clear(); await this.interests.bulkPut(data.interests); }
      // Legacy backups without mock scores keep the ones on this device.
      if (data.mocks !== undefined) { await this.mocks.clear(); await this.mocks.bulkPut(data.mocks); } await this.attendance.clear();
      await this.grades.bulkPut(data.grades); await this.attendance.bulkPut(data.attendance);
      // A legacy grade-only backup must not erase newer preparation records.
      if (data.planning !== undefined) {
        await this.applications.clear(); await this.tasks.clear();
        await this.applications.bulkPut(data.planning.applications); await this.tasks.bulkPut(data.planning.tasks);
        // Boards point at applications; a restored plan list invalidates boards from the old list.
        await this.boards.clear(); await this.boards.bulkPut(data.boards ?? []);
      }
    });
  }
}
export function usePlanner() {
  return useLiveQuery(async () => {
    try { return { data: await studentDb.transaction('r', [studentDb.applications, studentDb.tasks], () => studentDb.planningSnapshot()), error: '' }; }
    catch { return { data: null, error: '기기 저장소를 열지 못했어요. 브라우저 저장 권한을 확인해 주세요.' }; }
  }, []);
}
export const studentDb = new StudentDatabase();
export function useStudent() {
  return useLiveQuery(async () => {
    try { return { data: await studentDb.snapshot(), error: '' }; }
    catch { return { data: null, error: '이 브라우저에서 기기 저장소를 열 수 없어요. 저장 권한과 비공개 모드를 확인해 주세요.' }; }
  }, []);
}
