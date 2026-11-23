import 'fake-indexeddb/auto';
import { readFileSync } from 'node:fs';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../src/App';
import { MinimumSearch, type MinimumSource } from '../src/screens/MinimumSearch';
import { gradesForMinimum, searchMinimum, whatIfMinimum, type Criterion, type MinimumRule } from '../src/domain/minimum';
import type { CutTable } from '../src/domain/mock';
import { studentDb } from '../src/store/studentDb';

// Test-only cut table and criteria; not product data.
const EXAM = '2027년 10월 학력평가';
const band = (top: number, step: number) => ({ absolute: true, cuts: [1, 2, 3, 4].map((grade, i) => ({ grade, min: top - step * i, max: top - step * i })) });
const table: CutTable = { id: 'cut', source: 'test', review_status: 'verified', exam: EXAM, version: 'v1', as_of: '2026-11-20',
  areas: { 국어: band(90, 10), 수학: band(90, 10), 영어: band(90, 10), 한국사: band(45, 5), 통합사회: band(45, 5), 통합과학: band(45, 5) } };
const ALL = ['국어', '수학', '영어', '탐구'] as Criterion['areas'];
const rule = (id: string, university: string, unit: string, criterion: Partial<Criterion>, extra: Partial<MinimumRule> = {}): MinimumRule => ({
  id, source: '2028 모집요강', review_status: 'verified', reviewed_at: '2026-11-12', university, unit, admission: '교과', kind: '교과', field: '사회', region: '서울',
  criterion: { areas: ALL, count: 3, sum: 5, required: null, history_max: null, tamgu: 'best', ...criterion }, ...extra });
const rules: MinimumRule[] = [
  rule('a', '강원대학교', '간호학과', { count: 2, sum: 6 }, { field: '의약', region: '강원' }),
  rule('b', '중앙대학교', '경영학부', {}),
  rule('c', '연세대학교', '경영학과', { required: '국어' }),
  rule('d', '한림대학교', '간호학과', { sum: 7, history_max: 4 }, { field: '의약', region: '강원' }),
  rule('e', '고려대학교', '경영학과', { count: 2, sum: 8 }, { review_status: 'draft' }),
];
// 국 3 · 수 2 · 영 2 · 탐 2(통합사회 2, 통합과학 3) · 한국사 없음
const mock = { exam: EXAM, raw: { 국어: 75, 수학: 85, 영어: 85, 통합사회: 42, 통합과학: 37 }, updated_at: '' };
const source: MinimumSource = { rules, pending: 37, asOf: '2026-11-18' };
const FORBIDDEN = /합격|가능|보장|확률|%|될 거|안정권/;

