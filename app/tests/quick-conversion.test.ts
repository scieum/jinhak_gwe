import { describe, expect, test } from 'vitest';
import { quickConvert, type QuickAxis } from '../src/engine/quickConversion';

describe('간편 등급 계산: 구간 중앙값', () => {
  test('알려진 중앙값과 구간 내 값을 반올림 없이 연결', () => {
    expect(quickConvert('five', '3')).toMatchObject({ five: 3, nine: 5, percent: 50 });
    expect(quickConvert('five', '2')?.nine).toBeCloseTo(3 + 5 / 14.5, 12);
    expect(quickConvert('five', '2.5')?.percent).toBe(36);
    expect(quickConvert('five', '1')?.nine).toBeCloseTo(1 + 3 / 5.5, 12);
  });
  test('9등급과 누적 비율 입력을 양방향 변환', () => {
    expect(quickConvert('nine', '3')).toMatchObject({ nine: 3, percent: 17 });
    expect(quickConvert('nine', '3')?.five).toBeCloseTo(1 + 12 / 17, 12);
    expect(quickConvert('percent', '22')?.five).toBe(2);
    const first = quickConvert('five', '2.73')!;
    expect(quickConvert('nine', String(first.nine))?.five).toBeCloseTo(2.73, 12);
  });
  test('꼬리 구간은 끝 등급으로 제한하고 역변환의 한계를 표시', () => {
    expect(quickConvert('percent', '0')).toEqual({ five: 1, nine: 1, percent: 0, capped: true });
    expect(quickConvert('percent', '100')).toEqual({ five: 5, nine: 9, percent: 100, capped: true });
    expect(quickConvert('nine', '1')).toEqual({ five: 1, nine: 1, percent: 2, capped: true });
    expect(quickConvert('percent', '5')?.capped).toBe(false);
    expect(quickConvert('percent', '95')?.capped).toBe(false);
  });
  test.each<[QuickAxis, string]>([
    ['five', ''], ['five', ' '], ['five', '0.9'], ['five', '5.01'], ['nine', '9.1'],
    ['percent', '-1'], ['percent', '100.01'], ['five', 'NaN'], ['five', 'Infinity'],
    ['five', '2abc'], ['five', '1e0'], ['five', '2,5'],
  ])('%s에 잘못된 입력 %j를 넣으면 결과를 만들지 않음', (axis, value) => {
    expect(quickConvert(axis, value)).toBeNull();
  });
  test('소수점 편집 중 입력을 유지하며 정확한 값으로 계산', () => {
    expect(quickConvert('five', '2.')?.five).toBe(2);
    expect(quickConvert('five', '2.001')?.five).toBeCloseTo(2.001, 12);
  });
});
