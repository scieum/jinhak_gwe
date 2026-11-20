import 'fake-indexeddb/auto';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
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
  expect(await screen.findByText('3.3 ~ 3.4')).toBeTruthy();
  expect(screen.getByText('A-2 과목 기반')).toBeTruthy();
});
test('대학별 화면은 엔진 결과와 trace 표시', async () => {
  expect(scoringRule().review_status).toBe('verified');
  at('/univ-score'); expect(await screen.findByText('96.00 / 100')).toBeTruthy();
  expect(screen.getByText('어떻게 계산했나요?')).toBeTruthy();
});
test('교과 판정은 실제 환산 결과로 적정, 최저는 별도 확인 상태', async () => {
  at('/doelgak'); expect(await screen.findByText('◆ 적정')).toBeTruthy();
  expect(screen.getByText('수능최저 확인 필요')).toBeTruthy();
});
test('입결 기준이 없으면 판정 표시를 차단', async () => {
  programs[0].cut_basis = undefined;
  at('/doelgak');
  expect(await screen.findByText(/— 학년도·등급제·지표·산식/)).toBeTruthy();
  expect(screen.queryByText('◆ 적정')).toBeNull();
});
