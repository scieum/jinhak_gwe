import { describe, expect, test } from 'vitest';
import { scoreUniversity, validateScoringRule, type AdvancedRule } from '../src/engine/scoring';
import { emptyAttendance } from '../src/domain/student';
import { scoringRule, subject } from './fixtures';

// 등급 점수(가상): 1=100 2=96 3=90 4=80 5=60, 성취도 A=100 B=95 C=90 D=80 E=60
const rule = (advanced: AdvancedRule, patch = {}) => scoringRule({ advanced, ...patch });
const total = (r: ReturnType<typeof scoreUniversity>) => r.status === 'ready' ? r.value.total : r.reason;

describe('추가 규칙(엔진 확장)', () => {
  test('과목 묶음: 묶음마다 상위 N, 앞 묶음에서 고른 과목은 다시 안 골라요', () => {
    const grades = [subject({ id: 'k1', subject_group: '국어', rank_grade: 1 }), subject({ id: 'k3', subject_group: '국어', rank_grade: 3 }), subject({ id: 'm2', rank_grade: 2 }),
      subject({ id: 's5', subject_group: '사회', rank_grade: 5 }), subject({ id: 'c1', subject_group: '과학', rank_grade: 1 })];
    const r = scoreUniversity(grades, [], rule({ buckets: [{ groups: ['국어', '수학'], n: 1 }, { groups: ['사회', '과학'], n: 1 }] }));
    expect(r).toMatchObject({ status: 'ready', value: { total: 100, selected_ids: ['k1', 'c1'] } });
  });
  test('교과별 비율: 교과 평균에 비율을 곱해 더해요', () => {
    const grades = [subject({ id: 'k1', subject_group: '국어', rank_grade: 1 }), subject({ id: 'm3', rank_grade: 3 })];
    expect(total(scoreUniversity(grades, [], rule({ group_weights: { 국어: 0.25, 수학: 0.75 } })))).toBe(92.5);
    expect(total(scoreUniversity([grades[0]], [], rule({ group_weights: { 국어: 0.25, 수학: 0.75 } })))).toBe('수학 반영 과목이 필요해요.');
  });
  test('상위 K개 교과의 전 과목', () => {
    const r = scoreUniversity([subject({ id: 'k3', subject_group: '국어', rank_grade: 3 }), subject({ id: 'm1', rank_grade: 1 })], [], rule({ top_groups: 1 }));
    expect(r).toMatchObject({ status: 'ready', value: { total: 100, selected_ids: ['m1'] } });
  });
  test('과목 유형 규칙: 사회·과학 융합선택은 성취도로 상위 1과목만, 진로선택은 석차등급·성취도 중 높은 값', () => {
    const career = (id: string, achievement: 'B' | 'E') => subject({ id, type: '융합선택', subject_group: '사회', rank_grade: null, achievement });
    expect(total(scoreUniversity([subject(), career('b', 'B'), career('e', 'E')], [], rule({ type_rules: [{ types: ['융합선택'], use: 'achievement', limit: 1 }] })))).toBe(95.5);
    expect(total(scoreUniversity([subject({ type: '진로선택', rank_grade: 3, achievement: 'A' })], [], rule({ type_rules: [{ types: ['진로선택'], use: 'max' }] })))).toBe(100);
    expect(total(scoreUniversity([subject(), career('b', 'B')], [], rule({ type_rules: [{ types: ['융합선택'], use: 'exclude' }] }, { no_rank_subject_policy: 'achievement_convert' })))).toBe(96);
  });
  test('평균등급을 먼저 내고 표에서 점수를 찾아요', () => {
    const t = { digits: 1, mode: 'floor' as const, steps: [{ upto: 1, score: 300 }, { upto: 1.5, score: 290 }, { upto: 5, score: 200 }] };
    const r = scoreUniversity([subject({ id: 'a', rank_grade: 1 }), subject({ id: 'b', rank_grade: 2 })], [], rule({ average_table: t }, { grade_max_score: 300, max_score: 300 }));
    expect(total(r)).toBe(290);
  });
  test('이수학점 조정: 배율 · 부족 감산 · 학점당 가산', () => {
    const two = [subject({ id: 'a' }), subject({ id: 'b' })]; // 2등급 두 과목 = 96, 이수학점 8
    expect(total(scoreUniversity(two, [], rule({ credits: { tiers: [{ min: 8, factor: 1.1 }], cap: 110 } })))).toBe(105.6);
    expect(total(scoreUniversity(two, [], rule({ credits: { shortfall: { below: 10, base: 0.96, per_credit: 0.002 } } })))).toBe(91.78);
    expect(total(scoreUniversity(two, [], rule({ credits: { per_credit_bonus: 0.5 } })))).toBe(100); // 96 + 4, 교과 만점에서 멈춰요
  });
  test('출결: 결석 1일당 감점 · 개근 가산(총점 만점까지)', () => {
    const att = (absent: number) => { const a = emptyAttendance(1); a.school_days = 190; a.absence.unexcused = absent; return [a]; };
    const base = { grade_max_score: 90, max_score: 100, attendance_rule: { years: [1], tardy_to_absence: 3, max_score: 10, deduction_table: [] } };
    expect(total(scoreUniversity([subject()], att(2), rule({ attendance: { per_day: 1 } }, base)))).toBe(94.4);
    expect(total(scoreUniversity([subject()], att(0), rule({ attendance: { per_day: 1, perfect_bonus: { years: [1], points: 5 } } }, base)))).toBe(100);
  });
  test('계열별 규칙: 학과로 계열을 고르고, 학과를 모르면 계산하지 않아요', () => {
    const grades = [subject({ id: 'k1', subject_group: '국어', rank_grade: 1 }), subject({ id: 'm3', rank_grade: 3 })];
    const r = rule({ tracks: [{ name: '인문', units: ['국문'], subject_groups: ['국어'] }, { name: '자연', units: ['*'], subject_groups: ['수학'] }] });
    expect(total(scoreUniversity(grades, [], r, '국어국문학과'))).toBe(100);
    expect(total(scoreUniversity(grades, [], r, '물리학과'))).toBe(90);
    expect(scoreUniversity(grades, [], r)).toMatchObject({ status: 'not_ready', reason: '학과를 고르면 계열에 맞춰 계산해요.' });
  });
  test('추가 규칙 형식 검사', () => {
    expect(validateScoringRule(rule({ group_weights: { 국어: 0.5, 수학: 0.4 } }))).toContain('교과별 비율은 반영 교과(또는 묶음 이름)에 합계 1로 지정해 주세요.');
    expect(validateScoringRule(rule({ buckets: [{ groups: [], n: 1 }] }))).toContain('과목 묶음을 확인해 주세요.');
    expect(validateScoringRule(rule({ attendance: { per_day: 1 } }))).toContain('출결 추가 규칙을 확인해 주세요.');
    expect(validateScoringRule(rule({ type_rules: [{ types: ['진로선택'], use: 'max' }] }))).toEqual([]);
  });
  test('교과별 배율은 학점 가중 안에 곱해요', () => {
    const grades = [subject({ id: 'k1', subject_group: '국어', rank_grade: 1 }), subject({ id: 'm3', rank_grade: 3 })];
    expect(total(scoreUniversity(grades, [], rule({ subject_weights: { 수학: 1.5 } })))).toBe(94);
  });
  test('묶음 과목이 모자라면 지정 등급으로 채워요', () => {
    expect(total(scoreUniversity([subject({ id: 'k1', subject_group: '국어', rank_grade: 1 })], [], rule({ buckets: [{ groups: ['국어'], n: 2, fill: { grade: 5, credits: 4 } }] })))).toBe(80);
  });
  test('평균 점수를 중간에 잘라요', () => {
    const grades = [subject({ id: 'a', rank_grade: 1 }), subject({ id: 'b' }), subject({ id: 'c' })]; // 평균 97.33
    expect(total(scoreUniversity(grades, [], rule({ mean_rounding: { digits: 0, mode: 'floor' } })))).toBe(97);
  });
  test('이수학점: 총점에 배율 · 여러 단계 가산 · 석차등급 과목만 세기', () => {
    const a = emptyAttendance(1); a.school_days = 190;
    const att = { grade_max_score: 90, max_score: 100, attendance_rule: { years: [1], tardy_to_absence: 3, max_score: 10, deduction_table: [{ absence_max: 365, points: 0 }] } };
    expect(total(scoreUniversity([subject()], [a], rule({ credits: { tiers: [{ min: 0, factor: 0.9 }], apply_to: 'total' } }, att)))).toBe(86.76);
    const two = [subject({ id: 'a' }), subject({ id: 'b' })];
    expect(total(scoreUniversity(two, [], rule({ credits: { bonus_tiers: [{ min: 4, points: 1 }, { min: 8, points: 3 }], cap: 110 } })))).toBe(99);
    const mixed = [subject(), subject({ id: 'f', type: '융합선택', subject_group: '사회', rank_grade: null })];
    expect(total(scoreUniversity(mixed, [], rule({ credits: { bonus_at: { min: 8, points: 3 }, count: 'ranked', cap: 110 } })))).toBe(96);
    expect(total(scoreUniversity(mixed, [], rule({ credits: { bonus_at: { min: 8, points: 3 }, cap: 110 } })))).toBe(99);
  });
  test('유형 규칙 limit 밖 과목을 석차등급으로 남길 수 있어요', () => {
    const career = (id: string) => subject({ id, type: '진로선택', rank_grade: 3, achievement: 'A' });
    expect(total(scoreUniversity([career('a'), career('b')], [], rule({ type_rules: [{ types: ['진로선택'], use: 'max', limit: 1, beyond: 'rank' }] })))).toBe(95);
    expect(total(scoreUniversity([career('a'), career('b')], [], rule({ type_rules: [{ types: ['진로선택'], use: 'max', limit: 1 }] })))).toBe(100);
  });
  test('계열별 등급 점수표 · 교과 바꿔 읽기 · 총점에서 출결 감점', () => {
    const r = rule({ tracks: [{ name: '간호', units: ['간호'], rank_grade_points: { 1: 100, 2: 50, 3: 40, 4: 30, 5: 0 } }, { name: '일반', units: ['*'] }] });
    expect(total(scoreUniversity([subject()], [], r, '간호학과'))).toBe(50);
    expect(total(scoreUniversity([subject()], [], r, '경영학과'))).toBe(96);
    expect(total(scoreUniversity([subject({ subject_group: '한국사', rank_grade: 1 })], [], rule({ group_alias: { 한국사: '사회' } }, { subject_groups: ['사회'] })))).toBe(100);
    const a = emptyAttendance(1); a.school_days = 190; a.absence.unexcused = 3;
    const att = { attendance_rule: { years: [1], tardy_to_absence: 3, max_score: 0, deduction_table: [{ absence_max: 0, points: 0 }, { absence_max: 5, points: 20 }] } };
    expect(total(scoreUniversity([subject()], [a], rule({ attendance: { from_total: true } }, att)))).toBe(76);
  });
  test('추가 규칙이 없으면 예전 계산 그대로예요', () => {
    expect(total(scoreUniversity([subject()], [], scoringRule()))).toBe(96);
  });
});

