import Dexie, { type Table } from 'dexie';
import { useLiveQuery } from 'dexie-react-hooks';
import { parseStudentBackup, parseTargetPriorities, type GradeRecord, type AttendanceRecord, type StudentBackup } from '../domain/student';
import { addToBoard, moveSlot, newBoard, nextBoardName, parseBoards, removeFromBoard, reorderSlots, updateSlot, type Board, type BoardChange } from '../domain/board';
import { parseMocks, type MockScore, type Area } from '../domain/mock';
import { interestId, parseInterests, type Interest } from '../domain/interests';
import { isSampleId } from '../data/sample/rows';
import { parsePlannerData, emptyPlanner, sameApplication, type ApplicationPlan, type CounselTask, type PlannerData } from '../domain/planner';

export class StudentDatabase extends Dexie {
  grades!: Table<GradeRecord, string>;
  attendance!: Table<AttendanceRecord, number>;
  applications!: Table<ApplicationPlan, string>;
  tasks!: Table<CounselTask, string>;
  boards!: Table<Board, string>;
  mocks!: Table<MockScore, string>;
  interests!: Table<Interest, string>;
  preferences!: Table<{ id: string; targetPriorities: string[] }, string>;
  private legacyMigration?: Promise<void>;
  constructor(name = 'jinhak-navi-student-v1') {
    super(name);
    this.version(1).stores({ grades: 'id, semester', attendance: 'year' });
    this.version(2).stores({ grades: 'id, semester', attendance: 'year', applications: 'id, year, updated_at', tasks: 'id, application_id, due_date, kind' });
    this.version(3).stores({ grades: 'id, semester', attendance: 'year', applications: 'id, year, updated_at', tasks: 'id, application_id, due_date, kind', boards: 'id' });
    this.version(4).stores({ grades: 'id, semester', attendance: 'year', applications: 'id, year, updated_at', tasks: 'id, application_id, due_date, kind', boards: 'id', mocks: 'exam' });
    this.version(5).stores({ interests: 'id, university, created_at' });
    this.version(6).stores({ preferences: 'id' });
  }
  async migrateLegacyTargets() {
    if (this.name !== 'jinhak-navi-student-v1') return;
    if (!this.legacyMigration) this.legacyMigration = (async () => {
      let raw: string | null;
      try { raw = localStorage.getItem('jinhak-navi-score-trend-targets'); } catch { return; }
      if (raw === null) return;
      let ids: unknown; try { ids = JSON.parse(raw); } catch { return; }
      if (!Array.isArray(ids)) return;
      await this.transaction('rw', [this.applications, this.preferences], async () => {
        if (await this.preferences.get('score-trend-targets')) return;
        const existing = new Set(await this.applications.toCollection().primaryKeys());
        await this.preferences.put({ id: 'score-trend-targets', targetPriorities: [...new Set(ids.filter((id): id is string => typeof id === 'string' && existing.has(id)))].slice(0, 3) });
      });
      try { localStorage.removeItem('jinhak-navi-score-trend-targets'); } catch { /* DB is now authoritative. */ }
    })().catch(error => { this.legacyMigration = undefined; throw error; });
    return this.legacyMigration;
  }
  async saveTargetPriorities(ids: string[]) {
    await this.migrateLegacyTargets();
    await this.transaction('rw', [this.applications, this.preferences], async () => {
      const targetPriorities = parseTargetPriorities(ids, new Set(await this.applications.toCollection().primaryKeys()));
      await this.preferences.put({ id: 'score-trend-targets', targetPriorities });
    });
  }
  async snapshot(): Promise<StudentBackup> {
    await this.migrateLegacyTargets();
    return this.transaction('r', [this.grades, this.attendance, this.applications, this.tasks, this.boards, this.mocks, this.interests, this.preferences], async () => {
      const preference = await this.preferences.get('score-trend-targets');
      return { grades: await this.grades.toArray(), attendance: await this.attendance.toArray(), planning: await this.planningSnapshot(), boards: await this.boards.toArray(), mocks: await this.mocks.toArray(), interests: await this.interests.toArray(), ...(preference ? { targetPriorities: preference.targetPriorities } : {}) };
    });
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
    }).then(async result => {
      // 지원 준비에 담은 전형은 관심 전형(하트)에도 담아 내 비교 · 될각에 바로 보여요(2026-11-27 사용자 요청). 관심 저장이 실패해도 지원 준비는 그대로예요
      if (result.created && !isSampleId(candidate.id)) await this.setInterest(candidate.university, candidate.program, true, candidate.department || undefined).catch(() => undefined);
      return result;
    });
  }
  /** 예전에 지원 준비에만 담긴 전형을 관심 전형에도 넣어요(한 번만, 이미 있으면 그대로). */
  async syncApplicationInterests() {
    for (const a of await this.applications.toArray()) {
      if (isSampleId(a.id) || !a.university.trim() || !a.program.trim()) continue;
      if (!await this.interests.get(interestId(a.university, a.program, a.department || undefined))) await this.setInterest(a.university, a.program, true, a.department || undefined).catch(() => undefined);
    }
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
    await this.transaction('rw', [this.applications, this.tasks, this.boards, this.preferences], async () => {
      await this.applications.delete(id);
      const preference = await this.preferences.get('score-trend-targets');
      if (preference) await this.preferences.put({ ...preference, targetPriorities: preference.targetPriorities.filter(value => value !== id) });
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
  /** create: 아직 저장하지 않은 안에 처음 담을 때 true 또는 그 안 이름(비어 있으면 그 이름으로 만들어요). */
  async changeBoard(id: string, change: BoardChange, create: boolean | string = false): Promise<Board> {
    return this.transaction('rw', [this.applications, this.boards], async () => {
      let board = await this.boards.get(id);
      if (!board) {
        if (!create || change.kind !== 'add') throw new Error('이 안이 삭제됐어요. 다른 안을 선택해 주세요.');
        const all = await this.boards.toArray(), fallback = nextBoardName(all);
        board = { ...newBoard(typeof create === 'string' && !all.some(b => b.name === create) ? create : fallback), id };
      }
      const apps = await this.applications.toArray();
      let next: Board;
      if (change.kind === 'add') {
        const app = apps.find(a => a.id === change.application_id);
        if (!app) throw new Error('지원 준비에서 삭제된 전형이에요. 목록을 다시 확인해 주세요.');
        if ([...board.slots, ...board.exempt].some(slot => apps.find(item => item.id === slot.application_id)?.year !== app.year)) throw new Error('같은 지원 학년도의 전형만 한 안에 담을 수 있어요. 다른 안을 선택하거나 새 안을 만들어 주세요.');
        next = addToBoard(board, app.id, app.university);
      } else if (change.kind === 'order') {
        next = reorderSlots(board, change.ids);
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
  async clearStudentData() { await this.restore({ grades: [], attendance: [], planning: emptyPlanner(), boards: [], mocks: [], interests: [], targetPriorities: [] }); }
  async restore(value: unknown) {
    const data = parseStudentBackup(value);
    await this.migrateLegacyTargets();
    await this.transaction('rw', [this.grades, this.attendance, this.applications, this.tasks, this.boards, this.mocks, this.interests, this.preferences], async () => {
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
        const preference = await this.preferences.get('score-trend-targets');
        if (data.targetPriorities !== undefined || preference) await this.preferences.put({ id: 'score-trend-targets', targetPriorities: data.targetPriorities ?? preference!.targetPriorities.filter(id => data.planning!.applications.some(a => a.id === id)) });
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
