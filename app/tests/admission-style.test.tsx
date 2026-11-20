import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, test } from 'vitest';
import { STYLE_PROFILES, STYLE_QUESTIONS, summarizeStyle, type StyleAnswer, type StyleAnswers } from '../src/domain/admissionStyle';
import { AdmissionStyle } from '../src/screens/AdmissionStyle';

const fill = (value: StyleAnswer): StyleAnswers => Object.fromEntries(STYLE_QUESTIONS.map(q => [q.id, value]));
afterEach(cleanup);
test('unknown answers are not scored as low preference and cannot produce a winner', () => {
  const result = summarizeStyle(fill(null));
  expect(result.kind).toBe('insufficient');
  expect(result.candidates).toHaveLength(0);
  expect(result.axes.every(a => a.mean === null)).toBe(true);
  const partial = fill(3); partial.q01 = null; partial.q06 = null;
  expect(summarizeStyle(partial).kind).toBe('insufficient');
});
test('uniform high answers remain mixed; uniform low answers do not recommend a route', () => {
  expect(summarizeStyle(fill(3)).candidates).toHaveLength(5);
  expect(summarizeStyle(fill(3)).kind).toBe('mixed');
  expect(summarizeStyle(fill(0)).kind).toBe('open');
  expect(summarizeStyle(fill(1)).candidates).toHaveLength(0);
});
test.each(STYLE_PROFILES)('$route is suggested from its own preparation answers with evidence', profile => {
  const answers = fill(0);
  STYLE_QUESTIONS.filter(q => q.axis === profile.id).forEach(q => { answers[q.id] = 3; });
  const result = summarizeStyle(answers);
  expect(result.kind).toBe('focused');
  expect(result.candidates.map(a => a.id)).toEqual([profile.id]);
  expect(result.candidates[0].evidence).toHaveLength(3);
});
test('near ties include both, and unanswered or malformed input cannot silently generate results', () => {
  const answers = fill(0);
  for (const q of STYLE_QUESTIONS) if (q.axis === 'record' || q.axis === 'explore') answers[q.id] = 3;
  answers.q02 = 2;
  expect(summarizeStyle(answers).candidates.map(p => p.id)).toEqual(['record', 'explore']);
  delete answers.q01;
  expect(() => summarizeStyle(answers)).toThrow();
  expect(() => summarizeStyle({ ...fill(0), q01: 99 } as unknown as StyleAnswers)).toThrow();
});
test('wizard requires selection, keeps prior answers and can restart after a neutral result', () => {
  render(<MemoryRouter><AdmissionStyle /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: /나의 전형 성향 알아보기/ }));
  expect((screen.getByRole('button', { name: /다음 문항/ }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(screen.getByRole('radio', { name: '자주 그래요' }));
  fireEvent.click(screen.getByRole('button', { name: /다음 문항/ }));
  fireEvent.click(screen.getByRole('button', { name: '이전 문항' }));
  expect((screen.getByRole('radio', { name: '자주 그래요' }) as HTMLInputElement).checked).toBe(true);
  for (let i = 0; i < STYLE_QUESTIONS.length; i++) {
    fireEvent.click(screen.getByRole('radio', { name: '아직 경험이 없거나 잘 모르겠어요' }));
    fireEvent.click(screen.getByRole('button', { name: i === 14 ? /내 성향 보기/ : /다음 문항/ }));
  }
  expect(screen.getByRole('heading', { name: '경험을 더 알아가는 탐색가' })).toBeTruthy();
  expect(screen.getByRole('img', { name: /새싹을 돌보며/ }).getAttribute('src')).toContain('gilkong-insufficient-v1.png');
  expect(screen.queryByText('탐색 추천')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: '처음부터 다시' }));
  fireEvent.click(screen.getByRole('button', { name: /나의 전형 성향 알아보기/ }));
  expect((screen.getByRole('button', { name: /다음 문항/ }) as HTMLButtonElement).disabled).toBe(true);
});

test.each([...STYLE_PROFILES.map(p => p.id), 'mixed', 'open'] as const)('%s responses display their matching mascot', kind => {
  render(<MemoryRouter><AdmissionStyle /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: /나의 전형 성향 알아보기/ }));
  for (const [i, question] of STYLE_QUESTIONS.entries()) {
    const high = kind === 'mixed' || question.axis === kind;
    fireEvent.click(screen.getByRole('radio', { name: high ? '매우 그래요' : '거의 그렇지 않아요' }));
    fireEvent.click(screen.getByRole('button', { name: i === 14 ? /내 성향 보기/ : /다음 문항/ }));
  }
  expect(screen.getByRole('img').getAttribute('src')).toContain(`gilkong-${kind}-v1.png`);
});
