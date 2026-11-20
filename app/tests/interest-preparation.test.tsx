import 'fake-indexeddb/auto';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { App } from '../src/App';
import { PrepareProgram } from '../src/components/PrepareProgram';
import { newApplication, newCounselTask, sameApplication } from '../src/domain/planner';
import { interestId } from '../src/domain/interests';
import { addToBoard, newBoard } from '../src/domain/board';
import { studentDb } from '../src/store/studentDb';
import { admissionYear } from '../src/data/catalog';

vi.mock('../src/data/releasedResults', () => ({ useReleasedResults: () => [] }));
const university = '준비 흐름 대학', program = '교과 전형';
const plan = (year = admissionYear, department = '') => ({ ...newApplication(year), university, program, department });
const at = (path: string) => render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>);
const openFromInterests = async () => {
  await studentDb.setInterest(university, program, true);
  at('/admission-results?view=interests');
  const button = await screen.findByRole('button', { name: `${university} ${program} 지원 준비에 추가` });
  button.focus(); fireEvent.click(button);
  return screen.getByRole('dialog', { name: '지원 전형 편집' });
};
const save = async (dialog: HTMLElement) => {
  const button = within(dialog).getByRole('button', { name: '저장' });
  await waitFor(() => expect((button as HTMLButtonElement).disabled).toBe(false));
  fireEvent.click(button);
};
beforeEach(async () => { await studentDb.clearStudentData(); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

test('concurrent additions reuse one record without resetting completed checks, notes, tasks or boards', async () => {
  const original = plan();
  original.steps[0] = { ...original.steps[0], status: 'done', checked_at: new Date().toISOString(), note: '보존할 메모', due_at: '2027-09-01T18:00' };
  await studentDb.saveApplication(original);
  const task = { ...newCounselTask(original.id), title: '보존할 질문' };
  await studentDb.saveTask(task);
  const board = addToBoard(newBoard('A안'), original.id, university); await studentDb.saveBoard(board);
  const results = await Promise.all([studentDb.addApplication(plan()), studentDb.addApplication({ ...plan(), university: ` ${university} ` })]);
  expect(results).toEqual([{ id: original.id, created: false }, { id: original.id, created: false }]);
  expect(await studentDb.applications.get(original.id)).toEqual(original);
  expect(await studentDb.tasks.get(task.id)).toEqual(task);
  expect(await studentDb.boards.get(board.id)).toEqual(board);
});

test('two new simultaneous adds create only one plan; different years and departments stay separate', async () => {
  const results = await Promise.all([studentDb.addApplication(plan()), studentDb.addApplication(plan())]);
  expect(new Set(results.map(r => r.id)).size).toBe(1);
  expect(results.filter(r => r.created)).toHaveLength(1);
  await studentDb.addApplication(plan(admissionYear + 1));
  await studentDb.addApplication(plan(admissionYear, '국어교육과'));
  expect(await studentDb.applications.count()).toBe(3);
  expect(sameApplication(plan(), plan(admissionYear + 1))).toBe(false);
});

test('invalid candidates and conflicting ids never overwrite existing records', async () => {
  const original = plan(); await studentDb.saveApplication(original);
  await expect(studentDb.addApplication({ ...plan(), year: NaN })).rejects.toThrow();
  await expect(studentDb.addApplication({ ...plan(), source_url: 'javascript:alert(1)' })).rejects.toThrow();
  await expect(studentDb.addApplication({ ...plan(), id: original.id, department: '다른 모집단위' })).rejects.toThrow();
  expect(await studentDb.applications.toArray()).toEqual([original]);
});

test('at the plan limit, existing plans can still be opened without changes', async () => {
  const all = Array.from({ length: 100 }, (_, i) => ({ ...plan(), university: `대학${i}` }));
  await studentDb.applications.bulkPut(all);
  await expect(studentDb.addApplication(plan())).rejects.toThrow('100개');
  expect(await studentDb.addApplication({ ...plan(), university: '대학0' })).toEqual({ id: all[0].id, created: false });
});

test('interest → review year and department → checklist → select in Susiro, keeping the interest', async () => {
  const dialog = await openFromInterests();
  expect((within(dialog).getByLabelText('학년도') as HTMLInputElement).value).toBe(String(admissionYear));
  expect((within(dialog).getByLabelText('대학명') as HTMLInputElement).value).toBe(university);
  expect((within(dialog).getByLabelText('모집요강 링크(선택)') as HTMLInputElement).value).toBe('');
  expect(await studentDb.applications.count()).toBe(0);
  fireEvent.change(within(dialog).getByLabelText('학년도'), { target: { value: '2029' } });
  fireEvent.change(within(dialog).getByLabelText('모집단위(선택)'), { target: { value: '화학교육과' } });
  await save(dialog);
  expect(await screen.findByRole('heading', { name: `${university} · ${program}` })).toBeTruthy();
  const saved = (await studentDb.applications.toArray())[0];
  expect(saved).toMatchObject({ year: 2029, department: '화학교육과', source_url: '' });
  expect(saved.steps.every(s => s.status === 'pending' && s.due_at === null)).toBe(true);
  expect(saved.eligibility.every(e => e.status === 'unknown')).toBe(true);
  expect(await studentDb.interests.get(interestId(university, program))).toBeTruthy();
  expect(await studentDb.boards.count()).toBe(0);
  fireEvent.click(screen.getByRole('link', { name: '수시로에서 카드 담기' }));
  fireEvent.click((await screen.findAllByRole('button', { name: '+ 대학 담기' }))[0]);
  fireEvent.click(within(screen.getByRole('dialog', { name: '대학 담기' })).getByRole('button', { name: `${university} · 2029학년도 · ${program} · 화학교육과` }));
  await waitFor(async () => expect((await studentDb.boards.toArray())[0].slots[0].application_id).toBe(saved.id));
  expect(await screen.findByText('6회 제한 1/6장')).toBeTruthy();
});

test('cancel leaves the saved interest and writes no preparation data, returning focus', async () => {
  const dialog = await openFromInterests();
  fireEvent.change(within(dialog).getByLabelText('모집단위(선택)'), { target: { value: '임시 입력' } });
  fireEvent.click(within(dialog).getByRole('button', { name: '취소' }));
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(await studentDb.applications.count()).toBe(0);
  expect(await studentDb.interests.count()).toBe(1);
  expect(document.activeElement).toBe(screen.getByRole('button', { name: `${university} ${program} 지원 준비에 추가` }));
});

test('an existing preparation record is explicitly opened and keeps its finished checklist', async () => {
  const original = plan(); original.steps[0] = { ...original.steps[0], status: 'done', checked_at: new Date().toISOString(), note: '그대로 남길 기록' };
  await studentDb.saveApplication(original);
  const dialog = await openFromInterests();
  fireEvent.click(await within(dialog).findByRole('button', { name: '기존 준비 기록 열기' }));
  expect(await screen.findByText('그대로 남길 기록')).toBeTruthy();
  expect((screen.getByLabelText('준비할 전형') as HTMLSelectElement).value).toBe(original.id);
  expect(await studentDb.applications.toArray()).toEqual([original]);
});

test('failed saves keep the form values for retry and do not navigate', async () => {
  vi.spyOn(studentDb, 'addApplication').mockRejectedValueOnce(new Error('저장 공간이 부족해요.'));
  const dialog = await openFromInterests();
  fireEvent.change(within(dialog).getByLabelText('모집단위(선택)'), { target: { value: '보존할 학과' } });
  await save(dialog);
  expect(await within(dialog).findByRole('alert')).toHaveProperty('textContent', '저장 공간이 부족해요.');
  expect((within(dialog).getByLabelText('모집단위(선택)') as HTMLInputElement).value).toBe('보존할 학과');
  expect(await studentDb.applications.count()).toBe(0);
  await save(dialog);
  expect(await screen.findByRole('heading', { name: `${university} · ${program}` })).toBeTruthy();
});

test('a storage read failure disables saving but permits cancellation', async () => {
  vi.spyOn(studentDb, 'planningSnapshot').mockRejectedValue(new Error('denied'));
  render(<MemoryRouter><PrepareProgram university={university} program={program} /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button'));
  const dialog = screen.getByRole('dialog');
  expect(await within(dialog).findByRole('alert')).toHaveProperty('textContent', '기기 저장소를 열지 못했어요. 브라우저 저장 권한을 확인해 주세요.');
  expect((within(dialog).getByRole('button', { name: '저장' }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(within(dialog).getByRole('button', { name: '취소' }));
  expect(screen.queryByRole('dialog')).toBeNull();
});

test('manual checklist creation also opens the matching existing record', async () => {
  const original = plan(); await studentDb.saveApplication(original);
  at('/application-checklist');
  await screen.findByRole('heading', { name: `${university} · ${program}` });
  fireEvent.click(await screen.findByRole('button', { name: '+ 지원 전형 추가' }));
  const dialog = screen.getByRole('dialog');
  fireEvent.change(within(dialog).getByLabelText('대학명'), { target: { value: university } });
  fireEvent.change(within(dialog).getByLabelText('전형명'), { target: { value: program } });
  fireEvent.click(within(dialog).getByRole('button', { name: '기존 준비 기록 열기' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect(await studentDb.applications.toArray()).toEqual([original]);
});

test('department-specific interest carries only the saved department into preparation', async () => {
  await studentDb.setInterest(university, program, true, '의예과');
  at('/admission-results?view=interests');
  fireEvent.click(await screen.findByRole('button', { name: `${university} ${program} 의예과 지원 준비에 추가` }));
  const dialog = screen.getByRole('dialog', { name: '지원 전형 편집' });
  expect(within(dialog).getByLabelText('모집단위(선택)')).toHaveProperty('value', '의예과');
  await save(dialog);
  await waitFor(async () => expect((await studentDb.applications.toArray())[0]).toMatchObject({ university, program, department: '의예과' }));
  expect(await studentDb.interests.get(interestId(university, program, '의예과'))).toBeTruthy();
});
