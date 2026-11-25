// 기존 fiveToNine 엔진용 타입. 필드 이름은 PRD 8장 데이터 모델을 따른다.

export type ReviewStatus = 'draft' | 'pending' | 'verified';
export type LicenseStatus = 'allowed' | 'pending' | 'not_allowed';

export type SemesterKey = '1-1' | '1-2' | '2-1' | '2-2' | '3-1' | '3-2';

export type SubjectType = '공통' | '일반선택' | '진로선택' | '융합선택' | '체육예술' | '과탐실험' | '교양';

export type Achievement = 'A' | 'B' | 'C' | 'D' | 'E' | 'P';

export interface Distribution {
  A: number;
  B: number;
  C: number;
  D: number;
  E: number;
}

export interface Subject {
  name: string;
  /** 교과(군): 국어·수학·영어·사회·과학·한국사·기타 … */
  group: string;
  type: SubjectType;
  credits: number;
  /** 석차등급 1~5. 미산출이면 null/생략 */
  grade5?: number | null;
  rawScore?: number;
  mean?: number;
  achievement?: Achievement;
  /** 성취도별 분포비율(%) */
  distribution?: Distribution;
  /** 수강자수 */
  enrolled?: number;
  /** 성취도 분할점수가 고정분할(90·80·70·60)인지. 모르면 생략 */
  fixedCutoff?: boolean;
  isJoint?: boolean;
}

export type GradeSet = Partial<Record<SemesterKey, Subject[]>>;

export interface TraceStep {
  id: string;
  label: string;
  value?: number | string;
  rule?: string;
  note?: string;
}

/** 방법 하나의 결과. 검수 전·허락 전이면 숫자를 내지 않는다(NEVER-1) */
export type MethodResult =
  | { status: 'ok'; value: number }
  | { status: 'pending'; reason: string }
  | { status: 'unavailable'; reason: string };

/** 검수 전 후보 방식(R-CONV-012·013)의 결과. 범위 + (있으면) 기댓값. 학생 화면의 min/max/대표값에는 넣지 않는다 */
export type CandidateResult =
  | { status: 'ok'; value: number | null; min: number; max: number; note?: string }
  | { status: 'pending'; reason: string }
  | { status: 'unavailable'; reason: string };

export type Confidence = '높음' | '보통' | '낮음';

/** 배치표(방법 B). R-CONV-009 필수 메타 포함. 원자료의 대학 라인은 담지 않는다 */
export interface ConversionTable {
  id: string;
  source: string;
  source_year: number;
  basis_semesters: number;
  subject_scope: string;
  region: string;
  n: number;
  license_status: LicenseStatus;
  review_status: ReviewStatus;
  /** converted9_low: 같은 평균 안에서 원표가 범위로 낸 아래 끝(예: 부산 1.00 → 1.15~1.45) */
  points: { avg5: number; converted9: number; converted9_low?: number; cumulative_pct?: number }[];
  source_url?: string;
  sample?: boolean;
  note?: string;
}

export interface ConversionConfig {
  /** R-CONV-001: 5등급 구간 중앙 누적비(%) — 관리자 설정값 */
  centers5: number[];
  /** R-CONV-002: 9등급 구간 중앙 누적비(%) */
  centers9: number[];
  /** 시행지침 5등급 누적비율(%) — R-CONV-010 실제 구간 계산용 */
  cumulative5: number[];
  /** 시행지침 9등급 누적비율(%) — R-CONV-013 균등분포 계산용 */
  cumulative9?: number[];
  rules: Record<string, { review_status: ReviewStatus; note?: string; source?: string }>;
  /** R-CONV-012 후보 실측표(검수 전). 학기 라벨은 basis_semesters */
  candidateTables?: ConversionTable[];
  confidence: {
    minRankedSubjects: number;
    maxSmallRatio: number;
    maxSpread: number;
    /** 이 인원 이하를 '소수 수강'으로 센다 */
    smallClassMax: number;
  };
}

export interface ScoringRule {
  id: string;
  university: string;
  program: string;
  version: number;
  semesters: SemesterKey[];
  year_weights?: Record<string, number> | null;
  subject_groups: string[];
  selection: { mode: 'all' | 'top_n_per_group' | 'top_n_total'; n?: number };
  credit_weighted: boolean;
  rank_grade_points: Record<string, number>;
  achievement_points?: Record<string, number>;
  achievement_blend: { mode: 'none' | 'weighted' | 'max'; rank_ratio?: number; achievement_ratio?: number };
  no_rank_subject_policy: 'exclude' | 'achievement_convert';
  /** 교과 만점. 과목 점수 평균(점수표 최고점 기준 비율)에 곱한다 */
  grade_max_score: number;
  attendance_rule?: {
    tardy_to_absence: number;
    max_score: number;
    deduction_table: { absence_max: number; points: number }[];
  } | null;
  max_score: number;
  rounding: { digits: number; mode: 'round' | 'floor' | 'ceil' };
  review_status: ReviewStatus;
  source?: { url?: string; page?: number };
  sample?: boolean;
}

export interface AttendanceInput {
  /** 미인정 결석 일수 */
  absence: number;
  /** 미인정 지각·조퇴·결과 횟수 합 */
  tardy_like: number;
}
