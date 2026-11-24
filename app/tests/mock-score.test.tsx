import 'fake-indexeddb/auto';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { App } from '../src/App';
import { studentDb } from '../src/store/studentDb';
import { gradeLabel, parseMocks, readGrade, type CutTable } from '../src/domain/mock';
import { parseStudentBackup } from '../src/domain/student';

// Test-only table with the spec example bands; not product data.
const table: CutTable = { id: 't', source: 'test', review_status: 'verified', exam: 'x', version: 'v', as_of: '2026-11-18', areas: {
  국어: { absolute: false, cuts: [{ grade: 1, min: 92, max: 94 }, { grade: 2, min: 86, max: 88 }, { grade: 3, min: 79, max: 81 }] },
  영어: { absolute: true, cuts: [{ grade: 1, min: 90, max: 90 }, { grade: 2, min: 80, max: 80 }] },
} };
beforeEach(async () => { await studentDb.clearStudentData(); });
afterEach(cleanup);

describe('예상 등급 읽기', () => {
  it('컷 폭 안이면 두 등급 범위, 밖이면 한 등급', () => {
    expect(gradeLabel(readGrade(87, '국어', table))).toBe('약 2~3등급');
    expect(gradeLabel(readGrade(89, '국어', table))).toBe('약 2등급');
    expect(gradeLabel(readGrade(50, '국어', table))).toBe('약 4등급');
    expect(gradeLabel(readGrade(92, '영어', table))).toBe('1등급');
  });
  it('검수 전 표나 없는 영역은 읽지 않는다', () => {
    expect(readGrade(87, '국어', { ...table, review_status: 'draft' })).toEqual({ status: 'pending', reason: '등급컷 준비 중' });
    expect(readGrade(40, '한국사', table).status).toBe('pending');
  });
  it('원점수 범위를 검사한다', () => {
    expect(() => parseMocks([{ exam: 'x', raw: { 한국사: 51 }, updated_at: '' }])).toThrow();
    expect(parseStudentBackup({ grades: [], attendance: [], mocks: [{ exam: 'x', raw: { 국어: 87 }, updated_at: '' }] }).mocks).toHaveLength(1);
  });
});
describe('모의고사 화면', () => {
  it('빠른 영역별 저장과 삭제가 다른 영역을 덮어쓰지 않는다', async () => {
    await Promise.all([
      studentDb.saveMockArea('시험', '국어', 87),
      studentDb.saveMockArea('시험', '수학', 90),
      studentDb.saveMockArea('시험', '한국사', 0),
    ]);
    expect((await studentDb.mocks.get('시험'))?.raw).toEqual({ 국어: 87, 수학: 90, 한국사: 0 });
    await Promise.all([studentDb.saveMockArea('시험', '국어', undefined), studentDb.saveMockArea('시험', '영어', 88)]);
    expect((await studentDb.mocks.get('시험'))?.raw).toEqual({ 수학: 90, 한국사: 0, 영어: 88 });
    await expect(studentDb.saveMockArea('시험', '한국사', 51)).rejects.toThrow();
    expect((await studentDb.mocks.get('시험'))?.raw.한국사).toBe(0);
  });
  it('추이에서 복원한 시험 수정으로 이동해 그 시험을 고쳐 저장한다', async () => {
    const exam = '2025년 6월 복원 기록';
    await studentDb.saveMock({ exam, raw: { 국어: 70 }, updated_at: '' });
    render(<MemoryRouter initialEntries={['/score-trend']}><App /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('link', { name: `${exam} 성적 수정` }));
    const input = await screen.findByLabelText('국어 원점수') as HTMLInputElement;
    expect(screen.getByRole('heading', { name: exam })).toBeTruthy();
    expect(input.value).toBe('70');
    fireEvent.change(input, { target: { value: '75' } }); fireEvent.blur(input);
    await screen.findByText('이 기기에 저장했어요');
    expect((await studentDb.snapshot()).mocks?.[0].raw.국어).toBe(75);
  });
  it('원점수를 저장하고, 잘못된 값은 저장하지 않는다', async () => {
    render(<MemoryRouter initialEntries={['/mock-score']}><App /></MemoryRouter>);
    expect(await screen.findByText('이 시험에 넣은 원점수가 아직 없어요')).toBeTruthy();
    expect((screen.getAllByRole('button', { name: '선생님께 보내기' })[0] as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: '원점수 넣기' }));
    const kor = await screen.findByLabelText('국어 원점수');
    fireEvent.change(kor, { target: { value: '87' } }); fireEvent.blur(kor);
    await waitFor(async () => expect((await studentDb.mocks.toArray())[0].raw).toEqual({ 국어: 87 }));
    expect(await screen.findByText('5개 중 1개 입력')).toBeTruthy();
    expect(screen.getAllByText('등급컷 준비 중').length).toBeGreaterThan(0);
    const tamgu = screen.getByLabelText('탐구1 원점수');
    fireEvent.change(tamgu, { target: { value: '60' } }); fireEvent.blur(tamgu);
    expect((await screen.findByRole('alert')).textContent).toContain('탐구1 원점수는 0~50 사이 정수로 적어 주세요');
    expect((await studentDb.mocks.toArray())[0].raw).toEqual({ 국어: 87 });
  });
});
describe('샘플 모드 = v2 시안 데모(346:140444)', () => {
  it('6월 학평 원점수 → 시안 등급, 최저 근접·충족·준비 중, 지우면 샘플 모의고사도 빠진다', async () => {
    const { showSample, clearSample } = await import('../src/data/sample');
    await showSample();
    try {
      render(<MemoryRouter initialEntries={['/mock-score']}><App /></MemoryRouter>);
      expect(await screen.findByRole('heading', { name: '2026년 6월 학력평가(고2)' })).toBeTruthy();
      expect(screen.getByText('1 / 2장')).toBeTruthy();
      expect(screen.getAllByText('수학·국어·영어 중 하나가 1등급이면 기준 안이에요').length).toBeGreaterThan(0);
      expect(screen.getByText('등급 합 6')).toBeTruthy();
      expect(screen.getByText('검수 전 기준이라 판정하지 않았어요')).toBeTruthy();
      expect(screen.getByText(/최저 없는 2·5·6번은 뺐어요/)).toBeTruthy();
    } finally { await clearSample(); }
    expect(await studentDb.mocks.count()).toBe(0);
  });
});