describe('계열별 규칙 검수 테스트', async () => {
  const { runTest, newTest, blockers, newRuleDraft, testTrack } = await import('../src/domain/ruleEditor');
  // 인문은 국어만(가상 학생 전 과목 같은 등급이라) 등급표로 차이를 내요: 인문 2등급 = 50점, 자연 2등급 = 96점
  const tracked = scoringRule({ attendance_rule: undefined, advanced: { tracks: [
    { name: '인문', units: ['국문'], subject_groups: ['국어'], rank_grade_points: { 1: 100, 2: 50, 3: 40, 4: 30, 5: 0 } },
    { name: '자연', units: ['*'], subject_groups: ['수학'] }] } });
  test('테스트마다 계열을 골라 그 계열로 계산하고, 안 고르면 첫 계열이에요', () => {
    expect(runTest(tracked, { ...newTest(0), expected: 50 }).ok).toBe(true);
    expect(runTest(tracked, { ...newTest(0), track: '자연', expected: 96 }).ok).toBe(true);
    expect(testTrack(tracked, { track: '없는 계열' })).toBe('인문');
  });
  test('계열마다 통과 테스트가 있어야 검수를 요청할 수 있어요', () => {
    const base = newRuleDraft('작성자');
    const d = { ...base, rule: { ...tracked, id: base.rule.id, source: 'https://example.test/plan.pdf' } };
    const pass = (track: string, expected: number) => ({ ...newTest(0), id: track + expected, track, expected });
    expect(blockers({ ...d, tests: [pass('인문', 50), pass('인문', 50), pass('인문', 50)] })).toContain('계열별 테스트가 필요해요: 자연');
    expect(blockers({ ...d, tests: [pass('인문', 50), pass('인문', 50), pass('자연', 96)] })).toEqual([]);
  });
});

