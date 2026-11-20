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
  it('추이에서 복원한 시험 수정으로 이동하고 저장 후 추이로 돌아온다', async () => {
    const exam = '2025년 6월 복원 기록';
    await studentDb.saveMock({ exam, raw: { 국어: 70 }, updated_at: '' });
    render(<MemoryRouter initialEntries={['/score-trend']}><App /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('link', { name: `${exam} 성적 수정` }));
    const input = await screen.findByLabelText('국어 원점수') as HTMLInputElement;
    expect((screen.getByLabelText('시험') as HTMLSelectElement).value).toBe(exam);
    expect(input.value).toBe('70');
    fireEvent.change(input, { target: { value: '75' } }); fireEvent.blur(input);
    await screen.findByText('이 기기에 저장했어요.');
    fireEvent.click(screen.getByRole('link', { name: '성적 추이 보기' }));
    expect(await screen.findByText('75/100점')).toBeTruthy();
    expect((await studentDb.snapshot()).mocks?.[0].raw.국어).toBe(75);
  });
  it('원점수를 저장하고, 잘못된 값은 저장하지 않는다', async () => {
    render(<MemoryRouter initialEntries={['/mock-score']}><App /></MemoryRouter>);
    const kor = await screen.findByLabelText('국어 원점수');
    fireEvent.change(kor, { target: { value: '87' } }); fireEvent.blur(kor);
    await waitFor(async () => expect((await studentDb.mocks.toArray())[0].raw).toEqual({ 국어: 87 }));
    expect(await screen.findByText('6개 중 1개 입력')).toBeTruthy();
    expect(screen.getAllByText('등급컷 준비 중').length).toBeGreaterThan(0);
    const hist = screen.getByLabelText('한국사 원점수');
    fireEvent.change(hist, { target: { value: '60' } }); fireEvent.blur(hist);
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect((await studentDb.mocks.toArray())[0].raw).toEqual({ 국어: 87 });
  });
});
