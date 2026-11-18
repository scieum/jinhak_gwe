import type { ConversionRule, DistributionRule, EnrollmentRule, PlacementTable } from '../engine/types';
import type { JudgmentRule } from '../engine/judgment';

// Drafts are deliberately not promoted by unit tests. Production activation requires content review.
export const baseConversionRule: ConversionRule = {
  id: 'R-CONV-001-004-v1', source: 'docs/prd.md §9', review_status: 'draft',
  five_midpoints: [5, 22, 50, 78, 95],
  nine_midpoints: [2, 7.5, 17, 31.5, 50, 68.5, 83, 92.5, 98],
};
export const enrollmentRule: EnrollmentRule = {
  id: 'R-CONV-010-candidate-v1', review_status: 'draft', rounding: 'half_up',
  source: 'https://www.pen.go.kr/upload/dep07/na/bbs_2629/ntt_1164293/doc_dc66vf893=7fvf3=45vbd=92v0e=15bbvdd97vf056_v9335.pdf',
  cumulative_percentages: [0, 10, 34, 66, 90, 100],
};
export const distributionRule: DistributionRule = {
  id: 'R-CONV-011-candidate-v1', source: 'docs/prd.md R-CONV-011; work/_ref/conversion-methods.md C3',
  review_status: 'draft', method: 'fixed_linear',
};
export const judgmentRule: JudgmentRule = {
  id: 'R-JDG-001-002-v1', source: 'docs/prd.md §9', review_status: 'draft', thresholds: [-0.3, 0.1, 0.4],
};

// Partial transcription already recorded in work/five-to-nine/02-spec.md v3.2.
// Original PDF and permission could not be checked (network proxy 403 on 2026-11-18).
// Exact 7/6, 8/6, 9/6 abscissas avoid treating rounded display labels as table knots.
// This is NOT the full table and is NEVER eligible for production calculation in its current state.
export const placementCandidates: readonly PlacementTable[] = [{
  id: 'busan-2025-semester1-partial', review_status: 'draft', license_status: 'unknown',
  source: 'https://www.kyobit.com/news/download.php?subUploadDir=202508/&savefilename=1354_597.pdf&idxno=597',
  year: 2025, basis_semesters: 1, region: '부산', n: 13553,
  // Original six-subject scope needs verification; do not reuse for a named subject-group combination.
  subject_scope: ['원자료 6과목(구성 미확인)'],
  points: [{ g5: 7 / 6, g9: 1.81 }, { g5: 8 / 6, g9: 2.18 }, { g5: 9 / 6, g9: 2.48 }],
}];
