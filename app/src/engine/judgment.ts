import { between, invalid, pending, ready, reviewed, type Calculation, type Provenance } from './types';

export type Judgment = '안정' | '적정' | '소신' | '위험';
export interface JudgmentRule extends Provenance {
  thresholds: readonly [number, number, number];
}
export interface AdmissionCut extends Provenance { cut70: number }
export function judgeRange(
  range: { min: number; max: number }, cut: AdmissionCut | null, rule: JudgmentRule,
): Calculation<{ label: Judgment; favorable_label: Judgment; boundary: boolean; difference: number }> {
  if (!reviewed(rule)) return pending('판정 기준 준비 중');
  if (!cut || !reviewed(cut)) return pending('검수된 입결 자료가 필요해요.');
  const thresholds = rule.thresholds;
  if (!between(range.min, 1, 9) || !between(range.max, range.min, 9) || !between(cut.cut70, 1, 9)
    || thresholds.length !== 3 || thresholds.some((v, i) => !Number.isFinite(v) || (i > 0 && v <= thresholds[i - 1]))) {
    return invalid('환산 범위·입결 또는 판정 기준을 확인해 주세요.');
  }
  const classify = (value: number): Judgment => {
    // Compare grades at each boundary, avoiding 2.1 - 2 > 0.1 roundoff.
    const index = thresholds.findIndex(t => value <= cut.cut70 + t + 1e-12);
    return (['안정', '적정', '소신', '위험'] as const)[index < 0 ? 3 : index];
  };
  const label = classify(range.max), favorable_label = classify(range.min);
  return ready({ label, favorable_label, boundary: label !== favorable_label, difference: range.max - cut.cut70 }, [
    { rule: cut.id, detail: cut.source, value: cut.cut70 },
    { rule: rule.id, detail: '불리한 쪽 환산값으로 판정', value: range.max },
    { rule: rule.id, detail: '유리한 쪽 환산값으로 경계 확인', value: range.min },
  ]);
}
