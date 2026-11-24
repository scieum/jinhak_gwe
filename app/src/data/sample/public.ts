// 샘플 모드에서만 로더가 돌려주는 "공개 데이터" 대역. public/data의 실제 공개 파일은 건드리지 않아요.
// 값: work/admission-results/02-spec.md 1-1(경희대학교 교과 지역균형, 모두 가상 숫자).
// 연도는 demo-dataset "2026-11-24 화면 간 공통 기준"(최근 입결 2024·2025·2026)에 맞춰 2025~2027 → 2024~2026으로 옮겼어요.
import { RESULT_COLUMNS, type ReleasedUnit, type ResultRow } from '../../domain/resultReview';
import type { ProgramData } from '../catalog';
import { SAMPLE_UNIVERSITIES } from './student';

const SOURCE = 'https://admission.example.ac.kr/2026/khu-results.pdf';
// 학과, 70% 컷(2024 · 2025 · 2026), 2026 값: 50% 컷 · 경쟁률 · 모집 · 충원율
type Line = [unit: string, cuts: [number | null, number, number], cut50: number, rate: number, quota: number, fill: number];
const LINES: Line[] = [
  ['의예과', [1.10, 1.12, 1.08], 1.05, 18.2, 10, 40], ['약학과', [1.28, 1.31, 1.25], 1.20, 15.6, 8, 63],
  ['컴퓨터공학부', [2.05, 1.94, 1.88], 1.80, 14.1, 16, 125], ['간호학과', [2.10, 2.01, 1.95], 1.88, 11.0, 14, 93],
  ['소프트웨어융합학과', [null, 2.20, 2.12], 2.04, 13.5, 10, 110], ['경영학과', [2.31, 2.25, 2.18], 2.02, 12.4, 18, 105],
  ['기계공학과', [2.41, 2.28, 2.30], 2.21, 9.8, 15, 87], ['한약학과', [2.22, 2.40, 2.35], 2.26, 8.9, 6, 50],
  ['생물학과', [2.50, 2.55, 2.44], 2.36, 10.2, 9, 100], ['사학과', [2.60, 2.47, 2.52], 2.41, 9.1, 7, 71],
  ['국어국문학과', [2.58, 2.70, 2.61], 2.50, 8.4, 8, 88],
];
// 경영학과 이전 연도 세부(말풍선·패널용): 2025 = 10.8:1 · 18 · 89% · 50% 컷 2.10 / 2024 = 9.6:1 · 20 · 120% · 2.15
const EXTRA: Record<number, [number, number, number, number]> = { 2025: [2.10, 10.8, 18, 89], 2024: [2.15, 9.6, 20, 120] };
const YEARS = [2024, 2025, 2026];
const row = (values: Partial<ResultRow>): ResultRow => ({ ...Object.fromEntries(RESULT_COLUMNS.map(c => [c, ''])), ...values } as ResultRow);
export const sampleReleasedUnits: ReleasedUnit[] = YEARS.map((year, y) => ({
  university: '경희대학교', year, source_url: SOURCE, license: 'allowed',
  approvals: [{ reviewer: '관리자 A', at: '2026-11-16T00:00:00.000Z' }, { reviewer: '관리자 B', at: '2026-11-16T01:00:00.000Z' }],
  rows: LINES.filter(l => l[1][y] !== null).map(([unit, cuts, cut50, rate, quota, fill]) => {
    const latest = year === 2026, extra = unit === '경영학과' ? EXTRA[year] : undefined;
    const [c50, r, q, f] = latest ? [cut50, rate, quota, fill] : extra ?? [null, null, null, null];
    return row({ university: '경희대학교', result_year: String(year), round: '수시', admission_type: '교과', program: '학생부교과(지역균형)', recruit_unit: unit,
      quota: q === null ? '' : String(q), competition_rate: r === null ? '' : String(r), fill_rate: f === null ? '' : String(f),
      cut_50: c50 === null ? '' : c50.toFixed(2), cut_70: cuts[y]!.toFixed(2), metric: '교과등급', basis: '반영 교과 평균', grade_system: '9',
      source_url: SOURCE, note: '샘플 데이터(가상)' });
  }),
}));

/** 관심 대학 6곳을 전형 목록에 올려요. 입결 컷·환산 규칙은 비워 둬서 판정·환산은 "준비 중"으로 남아요(NEVER-1). */
export const samplePrograms: ProgramData[] = SAMPLE_UNIVERSITIES.map(([university, department], i) => ({
  id: `sample-program-${i + 1}`, admission_year: 2028, university, program: '학생부종합', department,
  source: '', license_status: 'unknown', rule: null, cut: null, cut_subject_scope: [], cut_grade_system: 9,
  minimum_required: false, admission_type: '종합', field: '사회',
}));
