import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test } from 'vitest';
import { validateScoringRule, scoreUniversity } from '../src/engine/scoring';
import { parseRuleRelease, runTest, newTest, type RuleDraft } from '../src/domain/ruleEditor';

// work/_data/scoring-rules/build.py가 만든 AI 초안(규칙 관리 '규칙 기록 합치기'용). 파이썬 검사와 앱 검사가 어긋나지 않는지 봐요.
const file = resolve(__dirname, '../../work/_data/scoring-rules/rule-drafts.json');

test.runIf(existsSync(file))('AI 초안은 앱 형식 검사를 통과하고, 검수 전이라 계산·배포되지 않아요(NEVER-1)', () => {
  const v = JSON.parse(readFileSync(file, 'utf-8')) as { format: string; version: number; drafts: RuleDraft[] };
  expect(v.format).toBe('jinhak-navi-rule-drafts');
  expect(new Set(v.drafts.map(d => d.id)).size).toBe(v.drafts.length);
  for (const d of v.drafts) {
    expect(validateScoringRule(d.rule), `${d.rule.university} ${d.rule.program}`).toEqual([]);
    expect(d).toMatchObject({ status: '작성 중', ai_draft: true, tests: [], reviewer: null });
    expect(d.rule.review_status).toBe('draft');
    expect(d.rule.source).toMatch(/^https:\/\//);
    expect(scoreUniversity([], [], d.rule)).toMatchObject({ status: 'not_ready', reason: '환산 규칙 준비 중' });
  }
  expect(parseRuleRelease({ format: 'jinhak-navi-scoring-rules', version: 1, rules: v.drafts.map(d => d.rule) })).toEqual([]);
});

test.runIf(existsSync(file))('검수자가 테스트를 만들면 모든 초안이 가상 학생(전 학년 2등급·A·출결 0)으로 점수가 나와요', () => {
  const v = JSON.parse(readFileSync(file, 'utf-8')) as { drafts: RuleDraft[] };
  const stuck = v.drafts.map(d => ({ d, r: runTest(d.rule, newTest(0)) })).filter(x => x.r.actual === null || !Number.isFinite(x.r.actual) || x.r.actual <= 0)
    .map(x => `${x.d.rule.university} ${x.d.rule.program}: ${x.r.reason}`);
  expect(stuck).toEqual([]);
});