describe('추가 규칙 3차', () => {
  test('광역계처럼 두 계열 중 높은 총점으로 계산해요', () => {
    const grades = [subject({ id: 'k1', subject_group: '국어', rank_grade: 1 }), subject({ id: 'm3', rank_grade: 3 })];
    const r = rule({ tracks: [{ name: 'A', units: ['인문'], subject_groups: ['국어'] }, { name: 'B', units: ['공학'], subject_groups: ['수학'] }, { name: '광역', units: ['광역'], best_of: ['A', 'B'] }] });
    expect(total(scoreUniversity(grades, [], r, '광역융합학부'))).toBe(100);
    expect(total(scoreUniversity(grades, [], r, '기계공학과'))).toBe(90);
    expect(validateScoringRule(rule({ tracks: [{ name: '광역', units: ['*'], best_of: ['없음'] }] }))).toContain('계열별 규칙을 확인해 주세요.');
  });
  test('성취도 가산은 성취도 점수 평균을 더하고 상한에서 멈춰요', () => {
    const grades = [subject({ id: 'a', achievement: 'A' }), subject({ id: 'b', achievement: 'C' })]; // 2등급 = 96
    expect(total(scoreUniversity(grades, [], rule({ achievement_bonus: { points: { A: 6, B: 4, C: 2, D: 1, E: 0 }, max: 3 }, credits: { cap: 200 } }, { grade_max_score: 100 })))).toBe(99);
  });
  test('반영 학점이 최소보다 적으면 계산하지 않고 이유를 알려요', () => {
    expect(scoreUniversity([subject()], [], rule({ credits: { minimum: 60 } }))).toMatchObject({ status: 'not_ready', reason: expect.stringContaining('60학점') });
  });
  test('출결 종류별 1회당 감점, 결석은 2회까지 감점 없음', () => {
    const a = emptyAttendance(1); a.school_days = 190; a.absence.unexcused = 3; a.tardy.unexcused = 2; a.early_leave.unexcused = 1;
    const att = { grade_max_score: 90, max_score: 100, attendance_rule: { years: [1], tardy_to_absence: 3, max_score: 10, deduction_table: [] } };
    // 결석 (3−2)×0.5 + 지각 2×0.1 + 조퇴 1×0.3 = 1.0 → 출결 9, 교과 86.4
    expect(total(scoreUniversity([subject()], [a], rule({ attendance: { per_kind: { absence: 0.5, tardy: 0.1, early_leave: 0.3, class_absence: 0.2, free_absences: 2 } } }, att)))).toBe(95.4);
  });
});
