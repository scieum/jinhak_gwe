import { validDate } from './planner';
import type { Judgment } from '../engine/judgment';
import { cardExemptInstitutions } from '../data/card-exempt';

export const LIMIT = 6;
export const SCENARIO_NAMES = ['A안', 'B안', 'C안', 'D안', 'E안'] as const;
export function nextBoardName(boards: readonly Board[]): string {
  const name = SCENARIO_NAMES.find(name => !boards.some(b => b.name === name));
  if (boards.length >= SCENARIO_NAMES.length || !name) throw new Error('수시로는 5개 안까지 만들 수 있어요. 사용하지 않는 안을 삭제한 뒤 다시 시도해 주세요.');
  return name;
}
export const csatStates = { none: '최저 없음', has: '최저 있음', check: '최저 확인 필요' } as const;
export const examKinds = { none: '고사 없음', 면접: '면접', 논술: '논술', 실기: '실기' } as const;
export interface BoardSlot { application_id: string; exam_kind: keyof typeof examKinds; exam_date: string | null; csat: keyof typeof csatStates; memo: string }
export interface Board { id: string; name: string; slots: BoardSlot[]; exempt: BoardSlot[]; updated_at: string }
export type BoardChange =
  | { kind: 'add'; application_id: string }
  | { kind: 'remove'; application_id: string }
  | { kind: 'move'; application_id: string; delta: -1 | 1 }
  | { kind: 'update'; slot: BoardSlot };
export interface CardWarning { code: string; title: string; message: string; slots: string[] }

export const newBoard = (name: string): Board => ({ id: crypto.randomUUID(), name, slots: [], exempt: [], updated_at: new Date().toISOString() });
export const newSlot = (application_id: string): BoardSlot => ({ application_id, exam_kind: 'none', exam_date: null, csat: 'check', memo: '' });
/** R-CARD-001: the exempt list is data (src/data/card-exempt.ts), not code branches. */
export const isExempt = (university: string) => cardExemptInstitutions.includes(university.replace(/\s/g, ''));

export function addToBoard(board: Board, application_id: string, university: string): Board {
  if ([...board.slots, ...board.exempt].some(s => s.application_id === application_id)) throw new Error('이미 이 안에 담은 전형이에요.');
  if (isExempt(university)) return { ...board, exempt: [...board.exempt, newSlot(application_id)], updated_at: new Date().toISOString() };
  if (board.slots.length >= LIMIT) throw new Error('6회 제한 6장을 모두 채웠어요. 한 칸을 비우면 담을 수 있어요');
  return { ...board, slots: [...board.slots, newSlot(application_id)], updated_at: new Date().toISOString() };
}
export function removeFromBoard(board: Board, application_id: string): Board {
  return { ...board, slots: board.slots.filter(s => s.application_id !== application_id), exempt: board.exempt.filter(s => s.application_id !== application_id), updated_at: new Date().toISOString() };
}
export function moveSlot(board: Board, index: number, delta: -1 | 1): Board {
  const to = index + delta;
  if (to < 0 || to >= board.slots.length) return board;
  const slots = [...board.slots];
  [slots[index], slots[to]] = [slots[to], slots[index]];
  return { ...board, slots, updated_at: new Date().toISOString() };
}
export function updateSlot(board: Board, slot: BoardSlot): Board {
  const map = (list: BoardSlot[]) => list.map(s => s.application_id === slot.application_id ? slot : s);
  return { ...board, slots: map(board.slots), exempt: map(board.exempt), updated_at: new Date().toISOString() };
}

const dayLabel = (d: string) => { const t = new Date(`${d}T00:00:00`); return `${t.getMonth() + 1}월 ${t.getDate()}일(${'일월화수목금토'[t.getDay()]})`; };
/** R-CARD-002 and R-CARD-003. Judgments are null until a reviewed rule exists; then the balance check is skipped. */
export function boardWarnings(board: Board, names: (id: string) => string, judgments: (id: string) => Judgment | null = () => null): CardWarning[] {
  const out: CardWarning[] = [];
  const byDate = new Map<string, BoardSlot[]>();
  for (const s of [...board.slots, ...board.exempt]) if ((s.exam_kind === '면접' || s.exam_kind === '논술') && s.exam_date) byDate.set(s.exam_date, [...(byDate.get(s.exam_date) ?? []), s]);
  for (const [date, list] of [...byDate].sort()) if (list.length >= 2) out.push({ code: 'R-CARD-002', title: `${list[0].exam_kind === list[1].exam_kind ? list[0].exam_kind : '고사'} 일정이 겹쳐요`,
    message: `${dayLabel(date)}에 ${list.map(s => names(s.application_id)).join('·')} 고사가 함께 있어요. 한 곳은 다른 카드로 바꿔 보세요.`, slots: list.map(s => s.application_id) });
  const judged = board.slots.map(s => judgments(s.application_id));
  if (board.slots.length && judged.every(j => j !== null)) {
    const count = (l: Judgment[]) => judged.filter(j => l.includes(j!)).length, risky = count(['소신', '위험']), safe = count(['안정']);
    if (risky >= 4 || safe === 0) out.push({ code: 'R-CARD-003', title: '소신·위험 쪽으로 쏠렸어요', message: `${board.slots.length}장 중 ${risky}장이 소신·위험이고 안정은 ${safe}장이에요. 입결과 비교하면 안정에 드는 카드를 1장 이상 넣어 보세요.`,
      slots: board.slots.filter((_, i) => judged[i] === '소신' || judged[i] === '위험').map(s => s.application_id) });
    else if (safe >= 5) out.push({ code: 'R-CARD-003', title: '하향 쪽으로 쏠렸어요', message: `${board.slots.length}장 중 ${safe}장이 안정이에요. 적정·소신 카드도 함께 살펴보세요.`,
      slots: board.slots.filter((_, i) => judged[i] === '안정').map(s => s.application_id) });
  }
  return out;
}

const text = (v: unknown, max = 500) => typeof v === 'string' && v.length <= max;
export function parseBoards(value: unknown, applicationIds: ReadonlySet<string>): Board[] {
  const fail = (): never => { throw new Error('수시로 기록 형식을 확인해 주세요.'); };
  if (!Array.isArray(value) || value.length > 10) return fail();
  const slot = (s: BoardSlot): BoardSlot => {
    if (!s || !applicationIds.has(s.application_id) || !Object.hasOwn(examKinds, s.exam_kind) || !Object.hasOwn(csatStates, s.csat) || !text(s.memo, 200)
      || !(s.exam_date === null || typeof s.exam_date === 'string' && validDate(s.exam_date))) return fail();
    return { application_id: s.application_id, exam_kind: s.exam_kind, exam_date: s.exam_date, csat: s.csat, memo: s.memo };
  };
  const boards = value.map((b: Board) => {
    if (!b || !text(b.id, 100) || !b.id || !text(b.name, 20) || !b.name.trim() || !Array.isArray(b.slots) || !Array.isArray(b.exempt) || b.slots.length > LIMIT || b.exempt.length > 20 || !text(b.updated_at, 40)) return fail();
    const all = [...b.slots, ...b.exempt].map(s => s?.application_id);
    if (new Set(all).size !== all.length) return fail();
    return { id: b.id, name: b.name.trim(), slots: b.slots.map(slot), exempt: b.exempt.map(slot), updated_at: b.updated_at };
  });
  if (new Set(boards.map(b => b.id)).size !== boards.length) return fail();
  return boards;
}
