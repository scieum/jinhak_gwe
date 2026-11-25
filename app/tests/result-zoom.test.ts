import { expect, test } from 'vitest';
import { axisMinorTicks, axisTicks, zoomRange } from '../src/domain/resultBrowse';

test('입결 그래프 휠 확대·축소: 커서 자리를 고정하고 폭 0.4~8 · 1~9 안에 머물러요', () => {
  expect(zoomRange({ min: 1.5, max: 3.5 }, 2.5, 1 / 1.2)).toEqual({ min: 1.667, max: 3.333 });
  expect(zoomRange({ min: 1, max: 1.4 }, 1.2, 0.5)).toEqual({ min: 1, max: 1.4 });
  expect(zoomRange({ min: 1, max: 9 }, 5, 1.2)).toEqual({ min: 1, max: 9 });
  expect(zoomRange({ min: 7, max: 9 }, 8.9, 1.5)).toEqual({ min: 6, max: 9 });
});
test('눈금은 기본 폭(2)에서 0.5, 좁히면 0.2 · 0.1', () => {
  expect(axisTicks({ min: 1.5, max: 3.5 })).toEqual([1.5, 2, 2.5, 3, 3.5]);
  expect(axisTicks({ min: 1.667, max: 3.333 })).toEqual([1.8, 2, 2.2, 2.4, 2.6, 2.8, 3, 3.2]);
  expect(axisTicks({ min: 2, max: 2.5 })).toEqual([2, 2.1, 2.2, 2.3, 2.4, 2.5]);
});

test('보조 점선은 눈금 사이만, 확대할수록 촘촘해요', () => {
  expect(axisMinorTicks({ min: 1, max: 3 })).toEqual([1.1, 1.2, 1.3, 1.4, 1.6, 1.7, 1.8, 1.9, 2.1, 2.2, 2.3, 2.4, 2.6, 2.7, 2.8, 2.9]);
  expect(axisMinorTicks({ min: 1.6, max: 2.8 })).toEqual([1.7, 1.9, 2.1, 2.3, 2.5, 2.7]);
  expect(axisMinorTicks({ min: 2, max: 2.3 })).toEqual([2.05, 2.15, 2.25]);
});
