import 'fake-indexeddb/auto';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { App } from '../src/App';
import { studentDb } from '../src/store/studentDb';
import { addToBoard, newBoard, updateSlot } from '../src/domain/board';
import { newApplication, newCounselTask } from '../src/domain/planner';

const application = (university: string) => ({ ...newApplication(), university, program: '테스트 전형' });
const at = () => render(<MemoryRouter initialEntries={['/susiro']}><App /></MemoryRouter>);
async function seed() {
  const a = application('가온대'), b = application('누리대'), exempt = application('광주과학기술원');
  for (const p of [a, b, exempt]) await studentDb.saveApplication(p);
  let board = addToBoard(addToBoard(addToBoard(newBoard('A안'), a.id, a.university), b.id, b.university), exempt.id, exempt.university);
  board = updateSlot(board, { ...board.slots[0], exam_kind: '면접', exam_date: '2027-10-12', csat: 'has', memo: '원래 메모' });
  await studentDb.saveBoard(board);
  return { a, b, exempt, board };
}
beforeEach(async () => { await studentDb.clearStudentData(); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

test('copy preserves order, exempt cards, dates and memos while edits remain independent', async () => {
  const { board } = await seed();
  const copy = await studentDb.createScenario(board.id);
  expect(copy.id).not.toBe(board.id); expect(copy.name).toBe('B안');
  expect(copy.slots).toEqual(board.slots); expect(copy.exempt).toEqual(board.exempt);
  await studentDb.changeBoard(copy.id, { kind: 'update', slot: { ...copy.slots[0], memo: '복사본 수정' } });
  expect(await studentDb.boards.get(board.id)).toEqual(board);
  expect((await studentDb.boards.get(copy.id))?.slots[0].memo).toBe('복사본 수정');
  expect(await studentDb.applications.count()).toBe(3);
});

test('concurrent creation assigns unique names, respects five scenarios, reuses deleted names', async () => {
  const created = await Promise.all(Array.from({ length: 5 }, () => studentDb.createScenario()));
  expect(created.map(b => b.name).sort()).toEqual(['A안', 'B안', 'C안', 'D안', 'E안']);
  await expect(studentDb.createScenario()).rejects.toThrow('5개');
  await expect(studentDb.createScenario(created[0].id)).rejects.toThrow('5개');
  await studentDb.deleteBoard(created.find(b => b.name === 'C안')!.id);
  expect((await studentDb.createScenario()).name).toBe('C안');
});

test('rapid edits to separate slots merge and moving uses the latest card identity', async () => {
  const { board, a, b } = await seed();
  await Promise.all([
    studentDb.changeBoard(board.id, { kind: 'update', slot: { ...board.slots[0], memo: '첫 카드' } }),
    studentDb.changeBoard(board.id, { kind: 'update', slot: { ...board.slots[1], memo: '둘째 카드' } }),
    studentDb.changeBoard(board.id, { kind: 'move', application_id: b.id, delta: -1 }),
  ]);
  const saved = (await studentDb.boards.get(board.id))!;
  expect(saved.slots.map(s => [s.application_id, s.memo])).toEqual([[b.id, '둘째 카드'], [a.id, '첫 카드']]);
});

test('two additions to the final slot cannot exceed the limit', async () => {
  const apps = Array.from({ length: 7 }, (_, i) => application(`대학${i}`));
  for (const a of apps) await studentDb.saveApplication(a);
  let board = newBoard('A안'); for (const a of apps.slice(0, 5)) board = addToBoard(board, a.id, a.university);
  await studentDb.saveBoard(board);
  const results = await Promise.allSettled(apps.slice(5).map(a => studentDb.changeBoard(board.id, { kind: 'add', application_id: a.id })));
  expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
  expect((await studentDb.boards.get(board.id))?.slots).toHaveLength(6);
});

test('stale changes cannot recreate a deleted board or removed card', async () => {
  const { board, a } = await seed();
  await studentDb.changeBoard(board.id, { kind: 'remove', application_id: a.id });
  await expect(studentDb.changeBoard(board.id, { kind: 'update', slot: board.slots[0] })).rejects.toThrow('이미');
  await studentDb.deleteBoard(board.id);
  await expect(studentDb.changeBoard(board.id, { kind: 'add', application_id: a.id })).rejects.toThrow('삭제');
  await expect(studentDb.createScenario(board.id)).rejects.toThrow('복사할 안');
  expect(await studentDb.boards.count()).toBe(0);
});

test('invalid slot updates and deleted applications leave the scenario intact', async () => {
  const { board } = await seed();
  await expect(studentDb.changeBoard(board.id, { kind: 'update', slot: { ...board.slots[0], exam_date: '2027-02-30' } })).rejects.toThrow();
  await expect(studentDb.changeBoard(board.id, { kind: 'add', application_id: 'missing' })).rejects.toThrow('삭제된 전형');
  expect(await studentDb.boards.get(board.id)).toEqual(board);
});

test('copied scenarios survive backup restore, and deleting one keeps preparation, interests and others', async () => {
  const { a, board } = await seed();
  await studentDb.setInterest(a.university, a.program, true);
  await studentDb.saveTask({ ...newCounselTask(a.id), title: '남길 질문' });
  const copy = await studentDb.createScenario(board.id), snapshot = await studentDb.snapshot();
  await studentDb.clearStudentData(); await studentDb.restore(snapshot);
  expect(await studentDb.snapshot()).toEqual(snapshot);
  await studentDb.deleteBoard(copy.id);
  const after = await studentDb.snapshot();
  expect(after.boards).toEqual([board]); expect(after.planning).toEqual(snapshot.planning); expect(after.interests).toEqual(snapshot.interests);
});

test('UI copies the active scenario and switches to an independently editable copy', async () => {
  const { board } = await seed(); at();
  fireEvent.click(await screen.findByRole('button', { name: '안 관리' }));
  fireEvent.click(within(screen.getByRole('dialog', { name: '안 관리' })).getByRole('button', { name: 'A안 복사해서 새 안 만들기' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'B안' }).getAttribute('aria-pressed')).toBe('true'));
  await waitFor(() => expect(screen.getAllByRole('button', { name: /상세$/ })).toHaveLength(3));
  fireEvent.click(screen.getAllByRole('button', { name: /상세$/ })[0]);
  fireEvent.change(screen.getByLabelText('메모'), { target: { value: 'B안의 메모' } });
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: '저장' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  // 모바일 칸은 메모를 상세에서 보여줘요(02-spec 2-5). 저장 결과는 저장소로 확인해요.
  await waitFor(async () => expect((await studentDb.boards.toArray()).find(b => b.name === 'B안')?.slots[0].memo).toBe('B안의 메모'));
  fireEvent.click(screen.getByRole('button', { name: 'A안' }));
  fireEvent.click((await screen.findAllByRole('button', { name: /상세$/ }))[0]);
  expect((screen.getByLabelText('메모') as HTMLTextAreaElement).value).toBe('원래 메모');
  expect(await studentDb.boards.get(board.id)).toEqual(board);
});

test('UI deletion requires confirmation, cancel preserves data, last deletion returns to an empty board', async () => {
  await seed(); at();
  const askDelete = async () => { fireEvent.click(await screen.findByRole('button', { name: '안 관리' })); fireEvent.click(within(screen.getByRole('dialog', { name: '안 관리' })).getByRole('button', { name: 'A안 삭제' })); };
  await askDelete();
  const dialog = screen.getByRole('dialog', { name: '수시로 안 삭제 확인' });
  expect(await studentDb.boards.count()).toBe(1);
  fireEvent.click(within(dialog).getByRole('button', { name: '취소' }));
  expect(await studentDb.boards.count()).toBe(1);
  await askDelete();
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: '안 삭제' }));
  expect(await screen.findByRole('heading', { name: '아직 담은 대학이 없어요' })).toBeTruthy();
  expect(await studentDb.applications.count()).toBe(3);
  fireEvent.click(screen.getByRole('button', { name: '안 관리' }));
  fireEvent.click(within(screen.getByRole('dialog', { name: '안 관리' })).getByRole('button', { name: '빈 새 안 만들기' }));
  await waitFor(async () => expect((await studentDb.boards.toArray()).map(b => b.name)).toEqual(['A안']));
  expect(await screen.findByRole('button', { name: 'A안' })).toBeTruthy();
});

