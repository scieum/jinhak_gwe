import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { QuickGradeCalculator } from '../src/components/QuickGradeCalculator';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const field = (label: string) => screen.getByRole('textbox', { name: label }) as HTMLInputElement;
test('DB·AI·네트워크 없이 v0.4 대표값과 범위를 즉시 계산한다', () => {
  const fetch = vi.fn(() => { throw new Error('network forbidden'); });
  vi.stubGlobal('fetch', fetch);
  render(<QuickGradeCalculator />);
  for (const [input, estimate, range] of [['1.17', '1.63', '1.38~2.01'], ['1.3', '1.91', '1.70~2.24'], ['1.5', '2.29', '2.10~2.58']]) {
    fireEvent.change(field('5등급제 평균'), { target: { value: input } });
    expect(field('9등급제 참고 대표값').value).toBe(estimate);
    expect(field('9등급제 참고 범위').value).toBe(range);
    expect(screen.getByRole('status').textContent).toContain(estimate);
  }
  expect(fetch).not.toHaveBeenCalled();
  expect(field('9등급제 참고 대표값').readOnly).toBe(true);
  expect(field('9등급제 참고 범위').readOnly).toBe(true);
  expect(document.body.textContent).not.toMatch(/부산|경기|유니브클래스|상위 누적 비율/);
});
test('잘못된 입력은 이전 결과를 숨기며 정상 입력으로 복구한다', () => {
  render(<QuickGradeCalculator />);
  for (const value of ['', '6', '0.9', 'abc', '1e0']) {
    fireEvent.change(field('5등급제 평균'), { target: { value } });
    expect(field('5등급제 평균').getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(field('9등급제 참고 대표값').value).toBe('');
    expect(field('9등급제 참고 범위').value).toBe('');
    expect(screen.queryByRole('img')).toBeNull();
  }
  fireEvent.change(field('5등급제 평균'), { target: { value: '1.30' } });
  expect(screen.queryByRole('alert')).toBeNull();
  expect(field('5등급제 평균').value).toBe('1.30');
  expect(field('9등급제 참고 대표값').value).toBe('1.91');
});
test('빠른 선택·슬라이더와 지원 구간 밖 대표값 처리', () => {
  render(<QuickGradeCalculator />);
  fireEvent.click(within(screen.getByRole('group', { name: '5등급제 평균 빠른 선택' })).getByRole('button', { name: '1.5등급' }));
  expect(field('9등급제 참고 대표값').value).toBe('2.29');
  for (const value of ['1', '5']) {
    fireEvent.change(screen.getByRole('slider', { name: '5등급제 평균 슬라이더' }), { target: { value } });
    expect(field('9등급제 참고 대표값').value).toBe('');
    expect(field('9등급제 참고 범위').value).not.toBe('');
    expect(screen.getByRole('status').textContent).toContain('미산출');
    expect(document.querySelector('.grade-range-marker')).toBeNull();
  }
});
