/** Standalone theoretical estimate; never used as an admissions judgment or a measured rank. */
export type QuickAxis = 'five' | 'nine' | 'percent';
export const quickBands = {
  five: [0, 10, 34, 66, 90, 100],
  nine: [0, 4, 11, 23, 40, 60, 77, 89, 96, 100],
} as const;
export const quickLimits: Record<QuickAxis, readonly [number, number]> = {
  five: [1, 5], nine: [1, 9], percent: [0, 100],
};
const centers = (bounds: readonly number[]) => bounds.slice(1).map((end, i) => (bounds[i] + end) / 2);
const fiveCenters = centers(quickBands.five);
const nineCenters = centers(quickBands.nine);
const fiveGrades = [1, 2, 3, 4, 5];
const nineGrades = [1, 2, 3, 4, 5, 6, 7, 8, 9];

function interpolate(value: number, xs: readonly number[], ys: readonly number[]) {
  if (value <= xs[0]) return ys[0];
  for (let i = 1; i < xs.length; i++) {
    if (value <= xs[i]) return ys[i - 1] + (value - xs[i - 1]) / (xs[i] - xs[i - 1]) * (ys[i] - ys[i - 1]);
  }
  return ys[ys.length - 1];
}

export interface QuickConversion { five: number; nine: number; percent: number; capped: boolean }

/** No intermediate rounding. Invalid input has no result, including empty strings. */
export function quickConvert(axis: QuickAxis, raw: string): QuickConversion | null {
  if (!/^\d+(?:\.\d*)?$/.test(raw.trim())) return null;
  const value = Number(raw);
  const [min, max] = quickLimits[axis];
  if (!Number.isFinite(value) || value < min || value > max) return null;
  const percent = axis === 'percent' ? value : axis === 'five'
    ? interpolate(value, fiveGrades, fiveCenters) : interpolate(value, nineGrades, nineCenters);
  return {
    five: interpolate(percent, fiveCenters, fiveGrades),
    nine: interpolate(percent, nineCenters, nineGrades),
    percent,
    capped: percent < fiveCenters[0] || percent > fiveCenters[4]
      || percent < nineCenters[0] || percent > nineCenters[8],
  };
}
