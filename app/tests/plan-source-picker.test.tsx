import { readFileSync } from 'node:fs';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { PlanEditor } from '../src/components/PlanEditor';
import { loadMinimumReferenceIndex, loadMinimumReferencePackage } from '../src/data/minimumReferences';
import { applicationFromMinimumScope, parseMinimumReferenceIndex, parseMinimumReferencePackage } from '../src/domain/minimumReferences';
import { newApplication } from '../src/domain/planner';

vi.mock('../src/data/minimumReferences', () => ({ loadMinimumReferenceIndex: vi.fn(), loadMinimumReferencePackage: vi.fn() }));
const base = 'public/data/minimum-references/';
const index = parseMinimumReferenceIndex(JSON.parse(readFileSync(`${base}index.json`, 'utf8')));
const entry = index.entries.find(e => e.package_id === 'plan-0000198')!;
const data = parseMinimumReferencePackage(JSON.parse(readFileSync(`${base}${entry.file}`, 'utf8')), entry);
const scope = data.rows[0];
beforeEach(() => { vi.mocked(loadMinimumReferenceIndex).mockResolvedValue(index); vi.mocked(loadMinimumReferencePackage).mockResolvedValue(data); });
afterEach(() => { cleanup(); vi.resetAllMocks(); });
const setup = (initial = newApplication()) => {
  const onSave = vi.fn();
  render(<PlanEditor initial={initial} existing={false} busy={false} error="" onSave={onSave} onClose={() => {}} />);
  return onSave;
};
async function choose() {
  fireEvent.click(screen.getByText('전형 자료에서 찾아 입력'));
  fireEvent.change(await screen.findByLabelText('자료 대학·캠퍼스'), { target: { value: entry.package_id } });
  fireEvent.change(await screen.findByLabelText('자료 전형·모집시기'), { target: { value: scope.program_id } });
  fireEvent.change(screen.getByLabelText('자료 모집단위'), { target: { value: scope.unit_id } });
}

test('real source selection fills identity and stores the exact reference only after save', async () => {
  const save = setup(); expect(loadMinimumReferenceIndex).not.toHaveBeenCalled();
  await choose();
  expect(save).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: '선택한 전형 적용' }));
  expect(screen.getByLabelText('대학명')).toHaveProperty('value', entry.university);
  expect(screen.getByLabelText('전형명')).toHaveProperty('value', scope.program);
  expect(screen.getByLabelText('모집단위(선택)')).toHaveProperty('value', scope.unit);
  fireEvent.click(screen.getByRole('button', { name: '저장' }));
  expect(save).toHaveBeenCalledWith(expect.objectContaining(applicationFromMinimumScope(entry, data, scope)));
  expect(save.mock.calls[0][0].steps.every((s: { status: string; due_at: string | null }) => s.status === 'pending' && s.due_at === null)).toBe(true);
});

test('manual identity changes discard the selected reference and its original source link', () => {
  const save = setup({ ...newApplication(), ...applicationFromMinimumScope(entry, data, scope) });
  fireEvent.change(screen.getByLabelText('대학명'), { target: { value: '다른 대학' } });
  fireEvent.click(screen.getByRole('button', { name: '저장' }));
  expect(save.mock.calls[0][0].source_selection).toBeUndefined();
  expect(save.mock.calls[0][0].source_url).toBe('');
});

test('changing year cannot apply a package from the old year', async () => {
  setup(); await choose();
  fireEvent.change(screen.getByLabelText('학년도'), { target: { value: '2029' } });
  expect(await screen.findByText('이 학년도의 연결 자료가 아직 없어요. 아래에서 직접 입력할 수 있어요.')).toBeTruthy();
  expect(screen.queryByRole('button', { name: '선택한 전형 적용' })).toBeNull();
  expect(screen.getByLabelText('대학명')).toHaveProperty('value', '');
});

test('failed package request can retry without filling a partial identity', async () => {
  vi.mocked(loadMinimumReferencePackage).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(data);
  setup(); fireEvent.click(screen.getByText('전형 자료에서 찾아 입력'));
  fireEvent.change(await screen.findByLabelText('자료 대학·캠퍼스'), { target: { value: entry.package_id } });
  fireEvent.click(await screen.findByRole('button', { name: '전형 자료 다시 읽기' }));
  await screen.findByLabelText('자료 전형·모집시기');
  expect(screen.getByLabelText('대학명')).toHaveProperty('value', '');
  expect(screen.getByRole('button', { name: '선택한 전형 적용' })).toHaveProperty('disabled', true);
});

test('a late university response cannot restore options from the previous choice', async () => {
  let resolve!: (value: typeof data) => void;
  vi.mocked(loadMinimumReferencePackage).mockImplementationOnce(() => new Promise(r => { resolve = r; }));
  setup(); fireEvent.click(screen.getByText('전형 자료에서 찾아 입력'));
  fireEvent.change(await screen.findByLabelText('자료 대학·캠퍼스'), { target: { value: entry.package_id } });
  await waitFor(() => expect(loadMinimumReferencePackage).toHaveBeenCalled());
  fireEvent.change(screen.getByLabelText('자료 대학·캠퍼스'), { target: { value: '' } });
  resolve(data);
  await waitFor(() => expect(screen.queryByLabelText('자료 전형·모집시기')).toBeNull());
  expect(screen.getByRole('button', { name: '선택한 전형 적용' })).toHaveProperty('disabled', true);
});
