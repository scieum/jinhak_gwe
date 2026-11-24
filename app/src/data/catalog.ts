import type { ConfidenceRule } from '../engine/types';
import type { AdmissionCut } from '../engine/judgment';
import type { ScoringRule } from '../engine/scoring';
import type { ComparisonBasis } from '../domain/comparison';

export const dataAsOf = '2026-11-18';
export const admissionYear = 2028;
export interface ProgramData {
  id: string;
  admission_year: number;
  university: string;
  program: string;
  department: string;
  source: string;
  license_status: 'allowed' | 'unknown' | 'denied';
  rule: ScoringRule | null;
  cut: AdmissionCut | null;
  cut_subject_scope: readonly string[];
  cut_grade_system: 5 | 9;
  cut_basis?: ComparisonBasis;
  fill_rate?: number;
  minimum_required: boolean;
  /** 면접 여부(검수된 모집요강 값). 없으면 면접 필터 있음·없음 어디에도 들지 않아요. */
  interview?: boolean;
  /** Explicit catalog metadata; never infer these from university or department names. */
  region?: string;
  field?: '인문' | '사회' | '자연' | '공학' | '의약' | '예체능';
  admission_type?: '교과' | '종합' | '논술' | '기타';
}
// Reviewed, licensed public data is added here by the data release process.
// No invented university or previous admission cut is shipped as real data.
// 샘플 모드일 때만 data/sample이 이 배열에 샘플 전형을 넣고 지울 때 빼요(그 밖에는 비어 있어요).
export const programs: ProgramData[] = [];
// Inert placeholder schema: no confidence label can be returned before review.
export const confidenceRule: ConfidenceRule = {
  id: 'R-CONV-008-pending', source: 'docs/prd.md R-CONV-008 (수치 정책 미확정)', review_status: 'draft',
  small_class_max: 5,
  high: { min_subjects: 1, max_small_ratio: 0, max_excluded_ratio: 0, max_spread: 0 },
  medium: { min_subjects: 1, max_small_ratio: 0, max_excluded_ratio: 0, max_spread: 0 },
};
