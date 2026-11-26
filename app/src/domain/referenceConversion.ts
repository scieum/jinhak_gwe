import bundle from '../data/calibrated-model.v04.json';
import { createCalibratedFusion } from '../engine/calibratedFusion';

/** User authorized v0.4 reference deployment on 2026-11-26. This is not empirical validation. */
export const referenceModelRelease = Object.freeze({ version: '0.4', enabled: true,
  authorizedOn: '2026-11-26', usage: 'reference_estimate', empiricallyValidated: false });

// Explicit opt-in keeps the source's research status honest. Never relabel it verified.
// Import/validate the bundled coefficients once; no request, key, or server at input time.
const model = createCalibratedFusion(bundle, { mode: 'research' });

export function referenceConversion(raw: number | string) {
  if (!referenceModelRelease.enabled) return null;
  if (typeof raw === 'string' && !/^\d+(?:\.\d*)?$/.test(raw.trim())) return null;
  const grade = typeof raw === 'string' ? Number(raw.trim()) : raw;
  if (typeof grade !== 'number' || !Number.isFinite(grade) || grade < 1 || grade > 5) return null;
  // The app cannot identify an equivalent source population from an average alone.
  return model.calculate(grade, 'unspecified');
}

export const referenceNote = '자체 수치 모델의 참고 추정이에요. 범위는 신뢰구간이나 합격 예측이 아니며 대학 공식 환산점수와 다를 수 있어요.';
