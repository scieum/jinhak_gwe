import 'fake-indexeddb/auto';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { subject } from './fixtures';
import { App } from '../src/App';
import { studentDb } from '../src/store/studentDb';
import * as loader from '../src/data/collectedResults';
import { RESULT_COLUMNS, type ResultRow } from '../src/domain/resultReview';
import type { CollectedIndex } from '../src/domain/collectedResults';
import { interestId, type Interest } from '../src/domain/interests';
import { latestReferenceCut } from '../src/domain/interestComparison';

const interest = (department: string | undefined = '간호학과'): Interest => ({ id: interestId('가온대', '일반전형', department), university: '가온대', program: '일반전형', department, created_at: '2026-11-20T00:00:00Z' });
const row = (change: Partial<ResultRow> = {}): ResultRow => ({ ...Object.fromEntries(RESULT_COLUMNS.map(f => [f, ''])), university: '가온대', program: '일반전형', recruit_unit: '간호학과', result_year: '2026', round: '수시', metric: '교과등급', grade_system: '9', cut_70: '2.400', cut_50: '2.100', ...change }) as ResultRow;

describe('될각 참고 비교 컷 고르기', () => {
  test('가장 최근 학년도 70% 컷, 없으면 50% 컷', () => {
    expect(latestReferenceCut(interest(), [row({ result_year: '2025', cut_70: '2.9' }), row()])).toMatchObject({ year: '2026', cut: 'cut_70', value: 2.4 });
    expect(latestReferenceCut(interest(), [row({ cut_70: '' })])).toMatchObject({ year: '2026', cut: 'cut_50', value: 2.1 });
    expect(latestReferenceCut(interest(), [row({ result_year: '2025' }), row({ cut_70: '', cut_50: '' })])).toMatchObject({ year: '2025', cut: 'cut_70' });
  });
  test('전형계획 이름과 수집 이름이 달라도 핵심 이름으로 맞추고, 교과·종합은 섞지 않아요', () => {
    const plan = { ...interest(), program: '학생부교과(지역균형)' };
    expect(latestReferenceCut(plan, [row({ program: '학생부교과 [지역균형전형]', cut_70: '1.90' })])).toMatchObject({ value: 1.9 });
    expect(latestReferenceCut(plan, [row({ program: '지역균형', cut_70: '1.77' })])).toMatchObject({ value: 1.77 });
    expect('reason' in latestReferenceCut(plan, [row({ program: '학생부종합(지역균형)' })])).toBe(true);
    expect('reason' in latestReferenceCut(plan, [row({ program: '학생부교과(학교장추천)' })])).toBe(true);
  });
  test("'학생부교과'처럼 일반 이름이면 같은 학과 교과전형이 하나뿐일 때만 그 전형과 비교해요", () => {
    const generic = { ...interest(), program: '학생부교과' };
    expect(latestReferenceCut(generic, [row({ program: '학생부교과(KU지역균형)', cut_70: '2.13' }), row({ program: '학생부종합(KU자기추천)', admission_type: '종합', cut_70: '3.0' })])).toMatchObject({ value: 2.13 });
    expect('reason' in latestReferenceCut(generic, [row({ program: '학생부교과(KU지역균형)' }), row({ program: '학생부교과(기회균형)', cut_70: '3.1' })])).toBe(true);
  });
  test('같은 해 행이 둘이어도 컷 있는 행이 하나면 그 행, 값이 다른 행이 여럿이면 고르지 않아요', () => {
    expect(latestReferenceCut(interest(), [row({ cut_70: '', cut_50: '' }), row({ cut_70: '1.64' })])).toMatchObject({ value: 1.64 });
    expect('reason' in latestReferenceCut(interest(), [row(), row({ cut_70: '2.5' })])).toBe(true);
  });
  test('학과 없음 · 같은 해 원문 행 여러 개 · 컷 없음은 숫자 없이 이유만', () => {
    expect(latestReferenceCut({ ...interest(), department: undefined }, [row()])).toEqual({ reason: '학과를 고르면 입결과 비교해요.' });
    expect('reason' in latestReferenceCut(interest(), [row(), row({ cut_70: '2.5' })])).toBe(true);
    expect('reason' in latestReferenceCut(interest(), [row({ recruit_unit: '다른학과' })])).toBe(true);
  });
});

const index: CollectedIndex = { format: 'jinhak-navi-collected-index', version: 1, status: 'draft', generated_at: '', source_file: '', source_sha256: 'a'.repeat(64), rows: 1, sources: 1,
  universities: [{ university: '가온대', file: 'a'.repeat(64) + '.json', sha256: 'a'.repeat(64), bytes: 1, rows: 1, sources: 1, years: ['2026'], rounds: { 수시: 1 } }] };
beforeEach(async () => { await studentDb.clearStudentData(); vi.spyOn(loader, 'loadCollectedIndex').mockResolvedValue(index); vi.spyOn(loader, 'loadCollectedRows').mockResolvedValue([row()]); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const at = (path: string) => render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>);

describe('검수된 판정 전형이 없을 때 될각 = 관심 전형 참고 비교', () => {
  test('하트로 담은 전형이 성적 없이도 될각에 들어오고 최근 입결 컷을 보여요', async () => {
    await studentDb.interests.put(interest());
    at('/doelgak');
    const card = (await screen.findByRole('heading', { name: '가온대' })).closest('article')!;
    expect(await within(card as HTMLElement).findByText('2026학년도 70% 컷 2.400')).toBeTruthy();
    expect(within(card as HTMLElement).getByText('판정 준비 중')).toBeTruthy();
    expect(screen.getByRole('link', { name: '성적 입력하기 ›' })).toBeTruthy();
  });
  test('성적을 넣으면 내 참고 추정 범위와 차이가 붙고, 판정 이름(안정·적정·소신·위험)은 붙이지 않아요', async () => {
    await studentDb.restore({ grades: [subject()], attendance: [] });
    await studentDb.interests.put(interest());
    at('/doelgak');
    const card = (await screen.findByRole('heading', { name: '가온대' })).closest('article') as HTMLElement;
    expect(await within(card).findByText(/^2026학년도 70% 컷 2\.400 · 차이 [+−]?\d\.\d$/)).toBeTruthy();
    expect(within(card).getByText(/^약 \d\.\d~\d\.\d$/)).toBeTruthy();
    expect(screen.queryByText(/^(안정|적정|소신|위험)$/)).toBeNull();
  });
  test('학과 없이 담은 전형은 카드에서 학과를 고르면 그 학과로 바뀌고 입결과 비교해요', async () => {
    await studentDb.setInterest('가온대', '일반전형', true);
    at('/doelgak');
    const select = await screen.findByRole('combobox', { name: '학과 고르기' });
    expect(within(select).getAllByRole('option').map(o => o.textContent)).toEqual(['학과를 골라 주세요', '간호학과']);
    fireEvent.change(select, { target: { value: '간호학과' } });
    expect(await screen.findByText('2026학년도 70% 컷 2.400')).toBeTruthy();
    expect((await studentDb.interests.toArray()).map(i => i.department)).toEqual(['간호학과']); // 학과 없는 옛 항목은 바뀌어요
  });
  test('관심 전형이 없으면 담는 곳을 안내해요', async () => {
    at('/doelgak');
    expect(await screen.findByText('관심 전형이 없어요')).toBeTruthy();
  });
});