test('failed edits retain draft dates and memos inside the dialog for retry', async () => {
  await seed(); at();
  fireEvent.click((await screen.findAllByRole('button', { name: /상세$/ }))[0]);
  fireEvent.change(screen.getByLabelText('메모'), { target: { value: '저장할 초안' } });
  fireEvent.change(screen.getByLabelText('고사일'), { target: { value: '2027-10-13' } });
  vi.spyOn(studentDb, 'changeBoard').mockRejectedValueOnce(new Error('저장 공간이 부족해요.'));
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: '저장' }));
  expect(await within(screen.getByRole('dialog')).findByRole('alert')).toHaveProperty('textContent', '저장 공간이 부족해요.');
  expect((screen.getByLabelText('메모') as HTMLTextAreaElement).value).toBe('저장할 초안');
  expect((screen.getByLabelText('고사일') as HTMLInputElement).value).toBe('2027-10-13');
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: '저장' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  await waitFor(async () => expect((await studentDb.boards.toArray())[0].slots[0].memo).toBe('저장할 초안'));
});

test('failed additions keep the picker open and can be retried', async () => {
  const a = application('새 대학'); await studentDb.saveApplication(a); at();
  fireEvent.click((await screen.findAllByRole('button', { name: '+ 대학 담기' }))[0]);
  vi.spyOn(studentDb, 'changeBoard').mockRejectedValueOnce(new Error('저장 실패'));
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /새 대학/ }));
  expect(await within(screen.getByRole('dialog')).findByText('저장 실패')).toBeTruthy();
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /새 대학/ }));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect(await screen.findByText('6회 제한 1/6장 · 6회 제외 0장')).toBeTruthy();
});

