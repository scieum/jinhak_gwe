import 'fake-indexeddb/auto';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, test } from 'vitest';
import { HomeDashboard } from '../src/components/HomeDashboard';
import { PromoBanner } from '../src/components/PromoBanner';
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
  expect(screen.queryByRole('img', { name: /환산 9등급/ })).toBeNull();
  expect(screen.queryByRole('link', { name: /성적 입력·수정/ })).toBeNull(); // 시안 821:890: 빈 홈 바로가기는 3개
  expect(screen.getByText('관심 대학을 담으면 여기에서 될각 판정을 볼 수 있어요.')).toBeTruthy();
});

test('성적이 있으면 범위 막대와 관심 대학 될각(검수 입결 없으면 판정 없음)을 보여 준다', async () => {
  await studentDb.grades.put(subject());
  await studentDb.setInterest('가천대학교', '가천의약학', true, '약학과');
  await studentDb.setInterest('가천대학교', '가천의약학', true, '의예과');
  home();
  const range = await screen.findByRole('region', { name: '5 to 9 내 위치' });
  expect(within(range).getByRole('img', { name: /환산 9등급 약/ })).toBeTruthy();
  expect(screen.getByRole('link', { name: '5 to 9 자세히 보기' }).getAttribute('href')).toBe('/five-to-nine?view=mine');
  const judge = screen.getByRole('region', { name: '관심 대학 될각' });
  expect(within(judge).getByText('관심 대학 1곳 중 0곳 · 교과전형 입결과 비교했어요')).toBeTruthy(); // 같은 대학은 한 줄
  const link = within(judge).getByRole('link', { name: /가천대학교.*약학과/ });
  expect(new URLSearchParams(link.getAttribute('href')!.split('?')[1]).get('cd')).toBe('약학과');
  expect(within(judge).getByText('자료 준비 중')).toBeTruthy();
  expect(within(judge).queryByText(/안정|적정|소신|위험/)).toBeNull(); // NEVER-1: 검수 입결 없이 판정하지 않아요
});

test('홈 상세 링크는 간편 계산 대신 저장한 내 성적 분석을 바로 연다', async () => {
  await studentDb.grades.put(subject());
  render(<MemoryRouter initialEntries={['/five-to-nine?view=mine']}><FiveToNine /></MemoryRouter>);
  expect(await screen.findByRole('complementary', { name: '환산 해석과 근거' })).toBeTruthy();
  expect(screen.getByRole('button', { name: '내 성적 분석' }).getAttribute('aria-pressed')).toBe('true');
});

test('전형 성향 탐색 배너(사이드바): 링크 하나, ✕ 한 번이면 이 기기에서 다시 안 보인다', async () => {
  localStorage.clear();
  const banner = () => render(<MemoryRouter><PromoBanner closable variant="sidebar" /></MemoryRouter>);
  const first = banner();
  expect(screen.getByRole('link', { name: /나의 준비 방식 찾기/ }).getAttribute('href')).toBe('/admission-style');
  fireEvent.click(screen.getByRole('button', { name: /배너 닫기/ }));
  expect(screen.getByRole('status').textContent).toBe('전형계획 목록에서 다시 볼 수 있어요');
  expect(localStorage.getItem('unavi.home-style-banner.hidden')).toBe('1');
  first.unmount();
  banner();
  expect(screen.queryByRole('link', { name: /나의 준비 방식 찾기/ })).toBeNull();
});
