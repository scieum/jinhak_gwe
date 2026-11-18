export type ReviewStatus = 'draft' | 'verified';
export interface Provenance {
  id: string;
  source: string;
  review_status: ReviewStatus;
}
export interface Trace {
  rule: string;
  detail: string;
  value?: number;
  subject_id?: string;
}
export type Calculation<T> =
  | { status: 'ready'; value: T; trace: Trace[] }
  | { status: 'not_ready'; reason: string; trace: Trace[] }
  | { status: 'invalid'; reason: string; trace: Trace[] };
export const ready = <T>(value: T, trace: Trace[] = []): Calculation<T> => ({ status: 'ready', value, trace });
export const pending = (reason: string, trace: Trace[] = []): Calculation<never> => ({ status: 'not_ready', reason, trace });
export const invalid = (reason: string): Calculation<never> => ({ status: 'invalid', reason, trace: [] });
export const reviewed = (rule: Provenance) =>
  rule.review_status === 'verified' && rule.id.trim().length > 0 && rule.source.trim().length > 0;
export const between = (n: number, min: number, max: number) => Number.isFinite(n) && n >= min && n <= max;

export interface SubjectGrade {
  id: string;
  subject_group: string;
  credits: number;
  rank_grade: number | null;
  enrolled_count?: number;
  raw_score?: number;
  division?: 'fixed' | 'estimated' | 'unknown';
  achievement_distribution?: readonly [number, number, number, number, number];
}
export interface ConversionRule extends Provenance {
  five_midpoints: readonly number[];
  nine_midpoints: readonly number[];
}
export interface EnrollmentRule extends Provenance {
  // Candidate rule: rounded cumulative headcounts; ties cannot be reconstructed from a report card.
  cumulative_percentages: readonly [number, number, number, number, number, number];
  rounding: 'half_up';
}
export interface DistributionRule extends Provenance {
  method: 'fixed_linear';
}
export interface PlacementTable extends Provenance {
  license_status: 'unknown' | 'allowed' | 'denied';
  basis_semesters: number;
  subject_scope: readonly string[];
  region: string;
  n: number;
  year: number;
  points: readonly { g5: number; g9: number }[];
}
export interface ConfidenceBand {
  min_subjects: number;
  max_small_ratio: number;
  max_excluded_ratio: number;
  max_spread: number;
}
export interface ConfidenceRule extends Provenance {
  small_class_max: number;
  high: ConfidenceBand;
  medium: ConfidenceBand;
}