test('an editor whose scenario was deleted cannot write its draft into the fallback scenario', async () => {
  const { board } = await seed(), copy = await studentDb.createScenario(board.id); at();
  fireEvent.click((await screen.findAllByRole('button', { name: /상세$/ }))[0]);
  fireEvent.change(screen.getByLabelText('메모'), { target: { value: '삭제된 A안의 초안' } });
  await studentDb.deleteBoard(board.id);
  // 지운 A안 자리는 아직 저장하지 않은 빈 A안 탭으로 남아요. 열린 편집 창은 지운 안을 가리켜요.
  await waitFor(() => expect(screen.queryAllByRole('button', { name: /상세$/ }).length).toBe(0));
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: '저장' }));
  expect(await within(screen.getByRole('dialog')).findByRole('alert')).toHaveProperty('textContent', '이 안이 삭제됐어요. 다른 안을 선택해 주세요.');
  expect(await studentDb.boards.get(copy.id)).toEqual(copy);
  expect(await studentDb.boards.get(board.id)).toBeUndefined();
});

test('failed deletion reports inside the confirmation and keeps the target', async () => {
  const { board } = await seed(); at();
  vi.spyOn(studentDb, 'deleteBoard').mockRejectedValueOnce(new Error('삭제 실패'));
  fireEvent.click(await screen.findByRole('button', { name: '안 관리' }));
  fireEvent.click(within(screen.getByRole('dialog', { name: '안 관리' })).getByRole('button', { name: 'A안 삭제' }));
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: '안 삭제' }));
  expect(await within(screen.getByRole('dialog')).findByText('삭제 실패')).toBeTruthy();
  expect(await studentDb.boards.get(board.id)).toEqual(board);
});

test('after six cards the UI still permits exempt cards, disables ordinary ones', async () => {
  const apps = Array.from({ length: 7 }, (_, i) => application(`대학${i}`)), exempt = application('광주과학기술원');
  for (const a of [...apps, exempt]) await studentDb.saveApplication(a);
  let board = newBoard('A안'); for (const a of apps.slice(0, 6)) board = addToBoard(board, a.id, a.university);
  await studentDb.saveBoard(board); at();
  fireEvent.click(await screen.findByRole('button', { name: '6회 제외 전형 담기' }));
  const dialog = screen.getByRole('dialog');
  expect((within(dialog).getByRole('button', { name: /대학6/ }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(within(dialog).getByRole('button', { name: /광주과학기술원/ }));
  expect(await screen.findByText('6회 제한 6/6장 · 6회 제외 1장')).toBeTruthy();
});

test('A안·B안·C안 탭은 늘 보이고, 저장하지 않은 B안에 처음 담으면 그 이름으로 저장돼요', async () => {
  const a = application('가온대'); await studentDb.saveApplication(a); at();
  fireEvent.click(await screen.findByRole('button', { name: 'B안' }));
  expect(screen.getByRole('button', { name: 'C안' })).toBeTruthy();
  fireEvent.click(screen.getAllByRole('button', { name: '+ 대학 담기' })[0]);
  fireEvent.click(within(screen.getByRole('dialog', { name: '대학 담기' })).getByRole('button', { name: /가온대/ }));
  await waitFor(async () => expect((await studentDb.boards.toArray()).map(b => [b.name, b.slots.length])).toEqual([['B안', 1]]));
  expect(screen.getByRole('button', { name: 'B안' }).getAttribute('aria-pressed')).toBe('true');
});
