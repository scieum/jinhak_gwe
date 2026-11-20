import { describe, expect, test } from 'vitest';
import { scoreUniversity } from '../src/engine/scoring';
import { emptyAttendance } from '../src/domain/student';
import { scoringRule, subject } from './fixtures';

describe('R-CALC 대학별 환산', () => {
  test('검수 전 규칙은 숫자를 반환하지 않는다', () => expect(scoreUniversity([subject()], [], scoringRule({ review_status: 'draft' })).status).toBe('not_ready'));
  test('출처가 없는 verified 규칙도 차단', () => expect(scoreUniversity([subject()], [], scoringRule({ source: '' })).status).toBe('not_ready'));
  test('학점 가중과 기본점수, 중간 반올림 없이 마지막에만 반올림', () => {
    const r = scoreUniversity([subject({ rank_grade: 1, credits: 1 }), subject({ id: 'english', credits: 2, rank_grade: 3 })], [], scoringRule({ base_score: 20 }));
    expect(r.status).toBe('ready');
    if (r.status === 'ready') { expect(r.value.total).toBe(94.67); expect(r.value.grade).toBeCloseTo(94.666666, 5); expect(r.trace.length).toBeGreaterThan(3); }
  });
  test('학년별 가중: 1학년 20%, 2학년 80%', () => {
    const r = scoreUniversity([subject({ semester: '1-1', rank_grade: 1 }), subject({ id: 's2', semester: '2-1', rank_grade: 3 })], [], scoringRule({ semesters: ['1-1', '2-1'], year_weights: { 1: 0.2, 2: 0.8 } }));
    expect(r).toMatchObject({ status: 'ready', value: { total: 92 } });
  });
  test('반영 학년 자료가 없으면 비율을 임의 재분배하지 않음', () => expect(scoreUniversity([subject()], [], scoringRule({ semesters: ['1-1', '2-1'], year_weights: { 1: 0.2, 2: 0.8 } })).status).toBe('not_ready'));
  test('반영 교과와 학기, 공동교육과정 제외', () => {
    const r = scoreUniversity([subject(), subject({ id: 'x', semester: '3-2', rank_grade: 5 }), subject({ id: 'y', subject_group: '정보', rank_grade: 5 }), subject({ id: 'z', is_joint: true, rank_grade: null })], [], scoringRule({ joint_curriculum_policy: 'exclude' }));
    expect(r).toMatchObject({ status: 'ready', value: { total: 96, selected_ids: ['math'] } });
  });
  test('전체 상위 N과목', () => {
    const r = scoreUniversity([subject(), subject({ id: 'x', rank_grade: 1 }), subject({ id: 'y', rank_grade: 5 })], [], scoringRule({ selection: { mode: 'top_n_total', n: 1 } }));
    expect(r).toMatchObject({ status: 'ready', value: { total: 100, selected_ids: ['x'] } });
  });
  test('교과군별 상위 N과목', () => {
    const r = scoreUniversity([subject(), subject({ id: 'x', rank_grade: 1 }), subject({ id: 'y', subject_group: '국어', rank_grade: 3 })], [], scoringRule({ selection: { mode: 'top_n_per_group', n: 1 } }));
    expect(r).toMatchObject({ status: 'ready', value: { total: 95, selected_ids: ['x', 'y'] } });
  });
  test('성취도 병행 반영', () => expect(scoreUniversity([subject()], [], scoringRule({ achievement_blend: { mode: 'weighted', rank_ratio: 0.8 } }))).toMatchObject({ status: 'ready', value: { total: 96.8 } }));
  test('성취도 max 반영', () => expect(scoreUniversity([subject()], [], scoringRule({ achievement_blend: { mode: 'max' } }))).toMatchObject({ status: 'ready', value: { total: 100 } }));
  test('필수 성취도가 없으면 계산 중단', () => expect(scoreUniversity([subject({ achievement: undefined })], [], scoringRule({ achievement_blend: { mode: 'max' } })).status).toBe('not_ready'));
  test('미산출 성취도 환산', () => expect(scoreUniversity([subject({ type: '융합선택', subject_group: '사회', rank_grade: null, achievement: 'B' })], [], scoringRule({ no_rank_subject_policy: 'achievement_convert' }))).toMatchObject({ status: 'ready', value: { total: 95 } }));
  test('미산출 가산점 상한', () => {
    const r = scoreUniversity([subject(), subject({ id: 'bonus', type: '융합선택', subject_group: '사회', rank_grade: null })], [], scoringRule({ no_rank_subject_policy: 'bonus', bonus: { points: { A: 5 }, max: 2 } }));
    expect(r).toMatchObject({ status: 'ready', value: { total: 98, bonus: 2 } });
  });
  test('지각·조퇴·결과 합산 후 결석 환산, 질병은 제외', () => {
    const a = emptyAttendance(1); a.school_days = 190; a.absence.unexcused = 1; a.absence.illness = 10; a.tardy.unexcused = 2; a.early_leave.unexcused = 1;
    const r = scoreUniversity([subject()], [a], scoringRule({ grade_max_score: 90, max_score: 100,
      attendance_rule: { years: [1], max_score: 10, tardy_to_absence: 3, deduction_table: [{ absence_max: 1, points: 0 }, { absence_max: 3, points: 2 }, { absence_max: 366, points: 10 }] } }));
    expect(r).toMatchObject({ status: 'ready', value: { grade: 86.39999999999999, attendance: 8, total: 94.4, attendance_deduction: 2 } });
  });
  test('필요한 출결이 없으면 만점으로 처리하지 않음', () => expect(scoreUniversity([subject()], [], scoringRule({ grade_max_score: 90, attendance_rule: { years: [1], max_score: 10, tardy_to_absence: 3, deduction_table: [{ absence_max: 366, points: 0 }] } })).status).toBe('not_ready'));
  test('입력 오류 과목은 제외되고 trace에 남음', () => {
    const r = scoreUniversity([subject(), subject({ id: 'bad', credits: -1 })], [], scoringRule());
    expect(r).toMatchObject({ status: 'ready', value: { selected_ids: ['math'] } }); expect(r.trace.some(t => t.subject_id === 'bad' && t.detail.includes('제외'))).toBe(true);
  });
  test.each(['floor', 'ceil'] as const)('최종 %s 처리', mode => {
    const r = scoreUniversity([subject({ rank_grade: 1, credits: 1 }), subject({ id: 'b', rank_grade: 3, credits: 2 })], [], scoringRule({ rounding: { mode, digits: 1 } }));
    expect(r).toMatchObject({ status: 'ready', value: { total: mode === 'floor' ? 93.3 : 93.4 } });
  });
  test('음수 점수와 잘못된 만점 거부', () => expect(scoreUniversity([subject()], [], scoringRule({ grade_max_score: 200 })).status).toBe('invalid'));
});
