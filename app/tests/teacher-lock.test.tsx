import 'fake-indexeddb/auto';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, test } from 'vitest';
import { App } from '../src/App';
import { isExpired, loadLock, saveLock, touch } from '../src/domain/teacherLock';
import { teacherDb } from '../src/store/teacherDb';
import { parseRoster } from '../src/domain/classroom';

beforeEach(async () => { localStorage.clear(); sessionStorage.clear(); await teacherDb.clearClass(); });
afterEach(cleanup);

test('잠금 번호 규칙과 쉬는 시간 만료', async () => {
  await expect(saveLock('12', 10)).rejects.toThrow('4~8자리');
  await saveLock('2468', 5);
  const c = loadLock()!;
  expect(JSON.stringify(c)).not.toContain('2468');
  touch(1_000_000);
  expect(isExpired(c, 1_000_000 + 4 * 60_000)).toBe(false);
  expect(isExpired(c, 1_000_000 + 6 * 60_000)).toBe(true);
});

test('교사 화면: 잠금 버튼으로 잠그고, 틀린 번호는 거절, 맞는 번호로 푼다', async () => {
  await teacherDb.createClass({ key: 'class', name: '3학년 2반', code: '7Q4K', created_at: '2026-11-20' }, parseRoster('7 하늘'));
  await saveLock('2468', 10);
  render(<MemoryRouter initialEntries={['/teacher/teacher-dashboard']}><App /></MemoryRouter>);
  fireEvent.click(await screen.findByRole('button', { name: '잠금' }));
  expect(screen.getByRole('dialog', { name: '교사 화면 잠금' })).toBeTruthy();
  fireEvent.change(screen.getByLabelText('잠금 번호'), { target: { value: '1111' } });
  fireEvent.click(screen.getByRole('button', { name: '잠금 풀기' }));
  expect((await screen.findByRole('alert', {}, { timeout: 5000 })).textContent).toContain('달라요');
  fireEvent.change(screen.getByLabelText('잠금 번호'), { target: { value: '2468' } });
  fireEvent.click(screen.getByRole('button', { name: '잠금 풀기' }));
  await waitFor(() => expect(screen.queryByRole('dialog', { name: '교사 화면 잠금' })).toBeNull(), { timeout: 5000 });
});

test('잠금 번호가 있으면 새로 연 탭은 잠겨 있다', async () => {
  await saveLock('2468', 10); sessionStorage.clear();
  render(<MemoryRouter initialEntries={['/teacher/card-collect']}><App /></MemoryRouter>);
  expect(await screen.findByRole('dialog', { name: '교사 화면 잠금' })).toBeTruthy();
});
