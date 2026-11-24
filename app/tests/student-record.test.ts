import { expect, test } from 'vitest';
import { axis, labelPositions, mockTrend, schoolTrend, semesterSentence, trendSentence } from '../src/domain/studentRecord';
import { sampleSchool, sampleMocks } from '../src/data/sample/teacher';

test('하늘 내신·모의고사 추이와 규칙 문장(v2 시안 문구)', () => {
  const s = schoolTrend(sampleSchool[0]);
  expect(s.columns).toEqual(['1-1', '1-2', '2-1', '2-2']);
  expect(s.series.map(x => x.name)).toEqual(['전 교과', '국어', '수학', '영어', '사회', '과학']);
  expect(s.series.find(x => x.name === '사회')!.values).toEqual([1.6, 2, null, 1]); // demo-dataset 과목군 × 학기
  expect(semesterSentence(s.series[0], s.columns)).toBe('1-1 1.7에서 2-2 1.2까지 네 학기 내내 올랐어요.');
  expect(trendSentence(s.series[0], s.columns, true)).toBe('2-2 평균 1.2, 지난 학기보다 0.1등급 올랐어요.');
  const m = mockTrend(sampleMocks);
  expect(trendSentence(m.series.find(x => x.name === '수학')!, m.columns, false)).toBe('10월 학평 수학 2등급, 6월 모평부터 같아요.');
  expect(axis(s.series, true)).toEqual([0.5, 1, 1.5, 2, 2.5]);
  expect(axis(m.series, false)).toEqual([1, 2, 3, 4, 5]);
});

test('이름표는 겹치면 18px 간격으로 묶어 비켜요', () => {
  const p = labelPositions([{ key: 'a', y: 50 }, { key: 'b', y: 50 }, { key: 'c', y: 100 }]);
  expect(p.b - p.a).toBe(18);
  expect(p.c - p.b).toBeGreaterThanOrEqual(18);
});
