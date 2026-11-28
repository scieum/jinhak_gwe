import { describe, expect, test } from 'vitest';
import release from '../public/data/scoring-rules.json';
import { parseRuleRelease } from '../src/domain/ruleEditor';
import { scoreUniversity } from '../src/engine/scoring';
import { emptyAttendance } from '../src/domain/student';
import { scoringProgramFor } from '../src/domain/interestScoring';
import { withReleasedRules } from '../src/screens/Results';
import { subject } from './fixtures';

const rules = parseRuleRelease(release);
const attendance = [1, 2, 3].map(y => ({ ...emptyAttendance(y as 1 | 2 | 3), school_days: 190 }));
test('배포 파일은 원문 대조한 12개 규칙이며 모두 형식 검사를 통과한다', () => {
  expect(rules).toHaveLength(12);
  expect(rules).toHaveLength(release.rules.length);
  expect(rules.every(r => r.publication?.checked_by.startsWith('Codex') && r.publication.source_sha256.length === 64)).toBe(true);
});
for (const rule of rules) describe(`${rule.university} ${rule.program}`, () => {
  // Expected values are calculated independently from the source tables, not obtained from this engine.
  const kangwon = rule.university.includes('강원'), kongju = rule.university.includes('공주');
  test.each([
    [1, 'A', kangwon ? 1000 : kongju ? 1000 : 80],
    [5, 'E', kangwon ? 500 : kongju ? 600 : 0],
    [2, 'B', kangwon ? 951 : kongju ? 900 : 78.4],
  ] as const)('원문 점수표 %s등급·%s → %s', (rank_grade, achievement, expected) => {
    expect(scoreUniversity([subject({ rank_grade, achievement })], attendance, rule, '화학과'))
      .toMatchObject({ status: 'ready', value: { total: expected } });
  });
  test('공동교육과정의 미확인 반영 방법을 임의로 채우지 않는다', () => {
    expect(scoreUniversity([subject({ is_joint: true, rank_grade: null })], attendance, rule, '화학과').status).toBe('not_ready');
  });
});
test('강원 춘천: 두 점수의 학점 가중평균 합, 출결 없는 교과 부분만 계산', () => {
  const rule = rules.find(r => r.university.includes('강원'))!;
  expect(scoreUniversity([subject({ rank_grade: 1, credits: 1 }), subject({ id: 'eng', subject_group: '영어', rank_grade: 3, achievement: 'B', credits: 3 })], [], rule, '약학과'))
    .toMatchObject({ status: 'ready', value: { total: 933.25, max: 1000 } });
  expect(rule.attendance_rule).toBeUndefined();
  expect(rule.publication?.scope).toBe('grade_component');
  const arts = scoreUniversity([subject({ rank_grade: 5 }), subject({ id: 'eng', subject_group: '영어', rank_grade: 2, achievement: 'B' })], [], rule, '음악학과');
  expect(arts).toMatchObject({ status: 'ready', value: { total: 951, selected_ids: ['eng'] } });
});
test('공주: 국내 5등급제는 90학점 미만 감산 없음; 융합선택 성취도와 중간 반올림', () => {
  const rule = rules.find(r => r.university.includes('공주'))!;
  expect(scoreUniversity([subject({ rank_grade: 1, credits: 1 }), subject({ id: 'sci', subject_group: '과학', type: '융합선택', rank_grade: null, achievement: 'B', credits: 2 })], attendance, rule, '화학과'))
    .toMatchObject({ status: 'ready', value: { total: 933.5 } });
  expect(scoreUniversity([subject()], [], rule, '화학과').status).toBe('not_ready');
  expect(scoreUniversity([subject()], attendance, rule, '체육교육과').status).toBe('not_ready');
  const absence = attendance.map(a => ({ ...a, absence: { ...a.absence, unexcused: a.year === 1 ? 4 : 0 } }));
  expect(scoreUniversity([subject()], absence, rule, '화학과')).toMatchObject({ status: 'ready', value: { total: 897 } });
});
test('부산: 중간 평균도 4자리 버림한 뒤 80점 척도와 최종 버림 적용', () => {
  const rule = rules.find(r => r.university.includes('부산'))!;
  expect(scoreUniversity([subject({ rank_grade: 1, credits: 1 }), subject({ id: 'eng', rank_grade: 3, credits: 2 })], [], rule))
    .toMatchObject({ status: 'ready', value: { total: 77.3332, max: 80 } });
});
test('강원 전형 변경은 원문에 명시된 이전 이름만 연결하고 다른 캠퍼스는 차단', () => {
  const all = withReleasedRules([], rules);
  const target = { university: '강원대학교(춘천)', program: '지역교과전형', department: '약학과' };
  expect(scoringProgramFor(target, all, 2028).program?.rule?.program).toBe('학생부교과(강원인재전형)');
  expect(scoringProgramFor({ ...target, university: '강원대학교(삼척)' }, all, 2028).program).toBeNull();
});
