import 'fake-indexeddb/auto';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { App } from '../src/App';
import { studentDb } from '../src/store/studentDb';
import { newApplication } from '../src/domain/planner';
import { addToBoard, boardWarnings, moveSlot, newBoard, parseBoards, updateSlot } from '../src/domain/board';
import { parseStudentBackup } from '../src/domain/student';

beforeEach(async () => { await studentDb.clearStudentData(); });
afterEach(cleanup);
const app = (university: string) => ({ ...newApplication(), university, program: '교과 전형' });

describe('수시 6장 규칙', () => {
  it('R-CARD-001: 6장 제한, 제외 기관은 따로 센다', () => {
    let b = newBoard('A안');
    for (let i = 0; i < 6; i++) b = addToBoard(b, `a${i}`, `대학${i}`);
    expect(() => addToBoard(b, 'a6', '대학6')).toThrow('6장을 모두 채웠어요');
    b = addToBoard(b, 'k', '광주과학기술원');
    expect([b.slots.length, b.exempt.length]).toEqual([6, 1]);
    expect(() => addToBoard(b, 'a0', '대학0')).toThrow('이미');
  });
  it('R-CARD-002: 같은 날 면접·논술 2개 이상이면 경고, R-CARD-003은 판정이 있을 때만', () => {
    let b = addToBoard(addToBoard(newBoard('A안'), 'x', '가'), 'y', '나');
    b = updateSlot(b, { ...b.slots[0], exam_kind: '면접', exam_date: '2027-11-20' });
    b = updateSlot(b, { ...b.slots[1], exam_kind: '면접', exam_date: '2027-11-20' });
    const names = (id: string) => ({ x: '가대', y: '나대' })[id]!;
    expect(boardWarnings(b, names).map(w => [w.code, w.title, w.message])).toEqual([['R-CARD-002', '면접 일정이 겹쳐요', '11월 20일(토)에 가대·나대 고사가 함께 있어요. 한 곳은 다른 카드로 바꿔 보세요.']]);
    expect(boardWarnings(b, names, () => '위험').map(w => w.code)).toEqual(['R-CARD-002', 'R-CARD-003']);
    expect(moveSlot(b, 0, 1).slots.map(s => s.application_id)).toEqual(['y', 'x']);
  });
  it('백업의 수시로 기록은 등록된 전형만 가리킬 수 있다', () => {
    const a = app('가대'), b = addToBoard(newBoard('A안'), a.id, a.university);
    expect(parseStudentBackup({ grades: [], attendance: [], planning: { applications: [a], tasks: [] }, boards: [b] }).boards).toHaveLength(1);
    expect(() => parseBoards([b], new Set())).toThrow();
    expect(() => parseStudentBackup({ grades: [], attendance: [], boards: [b] })).toThrow();
  });
});

describe('수시로 화면', () => {
  it('등록한 전형을 담고 순서를 바꾸고, 지운 전형은 보드에서도 빠진다', async () => {
    const a = app('가온대'), c = app('누리대');
    await studentDb.saveApplication(a); await studentDb.saveApplication(c);
    render(<MemoryRouter initialEntries={['/susiro']}><App /></MemoryRouter>);
    expect(await screen.findByRole('heading', { name: '아직 담은 대학이 없어요' })).toBeTruthy();
    expect((screen.getByRole('button', { name: '상담카드 보내기' }) as HTMLButtonElement).disabled).toBe(true);
    for (const n of ['가온대', '누리대']) {
      fireEvent.click(screen.getAllByRole('button', { name: '+ 대학 담기' })[0]);
      fireEvent.click(within(screen.getByRole('dialog', { name: '대학 담기' })).getByRole('button', { name: new RegExp(n) }));
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
      await screen.findByText(n);
    }
    expect(screen.getByText('6회 제한 2/6장')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '1순위 아래로' }));
    await waitFor(async () => expect((await studentDb.boards.toArray())[0].slots.map(s => s.application_id)).toEqual([c.id, a.id]));
    await studentDb.deleteApplication(c.id);
    await waitFor(async () => expect((await studentDb.boards.toArray())[0].slots.map(s => s.application_id)).toEqual([a.id]));
  });
});
