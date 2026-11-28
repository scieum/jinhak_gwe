import 'fake-indexeddb/auto';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { scoringRule, subject } from './fixtures';
import * as released from '../src/data/releasedRules';
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
  test('다른 대학·캠퍼스 또는 이름 일부만 겹치는 전형의 컷을 섞지 않아요', () => {
    expect('reason' in latestReferenceCut(interest(), [row({ university: '다른대' })])).toBe(true);
    expect('reason' in latestReferenceCut({ ...interest(), university: '가온대(서울)' }, [row({ university: '가온대(부산)' })])).toBe(true);
    expect('reason' in latestReferenceCut({ ...interest(), program: '지역균형' }, [row({ program: '지역균형특별' })])).toBe(true);
  });
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
beforeEach(async () => { await studentDb.clearStudentData(); vi.spyOn(loader, 'loadCollectedIndex').mockResolvedValue(index); vi.spyOn(loader, 'loadCollectedRows').mockResolvedValue([row()]);
  vi.spyOn(released, 'useReleasedRulesState').mockReturnValue({ rules: [], failed: false, loading: false, retry: vi.fn() }); });
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
  test('규칙 없는 공식 환산은 대기, 사용자 허용 참고 판정은 전 교과 기준을 명시해 별도로 표시해요', async () => {
    await studentDb.restore({ grades: [subject()], attendance: [] });
    await studentDb.interests.put(interest());
    at('/doelgak');
    const card = (await screen.findByRole('heading', { name: '가온대' })).closest('article') as HTMLElement;
    expect(await within(card).findByText('2026학년도 70% 컷 2.400')).toBeTruthy();
    expect(within(card).getByText('2028학년도 이 대학·전형의 검수된 환산 규칙이 아직 없어요.')).toBeTruthy();
    expect(within(card).getByText('계산 대기')).toBeTruthy();
    expect(within(card.querySelector('.dg-card__numbers') as HTMLElement).queryByText(/컷보다|컷이 내 범위|^약 \d/)).toBeNull();
    expect(within(card).getByText(/입력한 전 교과 · 학점 가중평균/)).toBeTruthy();
    expect(within(card).getByText('과거 입결 기반 참고 판정')).toBeTruthy();
    expect(screen.queryByText(/^(안정|적정|소신|위험)$/)).toBeNull();
  });
  test('대학·전형별 반영 교과로 실제 점수를 계산하고 과거 등급 컷과 차이는 내지 않아요', async () => {
    vi.mocked(released.useReleasedRulesState).mockReturnValue({ rules: [
      scoringRule({ id: 'math-rule', university: '가온대', program: '일반전형', subject_groups: ['수학'] }),
      scoringRule({ id: 'english-rule', university: '나래대', program: '일반전형', subject_groups: ['영어'] }),
    ], failed: false, loading: false, retry: vi.fn() });
    await studentDb.restore({ grades: [subject({ rank_grade: 1 }), subject({ id: 'eng', subject_group: '영어', rank_grade: 4 })], attendance: [] });
    await studentDb.interests.put(interest());
    await studentDb.setInterest('나래대', '일반전형', true, '간호학과');
    at('/doelgak');
    const first = (await screen.findByRole('heading', { name: '가온대' })).closest('article') as HTMLElement;
    const second = screen.getByRole('heading', { name: '나래대' }).closest('article') as HTMLElement;
    expect(within(first).getByText('100.00 / 100점')).toBeTruthy();
    expect(within(second).getByText('80.00 / 100점')).toBeTruthy();
    expect(within(first).getByText('어떻게 계산했나요?')).toBeTruthy();
    expect(within(first.querySelector('.dg-card__numbers') as HTMLElement).queryByText(/컷보다|^약 \d/)).toBeNull();
    expect(await within(first).findByText(/대학 규칙에서 선택된 과목 · 학점 가중평균/)).toBeTruthy();
    expect(within(first).getByText('참고 비교 · 합격 예측 아님')).toBeTruthy();
  });
  test('출결이 필요한 대학은 출결 없이 점수를 내지 않아요', async () => {
    vi.mocked(released.useReleasedRulesState).mockReturnValue({ rules: [scoringRule({ university: '가온대', program: '일반전형', grade_max_score: 90,
      attendance_rule: { years: [1], max_score: 10, tardy_to_absence: 3, deduction_table: [{ absence_max: 366, points: 0 }] } })], failed: false, loading: false, retry: vi.fn() });
    await studentDb.restore({ grades: [subject()], attendance: [] });
    await studentDb.interests.put(interest());
    at('/doelgak');
    expect(await screen.findByText('반영 학년의 출결을 입력해 주세요.')).toBeTruthy();
    expect(screen.getByRole('link', { name: '성적·출결 입력 확인 ›' }).getAttribute('href')).toBe('/grade-input');
    expect(screen.queryByText(/\/ 100점/)).toBeNull();
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

describe('막대 위 거리 문장', () => {
  test('등급은 작을수록 앞: 컷이 뒤면 앞서요, 앞이면 뒤예요, 범위 안이면 그렇게 말해요', async () => {
    const { gapText } = await import('../src/screens/Doelgak');
    expect(gapText(1.3, 1.9, 4.73)).toBe('내 범위가 컷보다 2.8등급 앞서요');
    expect(gapText(2.5, 3.0, 2.1)).toBe('내 범위가 컷보다 0.4등급 뒤예요');
    expect(gapText(2.0, 2.6, 2.4)).toBe('컷이 내 범위 안에 있어요');
  });
});
