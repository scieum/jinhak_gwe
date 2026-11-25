import { afterEach, expect, test, vi } from 'vitest';
import { rel, relNext, SAMPLE_TODAY } from '../src/data/sample/sampleClock';

afterEach(() => { vi.useRealTimers(); });

test('샘플 날짜는 실제 오늘과의 날짜 차이만큼 밀린다(KST 기준, 시각은 그대로)', () => {
  vi.useFakeTimers(); vi.setSystemTime(new Date(`${SAMPLE_TODAY}T10:00:00+09:00`));
  expect(rel('2026-11-20T18:00')).toBe('2026-11-20T18:00');
  vi.setSystemTime(new Date('2026-12-03T23:30:00+09:00')); // 9일 뒤(KST), UTC로는 아직 12-03
  expect(rel('2026-11-20T18:00')).toBe('2026-11-29T18:00');
  expect(rel('2026-12-30')).toBe('2027-01-08');
  expect(relNext('11-24까지 · 탐구 오답 같이 보기')).toBe('12-03까지 · 탐구 오답 같이 보기');
  expect(relNext('')).toBe('');
});
