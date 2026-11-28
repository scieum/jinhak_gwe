import { describe, expect, test, vi } from 'vitest';
import { referenceAssessment } from '../src/domain/doelgakAssessment';
import * as conversion from '../src/domain/referenceConversion';
import { RESULT_COLUMNS, type ResultRow } from '../src/domain/resultReview';
import { subject, scoringRule } from './fixtures';
import type { ReferenceCut } from '../src/domain/interestComparison';

const interest = { id: 'a', university: '가온대', program: '학생부교과(일반)', department: '화학과', created_at: '' };
const row = { ...Object.fromEntries(RESULT_COLUMNS.map(k => [k, ''])), university: interest.university, program: interest.program, recruit_unit: '화학과', result_year: '2026', round: '수시', metric: '교과등급', grade_system: '9', admission_type: '교과' } as ResultRow;
const ref = (value = 2.4, cut: 'cut_70' | 'cut_50' = 'cut_70'): ReferenceCut => ({ value, year: '2026', cut, row });
describe('참고 판정', () => {
  test('규칙이 없는 경우 전 교과 참고임을 명시한다', () => {
    expect(referenceAssessment([subject()], interest, ref())).toMatchObject({ status: 'ready', scope: '입력한 전 교과 · 학점 가중평균' });
  });
  test('대학이 선택한 과목만 참고 환산하고 공식 점수와 섞지 않는다', () => {
    const data = [subject({ rank_grade: 1 }), subject({ id: 'eng', rank_grade: 5 })];
    const score = { status: 'not_ready' as const, reason: '출결 필요', trace: [{ rule: 'x', subject_id: 'math', detail: '선택', value: 1 }] };
    expect(referenceAssessment(data, interest, ref(), scoringRule(), score)).toMatchObject({ status: 'ready', average5: 1, subjects: 1, scope: '대학 규칙에서 선택된 과목 · 학점 가중평균' });
  });
  test('50% 컷·종합전형은 교과 위치만 표시한다', () => {
    expect(referenceAssessment([subject()], interest, ref(2.4, 'cut_50'))).toMatchObject({ status: 'ready', label: null });
    expect(referenceAssessment([subject()], { ...interest, program: '학생부종합 일반' }, ref())).toMatchObject({ status: 'ready', label: null });
  });
  test('성적 없음·입결 없음·5등급 원입결에는 판정을 만들지 않는다', () => {
    expect(referenceAssessment([], interest, ref()).status).toBe('pending');
    expect(referenceAssessment([subject()], interest, { reason: '입결 없음' }).status).toBe('pending');
    expect(referenceAssessment([subject()], interest, { ...ref(), row: { ...row, grade_system: '5' } } as ReferenceCut).status).toBe('pending');
  });
  test('구간 경계는 반올림 전 보수 쪽 값으로 판정하고 전체 범위의 경계를 표시한다', () => {
    const original = conversion.referenceConversion(2)!;
    const mock = vi.spyOn(conversion, 'referenceConversion').mockReturnValue({ ...original, grade9Range: [2, 2.5] });
    try {
      expect(referenceAssessment([subject()], interest, ref(2.4))).toMatchObject({ status: 'ready', label: '적정', favorableLabel: '안정', boundary: true });
      for (const [cut, label] of [[2.8, '안정'], [2.4, '적정'], [2.1, '소신'], [2.09, '위험']] as const)
        expect(referenceAssessment([subject()], interest, ref(cut))).toMatchObject({ status: 'ready', label });
    } finally { mock.mockRestore(); }
  });
});
