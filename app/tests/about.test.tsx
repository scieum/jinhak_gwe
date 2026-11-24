import 'fake-indexeddb/auto';
import { cleanup, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, test } from 'vitest';
import { App } from '../src/App';

afterEach(cleanup);

test('/about: 셸 밖 서비스 소개 상세페이지를 시안 문구·순서대로 그린다', () => {
  const { container } = render(<MemoryRouter initialEntries={['/about']}><App /></MemoryRouter>);
  expect(container.querySelector('[data-slug="about"]')).not.toBeNull();
  expect(container.querySelector('.sidebar, .tabbar')).toBeNull();
  expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('나의 방향을');
  // 섹션 순서 = 시안 02~13
  const h2 = screen.getAllByRole('heading', { level: 2 }).map(h => h.textContent!.split('\n')[0]);
  expect(h2).toEqual(['막막한 진학 준비를,', '흩어져 있던 진학 준비,', '같은 목표,', '등급 하나로는', '궁금한 대학부터,', '정보는 차근차근,', '여섯 번의 선택을,', '혼자 고민하던 선택을,', '판단의 근거까지,', '처음이라도,', '자주 묻는 질문', '2028 대입 준비,']);
  expect(container.querySelectorAll('.about__feature')).toHaveLength(6);
  expect(container.querySelectorAll('.about__faq li')).toHaveLength(8);
  // 숫자 예시에는 예시 표기가 붙는다(NEVER-1)
  expect(screen.getByText('이해를 돕기 위한 예시 화면입니다.')).toBeTruthy();
  expect(screen.getByText('실제 대학 및 판정 결과가 아닌 구성 예시입니다.')).toBeTruthy();
  // 시작 버튼은 학생 홈으로
  const nav = container.querySelector('.about__nav') as HTMLElement;
  expect(within(nav).getByRole('link', { name: '시작하기' }).getAttribute('href')).toBe('/home');
  screen.getAllByRole('link', { name: 'U:NAVI 시작하기' }).forEach(a => expect(a.getAttribute('href')).toBe('/home'));
  expect(container.textContent).not.toMatch(/합격\s*(확률|가능|보장)/);
});

test('처음 온 기기는 루트(/)에서 소개로, 소개를 본 뒤에는 학생 홈으로 간다', () => {
  localStorage.removeItem('jinhak-navi-seen-about');
  const first = render(<MemoryRouter initialEntries={['/']}><App /></MemoryRouter>);
  expect(first.container.querySelector('[data-slug="about"]')).not.toBeNull();
  expect(localStorage.getItem('jinhak-navi-seen-about')).toBe('1');
  first.unmount();
  const again = render(<MemoryRouter initialEntries={['/']}><App /></MemoryRouter>);
  expect(again.container.querySelector('[data-slug="about"]')).toBeNull();
});
