import 'fake-indexeddb/auto';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, test } from 'vitest';
import { App } from '../src/App';
import { isStudentLocked, setStudentPin } from '../src/domain/studentLock';
import { loadLock, saveLock } from '../src/domain/teacherLock';

beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });
afterEach(cleanup);

const gate = () => screen.queryByRole('dialog', { name: '학생 화면 잠금' });
const open = (path = '/grade-input') => render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>);

test('처음 누르면 번호를 정하고 바로 잠근다 · 번호는 평문으로 저장하지 않는다', async () => {
  open();
  fireEvent.click(await screen.findByRole('button', { name: '잠금' }));
  const setup = await screen.findByRole('dialog', { name: '학생 화면 잠금 번호 정하기' });
  fireEvent.change(screen.getByLabelText('잠금 번호(숫자 4~8자리)'), { target: { value: '12' } });
  fireEvent.change(screen.getByLabelText('잠금 번호 확인'), { target: { value: '12' } });
  fireEvent.click(screen.getByRole('button', { name: '정하고 잠그기' }));
  expect((await screen.findByRole('alert')).textContent).toContain('4~8자리');
  fireEvent.change(screen.getByLabelText('잠금 번호(숫자 4~8자리)'), { target: { value: '1357' } });
  fireEvent.change(screen.getByLabelText('잠금 번호 확인'), { target: { value: '1357' } });
  fireEvent.click(screen.getByRole('button', { name: '정하고 잠그기' }));
  await waitFor(() => expect(gate()).toBeTruthy(), { timeout: 5000 });
  expect(setup.isConnected).toBe(false);
  expect(JSON.stringify({ ...localStorage })).not.toContain('1357');
});

test('잠그면 학생 화면을 가리고, 틀린 번호는 거절, 맞는 번호로 푼다', async () => {
  await setStudentPin('1357');
  open();
  fireEvent.click(await screen.findByRole('button', { name: '잠금' }));
  expect(gate()).toBeTruthy();
  fireEvent.change(screen.getByLabelText('잠금 번호'), { target: { value: '0000' } });
  fireEvent.click(screen.getByRole('button', { name: '잠금 풀기' }));
  expect((await screen.findByRole('alert', {}, { timeout: 5000 })).textContent).toContain('달라요');
  expect(isStudentLocked()).toBe(true);
  fireEvent.change(screen.getByLabelText('잠금 번호'), { target: { value: '1357' } });
  fireEvent.click(screen.getByRole('button', { name: '잠금 풀기' }));
  await waitFor(() => expect(gate()).toBeNull(), { timeout: 5000 });
  expect(isStudentLocked()).toBe(false);
});

test('새로고침·새 탭에도 잠겨 있다(샘플 모드 포함)', async () => {
  localStorage.setItem('jinhak-navi-sample', 'on');
  await setStudentPin('1357');
  open('/score-trend');
  fireEvent.click(await screen.findByRole('button', { name: '잠금' }));
  cleanup(); sessionStorage.clear();
  open('/susiro');
  expect(await screen.findByRole('dialog', { name: '학생 화면 잠금' })).toBeTruthy();
  expect(localStorage.getItem('jinhak-navi-sample')).toBe('on');
});

test('교사 잠금과 따로 움직인다', async () => {
  await saveLock('2468', 10);
  await setStudentPin('1357');
  open();
  fireEvent.click(await screen.findByRole('button', { name: '잠금' }));
  expect(gate()).toBeTruthy();
  expect(screen.queryByRole('dialog', { name: '교사 화면 잠금' })).toBeNull();
  expect(loadLock()).toBeTruthy();
  cleanup(); sessionStorage.clear(); // 교사 잠금은 새 탭에서 잠겨 있어요
  open('/teacher/teacher-dashboard');
  expect(await screen.findByRole('dialog', { name: '교사 화면 잠금' })).toBeTruthy();
  expect(gate()).toBeNull();
  // 교사 번호로는 학생 잠금이 안 풀린다
  cleanup();
  open();
  fireEvent.change(await screen.findByLabelText('잠금 번호'), { target: { value: '2468' } });
  fireEvent.click(screen.getByRole('button', { name: '잠금 풀기' }));
  expect((await screen.findByRole('alert', {}, { timeout: 5000 })).textContent).toContain('달라요');
});
