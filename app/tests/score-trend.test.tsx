import { cleanup, fireEvent, render, screen, within, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { ScoreTrendContent } from '../src/components/ScoreTrendContent';
import { subject } from './fixtures';
import { newApplication } from '../src/domain/planner';

beforeEach(() => localStorage.clear());
afterEach(() => { cleanup(); vi.restoreAllMocks(); document.getElementById('appbar-actions')?.remove(); });

test('mobile switches from mock scores to saved school grades without opening a modal', () => {
  render(<MemoryRouter><ScoreTrendContent data={{ grades: [subject()], attendance: [] }} /></MemoryRouter>);
  expect(screen.getByRole('button', { name: '모의고사', pressed: true })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '내신' }));
  expect(screen.getByRole('table', { name: '내신 학기별 교과 평균 등급' }).textContent).toContain('2.0');
  expect(screen.getByRole('region', { name: '목표 대학 최저 현황' })).toBeTruthy();
  expect(screen.queryByRole('dialog')).toBeNull();
});

test('desktop keeps both grade views and target panel in the page', () => {
  render(<MemoryRouter><ScoreTrendContent desktop data={{ grades: [subject()], attendance: [] }} /></MemoryRouter>);
  expect(screen.getByRole('heading', { name: '내신 학기별 평균 등급' })).toBeTruthy();
  expect(screen.getByRole('heading', { name: '모의고사 영역별 등급' })).toBeTruthy();
  expect(screen.getByRole('complementary', { name: '목표 대학 최저 현황' })).toBeTruthy();
});

test('unreviewed target remains pending and never gets an invented minimum verdict', () => {
  const plan = { ...newApplication(), university: '검증 대학', program: '검증 전형' };
  render(<MemoryRouter><ScoreTrendContent data={{ grades: [], attendance: [], mocks: [{ exam: '2026년 3월 학력평가(고2)', raw: { 국어: 80 }, updated_at: '' }], planning: { applications: [plan], tasks: [] } }} /></MemoryRouter>);
  const panel = screen.getByRole('region', { name: '목표 대학 최저 현황' });
  expect(within(panel).getByText(/검증 대학/)).toBeTruthy();
  expect(within(panel).getByText('기준 검수 전이라 판정하지 않았어요')).toBeTruthy();
  expect(panel.querySelector('.trd-result')).toBeNull();
});

test.each([true, false])('target picker confirms discarded edits, saves priorities and restores focus (desktop=%s)', async desktop => {
  const a = { ...newApplication(), university: '가온대', program: '교과' };
  const b = { ...newApplication(), university: '누리대', program: '종합' };
  const save = vi.fn().mockResolvedValue(undefined);
  render(<MemoryRouter><ScoreTrendContent onSaveTargets={save} desktop={desktop} data={{ grades: [], attendance: [], planning: { applications: [a, b], tasks: [] } }} /></MemoryRouter>);
  const button = screen.getByRole('button', { name: desktop ? '목표 대학 바꾸기' : '목표 대학' });
  button.focus(); fireEvent.click(button);
  fireEvent.change(screen.getByLabelText('2순위'), { target: { value: '' } });
  fireEvent.click(screen.getByRole('button', { name: '취소' }));
  expect(screen.getByRole('dialog', { name: '저장하지 않고 닫을까요?' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '계속 고르기' }));
  fireEvent.click(screen.getByRole('button', { name: '저장' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect(save).toHaveBeenCalledWith([a.id]);
  expect(screen.getByRole('status').textContent).toBe('목표 대학을 저장했어요');
  await waitFor(() => expect(document.activeElement).toBe(button)); // 모달이 닫힌 뒤 포커스를 돌려줘요(부하가 걸리면 한 박자 늦어요)
});

test('mobile header opens saved targets again and removes its action on unmount', async () => {
  const slot = document.createElement('div'); slot.id = 'appbar-actions'; document.body.append(slot);
  const a = { ...newApplication(), university: '가온대', program: '교과' };
  const b = { ...newApplication(), university: '누리대', program: '종합' };
  const save = vi.fn().mockResolvedValue(undefined);
  const view = (ids?: string[]) => <MemoryRouter><ScoreTrendContent onSaveTargets={save} data={{ grades: [], attendance: [], targetPriorities: ids, planning: { applications: [a, b], tasks: [] } }} /></MemoryRouter>;
  const first = render(view());
  fireEvent.click(within(slot).getByRole('button', { name: '목표 대학' }));
  fireEvent.change(screen.getByLabelText('2순위'), { target: { value: '' } });
  fireEvent.change(screen.getByLabelText('1순위'), { target: { value: b.id } });
  fireEvent.click(screen.getByRole('button', { name: '저장' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect(save).toHaveBeenCalledWith([b.id]);
  first.unmount();
  expect(slot.children).toHaveLength(0);
  render(view([b.id]));
  fireEvent.click(within(slot).getByRole('button', { name: '목표 대학' }));
  expect(screen.getByLabelText('1순위')).toHaveProperty('value', b.id);
  expect(screen.getByLabelText('2순위')).toHaveProperty('value', '');
});

test('empty saved priorities start with a usable first choice', async () => {
  const a = { ...newApplication(), university: '가온대', program: '교과' };
  const save = vi.fn().mockResolvedValue(undefined);
  render(<MemoryRouter><ScoreTrendContent onSaveTargets={save} data={{ grades: [], attendance: [], targetPriorities: [], planning: { applications: [a], tasks: [] } }} /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: '목표 대학' }));
  expect(screen.getByLabelText('1순위')).toHaveProperty('value', a.id);
  expect(screen.getByRole('button', { name: '저장' })).toHaveProperty('disabled', false);
  fireEvent.click(screen.getByRole('button', { name: '저장' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect(save).toHaveBeenCalledWith([a.id]);
});

test('storage failure keeps the picker open and allows retry without claiming success', async () => {
  const a = { ...newApplication(), university: '가온대', program: '교과' };
  const save = vi.fn().mockRejectedValueOnce(new Error('Storage full')).mockResolvedValue(undefined);
  render(<MemoryRouter><ScoreTrendContent onSaveTargets={save} data={{ grades: [], attendance: [], planning: { applications: [a], tasks: [] } }} /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: '목표 대학' }));
  fireEvent.click(screen.getByRole('button', { name: '저장' }));
  expect(await screen.findByRole('alert')).toHaveProperty('textContent', '목표 대학을 저장하지 못했어요. 다시 시도해 주세요.');
  expect(screen.getByRole('dialog')).toBeTruthy();
  expect(screen.queryByRole('status')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: '저장' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect(save).toHaveBeenCalledTimes(2);
  expect(screen.getByRole('status').textContent).toBe('목표 대학을 저장했어요');
});
