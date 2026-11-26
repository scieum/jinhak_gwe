import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test } from 'vitest';
import { referenceConversion, referenceModelRelease } from '../src/domain/referenceConversion';
import { fiveToNineFor } from '../src/domain/results';
import { subject } from './fixtures';
import { formatScenarioRange } from '../src/engine/scenarioReference';

test('only actual all-one subject records qualify, not an average displayed as 1.00', () => {
  const exact = fiveToNineFor([subject({ rank_grade: 1 }), subject({ id: 'b', rank_grade: 1, credits: 7 })], '전 교과');
  expect(exact.numericModel?.inputBasis).toBe('exact_all_one');
  expect(formatScenarioRange(exact.numericModel!.scenarios.optimistic.range9)).toBe('1.00');
  expect(formatScenarioRange(exact.numericModel!.scenarios.conservative.range9)).toBe('1.00~1.55');
  const near = fiveToNineFor([...Array.from({ length: 10 }, (_, i) => subject({ id: String(i), credits: 30, rank_grade: 1 })),
    subject({ id: 'two', credits: 1, rank_grade: 2 })], '전 교과');
  expect(near.g5!.toFixed(2)).toBe('1.00');
  expect(near.numericModel?.inputBasis).toBe('rounded_average');
  expect(referenceConversion('1.001', 'exact_all_one')).toBeNull();
  expect(referenceConversion('1.00')?.inputBasis).toBe('rounded_average');
});

test('배포 계수는 확정한 v0.5 연구 산출물과 동일하고 실증 검증 상태를 바꾸지 않는다', () => {
  expect(readFileSync(resolve('src/data/scenario-model.v05.json'), 'utf8')).toBe(
    readFileSync(resolve('../work/_research/five-to-nine-2026-11-26/trained-scenario-model/model.json'), 'utf8'));
  expect(referenceModelRelease).toMatchObject({ enabled: true, empiricallyValidated: false });
});
test('저장 성적의 학점 가중평균과 간편 계산기가 같은 모델을 사용한다', () => {
  const grades = [subject({ credits: 7, rank_grade: 1 }), subject({ id: 'eng', subject_group: '영어', credits: 3, rank_grade: 2 })];
  const r = fiveToNineFor(grades, '전 교과');
  expect(r.g5).toBe(1.3);
  expect(r.representative).toBeNull();
  expect(r.numericModel?.scenarios.optimistic.range9?.[0]).toBeCloseTo(1.735, 9);
  expect(r.numericModel).toEqual(referenceConversion('1.3'));
  expect(r.basisNotes.join(' ')).toContain('입력은 1개 학기');
  expect(r.trace.map(t => t.label + t.value).join(' ')).not.toMatch(/부산|경기|유니브클래스/);
});
test('교과 선택·수강자수·유효성에 따라 과목을 제외하고 반올림 전 평균을 넣는다', () => {
  const r = fiveToNineFor([
    subject({ credits: 2, rank_grade: 1 }), subject({ id: 'b', credits: 1, rank_grade: 2 }),
    subject({ id: 'small', enrolled_count: 5, rank_grade: 5 }),
    subject({ id: 'invalid', credits: 0, rank_grade: 5 }),
    subject({ id: 'soc', subject_group: '사회', rank_grade: 5 }),
  ], '국수영과');
  expect(r.g5).toBe(4 / 3);
  expect(r.stats).toMatchObject({ rankedCount: 2, excludedCount: 1 });
  expect(r.numericModel).toEqual(referenceConversion(4 / 3));
});
test('빈 성적과 지원 구간 끝에서 숫자를 만들어내지 않는다', () => {
  expect(fiveToNineFor([], '전 교과')).toMatchObject({ g5: null, representative: null, min: null, max: null });
  for (const rank_grade of [1, 5]) expect(fiveToNineFor([subject({ rank_grade })], '전 교과').representative).toBeNull();
  for (const invalid of ['', ' ', 'NaN', '1e0', -1, NaN, Infinity, 5.01]) expect(referenceConversion(invalid)).toBeNull();
});
