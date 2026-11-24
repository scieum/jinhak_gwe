import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cleanup, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, test } from 'vitest';
import { App } from '../App';
import { DETAILS, OUTSIDE, allItems } from './nav';

afterEach(cleanup);

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );

test('학생 셸: 대분류·소분류 이름, 선택 표시, 경로', () => {
  renderAt('/grade-input');
  const sidebar = screen.getByRole('navigation', { name: '주 메뉴' });
  for (const label of ['홈', '성적', '대학 찾기', '수시 전략', '성적 입력', '성적 추이', '5 to 9', '대학별 환산', '모의고사'])
    expect(within(sidebar).getByText(label)).toBeTruthy();
  // 지금 대분류(성적)만 펼친다
  expect(within(sidebar).queryByText('전형계획')).toBeNull();
  expect(within(sidebar).getByText('성적 입력').closest('a')?.getAttribute('aria-current')).toBe('page');
  expect(screen.getByText('성적 › 성적 입력')).toBeTruthy();

  const tabs = screen.getByRole('navigation', { name: '하단 탭' });
  for (const label of ['홈', '성적', '대학 찾기', '수시 전략', '더보기']) expect(within(tabs).getByText(label)).toBeTruthy();
  const sub = screen.getByRole('navigation', { name: '성적 소분류' });
  expect(within(sub).getAllByRole('link')).toHaveLength(5);
});

test('교사 셸: 교사 대분류와 하단 탭 4칸', () => {
  renderAt('/teacher/minimum-board');
  const sidebar = screen.getByRole('navigation', { name: '주 메뉴' });
  for (const label of ['우리 반', '성적 관리', '수합·집계', '성적 불러오기', '수능 최저 판정', '모의고사 수합'])
    expect(within(sidebar).getByText(label)).toBeTruthy();
  const tabs = screen.getByRole('navigation', { name: '하단 탭' });
  expect(within(tabs).getAllByRole('link').map((a) => a.textContent?.trim())).toEqual(['우리 반', '성적 관리', '수합·집계', '더보기']);
});

test('관리자 셸: 규칙 관리', () => {
  renderAt('/admin/admin-rules/review');
  const sidebar = screen.getByRole('navigation', { name: '주 메뉴' });
  expect(within(sidebar).getByText('검수').closest('a')?.getAttribute('aria-current')).toBe('page');
});

test('상세 화면은 sub-nav 없이 뒤로가기', () => {
  renderAt('/univ-detail');
  expect(screen.getByRole('button', { name: '뒤로' })).toBeTruthy();
  expect(screen.queryByRole('navigation', { name: '대학 찾기 소분류' })).toBeNull();
});

test('설계 화면은 실제 앱 경로 또는 명시된 Figma 전용 화면으로 연결된다', () => {
  const rules = JSON.parse(
    readFileSync(resolve(process.cwd(), '../rules/design-rules.json'), 'utf8'),
  ) as { screens: Record<string, string> };
  const all = [...allItems(), ...DETAILS, ...OUTSIDE];
  const delivery = JSON.parse(readFileSync(resolve(process.cwd(), '../work/_data/screen-delivery.json'), 'utf8')) as {
    design_only: string[]; host_routes: Record<string, {slug: string; path: string}>;
  };
  for (const name of delivery.design_only) expect(Object.values(rules.screens)).toContain(name);
  for (const designSlug of Object.values(rules.screens)) {
    if (delivery.design_only.includes(designSlug)) {
      expect(all.some(s => s.slug === designSlug), `${designSlug}: 구현 후 전용 목록에서 제거`).toBe(false);
      const draft = JSON.parse(readFileSync(resolve(process.cwd(), `../work/${designSlug}/03-draft.json`), 'utf8'));
      expect(draft.frames['390'], designSlug).toMatch(/^\d+:\d+$/);
      expect(draft.frames['1440'], designSlug).toMatch(/^\d+:\d+$/);
      continue;
    }
    const host = delivery.host_routes[designSlug];
    const slug = host?.slug ?? designSlug;
    const s = all.find((x) => x.slug === slug);
    expect(s, slug).toBeDefined();
    const { container, unmount } = renderAt(host?.path ?? s!.path);
    expect(container.querySelector(`[data-slug="${slug}"]`), slug).not.toBeNull();
    unmount();
  }
});

test('교사 모드 사이드바는 교사 메뉴만 보이고(2026-11-24 사용자 결정), 학생 화면을 열어도 교사 셸을 유지한다', () => {
  const { unmount } = renderAt('/teacher/teacher-dashboard');
  const sidebar = screen.getByRole('navigation', { name: '주 메뉴' });
  for (const label of ['우리 반', '성적 관리', '수합·집계']) expect(within(sidebar).getAllByText(label).length).toBeGreaterThan(0);
  for (const label of ['대학 찾기', '수시 전략']) expect(within(sidebar).queryByText(label)).toBeNull();
  unmount();
  renderAt('/grade-input');
  const again = screen.getByRole('navigation', { name: '주 메뉴' });
  expect(within(again).getByText('우리 반')).toBeTruthy();
  expect(within(screen.getByRole('navigation', { name: '하단 탭' })).getAllByRole('link').map(a => a.textContent?.trim())).toEqual(['우리 반', '성적 관리', '수합·집계', '더보기']);
  sessionStorage.clear();
});
