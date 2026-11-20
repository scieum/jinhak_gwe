import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { QuickGradeCalculator } from '../src/components/QuickGradeCalculator';

afterEach(cleanup);
const field = (label: string) => screen.getByRole('textbox', { name: label }) as HTMLInputElement;
test('학생 DB 없이 즉시 계산하고 세 입력이 서로 연결됨', () => {
  render(<QuickGradeCalculator />);
  expect(field('9등급제 평균').value).toBe('3.34');
  fireEvent.change(field('5등급제 평균'), { target: { value: '2.50' } });
  expect(field('5등급제 평균').value).toBe('2.50');
  expect(field('상위 누적 비율').value).toBe('36.00');
  expect(field('9등급제 평균').value).toBe('4.24');
  fireEvent.change(field('9등급제 평균'), { target: { value: '5' } });
  expect(field('5등급제 평균').value).toBe('3.00');
  fireEvent.change(field('상위 누적 비율'), { target: { value: '22' } });
  expect(field('5등급제 평균').value).toBe('2.00');
  expect(screen.getByRole('status').textContent).toContain('3.34');
});
test('빈 값·범위 초과·문자 입력 시 이전 결과를 숨기고 유효한 입력으로 복구', () => {
  render(<QuickGradeCalculator />);
  for (const value of ['', '6', 'abc']) {
    fireEvent.change(field('5등급제 평균'), { target: { value } });
    expect(field('5등급제 평균').getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(field('9등급제 평균').value).toBe('');
    expect(screen.getByRole('status').textContent).not.toContain('3.34');
  }
  fireEvent.change(field('5등급제 평균'), { target: { value: '1.0' } });
  expect(screen.queryByRole('alert')).toBeNull();
  expect(field('9등급제 평균').value).toBe('1.55');
});
test('빠른 선택과 슬라이더도 바로 계산하며 끝 구간을 설명', () => {
  render(<QuickGradeCalculator />);
  fireEvent.click(within(screen.getByRole('group', { name: '5등급제 평균 빠른 선택' })).getByRole('button', { name: '3등급' }));
  expect(field('9등급제 평균').value).toBe('5.00');
  fireEvent.change(screen.getByRole('slider', { name: '상위 누적 비율 슬라이더' }), { target: { value: '100' } });
  expect(field('5등급제 평균').value).toBe('5.00');
  expect(field('9등급제 평균').value).toBe('9.00');
  expect(screen.getByText(/원래 누적 비율을 되돌릴/)).toBeTruthy();
});