beforeEach(async () => { await studentDb.clearStudentData(); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const show = (props: Parameters<typeof MinimumSearch>[0]) => render(<MemoryRouter><MinimumSearch {...props} /></MemoryRouter>);

describe('최저로 찾기 판정', () => {
  const g = gradesForMinimum(mock, table)!;
  it('검수된 등급컷의 불리한 쪽 등급으로 읽고 검수 전 등급컷은 읽지 않는다', () => {
    expect(g.grades).toEqual({ 국어: 3, 수학: 2, 영어: 2, 탐구1: 2, 탐구2: 3 });
    expect(gradesForMinimum(mock, { ...table, review_status: 'draft' })).toBeNull();
  });
  it('검수 전 기준은 빼고 판정 순 → 대학 이름 순으로 줄 세운다', () => {
    const rows = searchMinimum(rules, g);
    expect(rows.map(r => [r.rule.university, r.judged.verdict, r.sum])).toEqual([
      ['강원대학교', '충족', 4], ['중앙대학교', '근접', 6], ['연세대학교', '미충족', 7], ['한림대학교', '자료 부족', 6]]);
  });
  it('한 영역만 1등급 올려 새로 충족되는 전형을 센다', () => {
    const w = whatIfMinimum(rules, g);
    expect(w.map(x => [x.area, x.from, x.to, x.after - x.before])).toEqual([['국어', 3, 2, 0], ['수학', 2, 1, 1], ['영어', 2, 1, 1], ['탐구', 2, 1, 1]]);
    expect(w[1].newly).toEqual(['b']);
  });
});

describe('최저로 찾기 화면', () => {
  it('주요 흐름: 타일로 거르고, 한 영역 올려 보고, 조건 0건에서 초기화하고, 근거를 펼친다', async () => {
    await studentDb.saveMock(mock);
    show({ load: async () => source, cuts: [table] });
    expect(await screen.findByText('국 3 · 수 2 · 영 2 · 탐 2 · 한국사 –')).toBeTruthy();
    expect(screen.getByText('검수된 수능 최저 전형 4개 기준이에요')).toBeTruthy();
    expect(screen.getByText(/검수 전이라 판정하지 않은 전형 37개/)).toBeTruthy();
    expect(screen.getByRole('heading', { name: '전체 4개' })).toBeTruthy();
    expect(screen.queryByText('고려대학교')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /근접/, pressed: false }));
    expect(screen.getByRole('heading', { name: '근접 1개' })).toBeTruthy();
    expect(screen.getByText('중앙대학교')).toBeTruthy();
    expect(screen.queryByText('강원대학교')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /수학을 2등급에서 1등급으로 바꾸면 충족 전형이 1개에서 2개로 1개 늘어요/ }));
    expect(screen.getByRole('heading', { name: '수학 1등급 오르면 새로 충족 1개' })).toBeTruthy();
    expect(screen.getByText('수학 1등급이면 → 충족')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /수학 1등급 오르면 ✕/ }));
    expect(screen.getByRole('heading', { name: '전체 4개' })).toBeTruthy();

    fireEvent.change(screen.getByLabelText('계열'), { target: { value: '의약' } });
    fireEvent.change(screen.getByLabelText('대학·학과 검색'), { target: { value: '한의' } });
    expect(screen.getByText('고른 조건에 맞는 전형이 없어요')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '조건 초기화' }));
    expect(screen.getByRole('heading', { name: '전체 4개' })).toBeTruthy();

    const card = screen.getByText('연세대학교').closest('li')!;
    const toggle = within(card).getByRole('button', { name: '어떻게 계산했나요?' });
    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(within(card).getByText(/2028 모집요강 · 관리자 검수 2026-11-12/)).toBeTruthy();
    expect(within(card).getByText('내 합 7 / 기준 5')).toBeTruthy();
    expect(screen.getAllByRole('button', { name: /관심에 담기/ }).length).toBe(4);
    expect(document.body.textContent).not.toMatch(FORBIDDEN);
  });

  it('이미 1등급인 영역은 바꿔 볼 수 없다', async () => {
    await studentDb.saveMock({ ...mock, raw: { ...mock.raw, 영어: 95 } });
    show({ load: async () => source, cuts: [table] });
    const row = await screen.findByRole('button', { name: '영어는 이미 1등급이라 바꿔 볼 수 없어요' });
    expect((row as HTMLButtonElement).disabled).toBe(true);
  });

  it('불러오는 중 · 오류 뒤 다시 읽기', async () => {
    await studentDb.saveMock(mock);
    show({ load: () => new Promise(() => {}), cuts: [table] });
    expect(await screen.findByRole('status')).toHaveProperty('textContent', '검수된 수능 최저 기준을 읽고 있어요.');
    cleanup();
    let fail = true;
    show({ load: async () => { if (fail) throw new Error('x'); return source; }, cuts: [table] });
    expect((await screen.findByRole('alert')).textContent).toContain('수능 최저 기준을 읽지 못했어요. 인터넷 연결을 확인하고 다시 읽어 주세요.');
    fail = false;
    fireEvent.click(screen.getByRole('button', { name: '다시 읽기' }));
    expect(await screen.findByText('충족 현황')).toBeTruthy();
  });

  it('성적 없음 · 검수 자료 없음 · 등급컷 검수 전은 판정하지 않는다', async () => {
    show({ load: async () => source, cuts: [table] });
    expect(await screen.findByText('아직 넣은 모의고사 성적이 없어요')).toBeTruthy();
    expect(screen.getByRole('link', { name: '성적 입력하기' }).getAttribute('href')).toBe('/mock-score');
    cleanup();

    await studentDb.saveMock(mock);
    show({ load: async () => ({ ...source, rules: rules.map(r => ({ ...r, review_status: 'draft' as const })) }), cuts: [table] });
    expect(await screen.findByText('검수된 수능 최저 기준이 아직 없어요')).toBeTruthy();
    expect(screen.getByText(/지금은 37개가 검수 전이에요/)).toBeTruthy();
    expect(screen.queryByText('충족 현황')).toBeNull();
    cleanup();

    show({ load: async () => source, cuts: [] });
    expect(await screen.findByText('등급컷 준비 중')).toBeTruthy();
    expect(screen.queryByText('충족 현황')).toBeNull();
    expect(document.body.textContent).not.toMatch(FORBIDDEN);
  });

  it('메뉴와 경로로 들어가고 실제 전형계획 자료는 검수 전 개수만 보여 준다', async () => {
    const catalog = readFileSync('public/data/admission-plans.json', 'utf8');
    const pending = JSON.parse(catalog).entries.flatMap((e: { programs: { minimum: string }[] }) => e.programs).filter((p: { minimum: string }) => p.minimum.trim() && !p.minimum.includes('미적용')).length;
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(catalog)));
    await studentDb.saveMock(mock);
    render(<MemoryRouter initialEntries={['/minimum-search']}><App /></MemoryRouter>);
    expect(await screen.findByText('검수된 수능 최저 기준이 아직 없어요')).toBeTruthy();
    expect(screen.getByText(new RegExp(`지금은 ${pending}개가 검수 전이에요`))).toBeTruthy();
    const sub = screen.getAllByRole('link', { name: '최저로 찾기' });
    expect(sub.length).toBeGreaterThan(0);
    expect(document.body.textContent).not.toMatch(FORBIDDEN);
  });
});
