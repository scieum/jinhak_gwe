import 'fake-indexeddb/auto';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { subject, scoringRule } from './fixtures';
import { studentDb } from '../src/store/studentDb';
import { App } from '../src/App';
import { programs } from '../src/data/catalog';
import { currentComparisonBasis } from '../src/domain/results';

// Only this test module replaces release data with synthetic reviewed fixtures.
vi.mock('../src/data/conversion-rules', async importOriginal => {
  const actual = await importOriginal<typeof import('../src/data/conversion-rules')>();
  return { ...actual, baseConversionRule: { ...actual.baseConversionRule, review_status: 'verified' }, judgmentRule: { ...actual.judgmentRule, review_status: 'verified' } };
});
vi.mock('../src/data/catalog', async importOriginal => {
  const actual = await importOriginal<typeof import('../src/data/catalog')>();
  const { scoringRule: makeRule } = await import('./fixtures');
  return { ...actual, programs: [{ id: 'test-program', admission_year: 2028, university: '테스트 대학', program: '가상 교과', department: '가상 학과', source: 'synthetic fixture',
    license_status: 'allowed', rule: makeRule(), cut: { id: 'synthetic-cut', source: 'synthetic fixture', review_status: 'verified', cut70: 3.5 }, cut_grade_system: 9,
    cut_subject_scope: ['국어', '수학', '영어', '사회', '과학'], minimum_required: true }] };
});
beforeEach(async () => {
  await studentDb.restore({ grades: [subject()], attendance: [] });
  programs[0].cut_basis = { ...currentComparisonBasis([subject()], ['국어', '수학', '영어', '사회', '과학'], true), statistic: 'p70', source: 'synthetic fixture' };
});
afterEach(cleanup);
const at = (path: string) => render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>);
test('검수된 데이터가 있는 5→9 화면은 외측 반올림 범위를 표시', async () => {
  at('/five-to-nine');
  fireEvent.click(screen.getByRole('button', { name: '내 성적 분석' }));
  // 5등급 2 -> 누적 22%; 9등급 3 + (22-17)/(31.5-17) = 3.344827...
  expect(await screen.findByText('약 3.3~3.4')).toBeTruthy();
  expect(screen.getAllByText(/A-2 과목 기반/).length).toBeGreaterThan(0);
});
test('대학별 화면은 엔진 결과와 trace 표시', async () => {
  expect(scoringRule().review_status).toBe('verified');
  await studentDb.setInterest('테스트 대학', '가상 교과', true, '가상 학과'); // 대학별 환산은 관심 대학만 계산해요(v2 시안)
  at('/univ-score');
  const card = await screen.findByRole('button', { name: '테스트 대학 가상 교과 환산 상세' });
  expect(within(card).getByText('/ 100')).toBeTruthy();
  fireEvent.click(card);
  const detail = await screen.findByRole('dialog', { name: '테스트 대학 환산 상세' });
  expect(within(detail).getAllByText('96.00').length).toBeGreaterThan(0);
  expect(within(detail).getByText('어떻게 계산했나요?')).toBeTruthy();
});
test('대학별 환산: 관심 대학이 없으면 계산하지 않고 담기 안내만', async () => {
  await studentDb.interests.clear();
  at('/univ-score');
  expect(await screen.findByText('아직 담은 대학이 없어요')).toBeTruthy();
  expect(screen.getByRole('link', { name: '관심 대학 담기' })).toBeTruthy();
  expect(screen.queryByText('/ 100')).toBeNull();
});
test('교과 판정은 레인 머리에만, 카드는 내 환산·70% 컷 차이·미니 막대·조건 칩', async () => {
  at('/doelgak');
  const lane = await screen.findByRole('region', { name: '적정 전형' });
  expect(within(lane).getByRole('button', { name: '테스트 대학' })).toBeTruthy();
  expect(within(lane).getByText(/^70% 컷 3\.5 · 차이 /)).toBeTruthy();
  expect(within(lane).getByRole('img', { name: /70% 컷 3\.5/ })).toBeTruthy();
  expect(within(lane).getByText('수능최저 확인 필요')).toBeTruthy();
  expect(screen.getByText('판정된 전형 1개 · 판정 안 함 0개')).toBeTruthy();
});
test('입결 기준이 없으면 판정 표시를 차단', async () => {
  programs[0].cut_basis = undefined;
  at('/doelgak');
  const group = await screen.findByRole('region', { name: '비교 자료 확인 필요 전형' });
  expect(within(group).getByText(/70% 컷 — · 학년도·등급제·지표·산식/)).toBeTruthy();
  expect(within(screen.getByRole('region', { name: '적정 전형' })).queryByText('테스트 대학')).toBeNull();
});
test('판정 필터는 적용하기를 눌러야 바뀌고, 결과 0이면 필터 초기화 안내', async () => {
  at('/doelgak');
  await screen.findByRole('region', { name: '적정 전형' });
  const filters = screen.getByRole('complementary', { name: '판정 조회 조건' });
  fireEvent.click(within(within(filters).getByRole('group', { name: '판정' })).getByRole('button', { name: '소신' }));
  expect(screen.getByRole('region', { name: '적정 전형' })).toBeTruthy();
  fireEvent.click(within(filters).getByRole('button', { name: '적용하기' }));
  expect(screen.queryByRole('region', { name: '적정 전형' })).toBeNull();
  expect(screen.getByText('조건에 맞는 전형이 없어요')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '필터 초기화' }));
  expect(await screen.findByRole('button', { name: '테스트 대학' })).toBeTruthy();
});
