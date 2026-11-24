import { cleanup, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, test } from 'vitest';
import { App } from '../src/App';

afterEach(() => { cleanup(); sessionStorage.clear(); });

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );

test('v2 모바일 머리: 소분류 화면은 app-bar 로고 → 대분류 제목 → sub-nav', () => {
  const { container } = renderAt('/doelgak');
  expect(container.querySelector('.appbar .appbar__logo img[alt="U:NAVI"]')).not.toBeNull();
  expect(container.querySelector('.appbar h1')).toBeNull();
  const title = container.querySelector('.appbar-title');
  expect(title?.textContent).toBe('대학 찾기');
  // 제목 줄은 app-bar 바로 뒤, sub-nav 앞
  const nav = screen.getByRole('navigation', { name: '대학 찾기 소분류' });
  expect(title!.compareDocumentPosition(nav) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});

test('v2 모바일 머리: 홈은 제목 줄 없이 로고만, 상세는 뒤로가기 + 화면 제목', () => {
  const home = renderAt('/home');
  expect(home.container.querySelector('.appbar__logo')).not.toBeNull();
  expect(home.container.querySelector('.appbar-title')).toBeNull();
  home.unmount();
  const detail = renderAt('/univ-detail');
  expect(within(detail.container.querySelector('.appbar') as HTMLElement).getByRole('button', { name: '뒤로' })).toBeTruthy();
  expect(detail.container.querySelector('.appbar__logo')).toBeNull();
  expect(detail.container.querySelector('.appbar-title')).toBeNull();
});

test('v2 교사 사이드바: 교사 대분류가 맨 위, 그 아래 캡션 "학생" + 학생 메뉴', () => {
  renderAt('/teacher/teacher-dashboard');
  const sidebar = screen.getByRole('navigation', { name: '주 메뉴' });
  const labels = [...sidebar.querySelectorAll('.sidebar-group__label, .sidebar-item, .sidebar__caption')].map((e) => e.textContent?.trim());
  expect(labels.indexOf('우리 반')).toBeLessThan(labels.indexOf('학생'));
  expect(labels.indexOf('학생')).toBeLessThan(labels.indexOf('홈'));
  expect(within(sidebar).queryByText('교사')).toBeNull();
});

test('v2 사이드바 아래: 백업은 button-pill-soft', () => {
  const { container } = renderAt('/grade-input');
  expect(container.querySelector('.sidebar__footer a.button-pill-soft')?.textContent).toContain('백업');
});
