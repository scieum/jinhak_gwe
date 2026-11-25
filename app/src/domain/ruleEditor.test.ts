import { expect, test } from 'vitest';
import { sampleRuleDrafts } from '../data/sample/admin';
import { releaseRules, runTest } from './ruleEditor';

test('샘플 규칙(검수 완료 포함)은 배포 파일에 들어가지 않아요(NEVER-1)', () => {
  expect(sampleRuleDrafts.some(d => d.status === '검수 완료')).toBe(true);
  expect(releaseRules(sampleRuleDrafts).rules).toEqual([]);
  const real = { ...sampleRuleDrafts.find(d => d.status === '검수 완료')! };
  delete (real as { sample?: true }).sample;
  expect(releaseRules([real]).rules).toEqual([]); // 표식만 떼도 sample- id라 걸러요
  expect(releaseRules([{ ...real, id: 'r-1' }]).rules).toHaveLength(1); // 실제 규칙(검수 완료)은 들어가요
});

test('샘플 테스트 케이스는 모두 통과하고 시안 기대값(98.32 · 91.20 · 97.70)과 같아요', () => {
  const d = sampleRuleDrafts[0];
  expect(d.tests.map(t => t.expected)).toEqual([98.32, 91.2, 97.7]);
  expect(d.tests.every(t => runTest(d.rule, t).ok)).toBe(true);
});
