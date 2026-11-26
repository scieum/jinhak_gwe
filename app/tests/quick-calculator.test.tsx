import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { QuickGradeCalculator } from '../src/components/QuickGradeCalculator';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const field = (label: string) => screen.getByRole('textbox', { name: label }) as HTMLInputElement;
test('1.00 distinguishes exact all-one grades from a rounded average and resets the calculation basis for other inputs', () => {
  render(<QuickGradeCalculator />);
  fireEvent.change(field('5등급제 평균'), { target: { value: '1.00' } });
  expect(field('낙관 시나리오').value).toBe('1.00');
  expect(field('보수 시나리오').value).toBe('1.00~1.55');
  expect((screen.getByRole('radio', { name: '모든 반영 과목이 1등급' }) as HTMLInputElement).checked).toBe(true);
  fireEvent.click(screen.getByRole('radio', { name: '반올림된 평균 1.00' }));
  expect(field('낙관 시나리오').value).toBe('1.00~1.02');
  expect(field('보수 시나리오').value).toBe('1.00~1.56');
  fireEvent.click(screen.getByRole('radio', { name: '모든 반영 과목이 1등급' }));
  fireEvent.change(field('5등급제 평균'), { target: { value: '1.17' } });
  expect(screen.queryByRole('radio')).toBeNull();
  expect(field('낙관 시나리오').value).toBe('1.41~1.44');
  fireEvent.change(field('5등급제 평균'), { target: { value: '1.001' } });
  expect(screen.queryByRole('radio')).toBeNull();
  expect(field('낙관 시나리오').value).not.toBe('1.00');
});
test('DB·AI·네트워크 없이 v0.5 두 시나리오를 즉시 계산한다', () => {
  const fetch = vi.fn(() => { throw new Error('network forbidden'); });
  vi.stubGlobal('fetch', fetch);
  render(<QuickGradeCalculator />);
  for (const [input, estimate, range] of [['1.17', '1.41~1.44', '1.83~1.86'], ['1.3', '1.73~1.77', '2.07~2.09'], ['1.5', '2.13~2.16', '2.41~2.43']]) {
    fireEvent.change(field('5등급제 평균'), { target: { value: input } });
    expect(field('낙관 시나리오').value).toBe(estimate);
    expect(field('보수 시나리오').value).toBe(range);
    expect(screen.getByRole('status').textContent).toContain(estimate);
  }
  expect(fetch).not.toHaveBeenCalled();
  expect(field('낙관 시나리오').readOnly).toBe(true);
  expect(field('보수 시나리오').readOnly).toBe(true);
  expect(document.body.textContent).not.toMatch(/부산|경기|유니브클래스|상위 누적 비율/);
});
test('잘못된 입력은 이전 결과를 숨기며 정상 입력으로 복구한다', () => {
  render(<QuickGradeCalculator />);
  for (const value of ['', '6', '0.9', 'abc', '1e0']) {
    fireEvent.change(field('5등급제 평균'), { target: { value } });
    expect(field('5등급제 평균').getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(field('낙관 시나리오').value).toBe('');
    expect(field('보수 시나리오').value).toBe('');
    expect(screen.queryByRole('img')).toBeNull();
  }
  fireEvent.change(field('5등급제 평균'), { target: { value: '1.30' } });
  expect(screen.queryByRole('alert')).toBeNull();
  expect(field('5등급제 평균').value).toBe('1.30');
  expect(field('낙관 시나리오').value).toBe('1.73~1.77');
});
test('빠른 선택·슬라이더와 지원 구간 밖 대표값 처리', () => {
  render(<QuickGradeCalculator />);
  fireEvent.click(within(screen.getByRole('group', { name: '5등급제 평균 빠른 선택' })).getByRole('button', { name: '1.5등급' }));
  expect(field('낙관 시나리오').value).toBe('2.13~2.16');
  for (const value of ['1', '5']) {
    fireEvent.change(screen.getByRole('slider', { name: '5등급제 평균 슬라이더' }), { target: { value } });
    expect(field('낙관 시나리오').value).not.toBe('');
    expect(field('보수 시나리오').value).not.toBe('');
    if (value === '5') expect(screen.getByRole('status').textContent).toContain('자료 지원 구간 밖');
    expect(document.querySelector('.grade-range-marker')).toBeNull();
  }
});
