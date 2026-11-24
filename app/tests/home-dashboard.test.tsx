import 'fake-indexeddb/auto';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, test } from 'vitest';
import { HomeDashboard } from '../src/components/HomeDashboard';
import { FiveToNine } from '../src/screens/Results';
import { studentDb } from '../src/store/studentDb';
import { subject } from './fixtures';

beforeEach(async () => { await studentDb.clearStudentData(); });
afterEach(cleanup);
const home = () => render(<MemoryRouter><HomeDashboard /></MemoryRouter>);

test('빈 홈에서는 예시 성적 없이 성적 입력과 관심 목록으로 안내한다', async () => {
  home();
  expect(await screen.findByText('아직 입력한 성적이 없어요')).toBeTruthy();
  expect(within(screen.getByRole('region', { name: '내 성적 요약' })).getByRole('link', { name: '성적 입력하기' }).getAttribute('href')).toBe('/grade-input');
  expect(screen.queryByRole('img', { name: /9등급 환산 범위/ })).toBeNull();
});

test('실제 성적과 관심 학과를 요약하고 하트 해제는 해당 학과에만 적용된다', async () => {
  await studentDb.grades.put(subject());
  await studentDb.setInterest('가천대학교', '가천의약학', true, '약학과');
  await studentDb.setInterest('가천대학교', '가천의약학', true, '의예과');
  home();
  const summary = await screen.findByRole('region', { name: '내 성적 요약' });
  expect(within(summary).getByRole('img', { name: /9등급 환산 범위/ })).toBeTruthy();
  expect(screen.getByRole('link', { name: '5 to 9 자세히 보기' }).getAttribute('href')).toBe('/five-to-nine?view=mine');
  const link = screen.getByRole('link', { name: /가천대학교.*약학과/ });
  expect(new URLSearchParams(link.getAttribute('href')!.split('?')[1]).get('cd')).toBe('약학과');
  const heart = await screen.findByRole('button', { name: '가천대학교 가천의약학 약학과 관심에서 빼기' });
  await waitFor(() => expect((heart as HTMLButtonElement).disabled).toBe(false));
  fireEvent.click(heart);
  await waitFor(() => expect(screen.queryByRole('link', { name: /가천대학교.*약학과/ })).toBeNull());
  expect((await studentDb.interests.toArray()).map(i => i.department)).toEqual(['의예과']);
});

test('홈 상세 링크는 간편 계산 대신 저장한 내 성적 분석을 바로 연다', async () => {
  await studentDb.grades.put(subject());
  render(<MemoryRouter initialEntries={['/five-to-nine?view=mine']}><FiveToNine /></MemoryRouter>);
  expect(await screen.findByRole('complementary', { name: '환산 신뢰도와 근거' })).toBeTruthy();
  expect(screen.getByRole('button', { name: '내 성적 분석' }).getAttribute('aria-pressed')).toBe('true');
});

test('전형 성향 탐색 배너: 링크 하나, ✕는 이번만 숨기고 다시 보지 않기는 이 기기에 기억한다', async () => {
  localStorage.clear();
  const first = home();
  const link = await screen.findByRole('link', { name: /나의 준비 방식 찾기/ });
  expect(link.getAttribute('href')).toBe('/admission-style');
  fireEvent.click(screen.getByRole('button', { name: '다시 보지 않기' }));
  expect(screen.getByRole('status').textContent).toBe('전형계획 목록에서 다시 볼 수 있어요');
  expect(screen.queryByRole('link', { name: /나의 준비 방식 찾기/ })).toBeNull();
  expect(localStorage.getItem('unavi.home-style-banner.hidden')).toBe('1');
  first.unmount();
  home();
  await screen.findByText('아직 입력한 성적이 없어요');
  expect(screen.queryByRole('link', { name: /나의 준비 방식 찾기/ })).toBeNull();
});
