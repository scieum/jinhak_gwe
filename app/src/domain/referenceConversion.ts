import bundle from '../data/scenario-model.v05.json';
import { createScenarioReference } from '../engine/scenarioReference';

/** User authorized source-first refinement. This is not empirical validation. */
export const referenceModelRelease = Object.freeze({ version: '0.5', enabled: true,
  authorizedOn: '2026-11-26', usage: 'reference_estimate', empiricallyValidated: false });

// Reference-only release keeps the source's research status honest.
// Import/validate the bundled coefficients once; no request, key, or server at input time.
const model = createScenarioReference(bundle);

export function referenceConversion(raw: number | string) {
  if (!referenceModelRelease.enabled) return null;
  if (typeof raw === 'string' && !/^\d+(?:\.\d*)?$/.test(raw.trim())) return null;
  const grade = typeof raw === 'string' ? Number(raw.trim()) : raw;
  if (typeof grade !== 'number' || !Number.isFinite(grade) || grade < 1 || grade > 5) return null;
  // Preserve both assumptions; an average alone cannot select a validated scenario.
  return model.calculate(grade);
}

export const referenceNote = '예상 대응표의 두 시나리오를 따로 계산해요. 범위는 표의 반올림을 반영하며 신뢰구간이나 합격 예측이 아니에요.';
