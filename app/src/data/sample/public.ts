// 샘플 모드에서만 로더가 돌려주는 "공개 데이터" 대역. public/data의 실제 공개 파일은 건드리지 않아요.
// 값: work/admission-results/02-spec.md 1-1(경희대학교 교과 지역균형, 모두 가상 숫자).
// 연도는 demo-dataset "2026-11-24 화면 간 공통 기준"(최근 입결 2024·2025·2026)에 맞춰 2025~2027 → 2024~2026으로 옮겼어요.
import { RESULT_COLUMNS, type ReleasedUnit, type ResultRow } from '../../domain/resultReview';
import type { ProgramData } from '../catalog';
import type { ScoringRule } from '../../engine/scoring';
import { admissionYear } from '../catalog';
import { combinations, conversionBasisVersion } from '../../domain/results';
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
const khuUnits: ReleasedUnit[] = YEARS.map((year, y) => ({
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

// ── 관심 대학 6곳 샘플 입결·환산 규칙 (2026-11-24 사용자 결정 "샘플일 때만") ──────────────────────────────
// 모두 가상 값이에요. sample 표식이 붙어 있어서 샘플 모드에서만 판정·환산에 쓰이고, 샘플을 지우면 목록에서 빠져요.
// 70% 컷은 demo-dataset 판정(경희·건국 안정, 성균관·동국 적정, 한양 소신, 중앙 경계)이 샘플 성적(국수영사과 환산 약 2.3~2.6)에서
// 그대로 나오도록 정했어요. 판정 기준 R-JDG-001 [-0.3, +0.1, +0.4] · 불리한 쪽 값으로 판정, 유리한 쪽이 다르면 경계.
const INTEREST_SOURCE = 'https://admission.example.ac.kr/2026/sample-results.pdf';
// 대학, 전형, 70% 컷(2024 · 2025 · 2026), 2026 값: 50% 컷 · 경쟁률 · 모집 · 충원율, 수능최저
type Interest = [university: string, program: string, cuts: [number, number, number], cut50: number, rate: number, quota: number, fill: number, minimum: boolean];
const INTEREST: Interest[] = [
  ['경희대학교', '학생부교과(지역균형)', [2.95, 2.88, 2.90], 2.76, 11.2, 9, 78, true],
  ['건국대학교', '학생부교과', [3.10, 2.96, 3.00], 2.85, 9.6, 8, 112, false],
  ['성균관대학교', '학생부교과', [2.42, 2.55, 2.50], 2.38, 13.4, 6, 95, true],
  ['동국대학교', '학생부교과', [2.71, 2.58, 2.60], 2.47, 10.1, 7, 86, false],
  ['한양대학교', '학생부교과', [2.15, 2.26, 2.20], 2.08, 14.8, 5, 140, false],
  ['중앙대학교', '학생부교과', [1.94, 2.07, 2.00], 1.90, 16.3, 6, 133, true],
];
const department = (u: string) => SAMPLE_UNIVERSITIES.find(([name]) => name === u)![1];
const interestRow = ([university, program, cuts, cut50, rate, quota, fill]: Interest, y: number) => {
  const latest = y === YEARS.length - 1;
  return row({ university, result_year: String(YEARS[y]), round: '수시', admission_type: '교과', program, recruit_unit: department(university),
    quota: latest ? String(quota) : '', competition_rate: latest ? String(rate) : '', fill_rate: latest ? String(fill) : '',
    cut_50: latest ? cut50.toFixed(2) : '', cut_70: cuts[y].toFixed(2), metric: '교과등급', basis: '반영 교과 평균', grade_system: '9',
    source_url: INTEREST_SOURCE, note: '샘플 데이터(가상)' });
};
export const sampleReleasedUnits: ReleasedUnit[] = [
  ...khuUnits.map((u, y) => ({ ...u, rows: [...u.rows, interestRow(INTEREST[0], y)] })),
  ...INTEREST.slice(1).flatMap(line => YEARS.map((year, y) => ({ ...khuUnits[y], university: line[0], year, source_url: INTEREST_SOURCE, rows: [interestRow(line, y)] }))),
];

// 대학별 환산 샘플 규칙(가상). 점수표·만점은 대학마다 다르게 둬서 같은 성적도 점수가 달라지는 걸 보여 줘요.
type RuleShape = [groups: string, points: [number, number, number, number, number], gradeMax: number, attendanceMax: number];
const RULES: Record<string, RuleShape> = {
  경희대학교: ['국수영사과', [100, 96, 90, 80, 60], 950, 50],
  건국대학교: ['국수영사', [100, 97, 93, 85, 70], 900, 100],
  성균관대학교: ['국수영사과', [100, 95, 88, 76, 50], 1000, 0],
  동국대학교: ['국수영사', [100, 98, 94, 88, 76], 970, 30],
  한양대학교: ['국수영사과', [100, 94, 86, 74, 50], 900, 100],
  중앙대학교: ['국수영사과', [100, 96, 91, 83, 70], 950, 50],
};
const scoringRule = (university: string, program: string): ScoringRule => {
  const [groups, points, gradeMax, attendanceMax] = RULES[university];
  return { id: `sample-rule-${university}`, source: '샘플 데이터(가상) · 실제 시행계획 규칙이 아니에요', review_status: 'draft', sample: true,
    admission_year: admissionYear, university, program, version: 1, semesters: ['1-1', '1-2', '2-1', '2-2', '3-1'], subject_groups: [...combinations[groups]!],
    selection: { mode: 'all' }, credit_weighted: true, rank_grade_points: Object.fromEntries(points.map((v, i) => [String(i + 1), v])),
    achievement_blend: { mode: 'none' }, no_rank_subject_policy: 'exclude', joint_curriculum_policy: 'include', grade_max_score: gradeMax, base_score: 0,
    ...(attendanceMax ? { attendance_rule: { years: [1, 2], tardy_to_absence: 3, max_score: attendanceMax,
      deduction_table: [{ absence_max: 0, points: 0 }, { absence_max: 2, points: 1 }, { absence_max: 5, points: 3 }, { absence_max: 999, points: 10 }] } } : {}),
    max_score: gradeMax + attendanceMax, rounding: { digits: 2, mode: 'round' } };
};

/** 관심 대학 6곳의 교과 전형. 샘플 모드에서만 목록에 올라가고, sample 표식이 붙은 입결·규칙으로 판정·환산해요. */
export const samplePrograms: ProgramData[] = INTEREST.map(([university, program, cuts, , , , fill, minimum], i) => ({
  id: `sample-program-${i + 1}`, admission_year: admissionYear, university, program, department: department(university),
  source: INTEREST_SOURCE, license_status: 'allowed', rule: scoringRule(university, program),
  cut: { id: `sample-cut-${university}-2026`, source: `${INTEREST_SOURCE} · 2026학년도 70% 컷(가상)`, review_status: 'draft', sample: true, cut70: cuts[2] },
  cut_subject_scope: combinations['국수영사과']!, cut_grade_system: 9,
  cut_basis: { year: admissionYear, grade_system: 9, metric: 'converted_grade', statistic: 'p70', max_score: 9, subject_scope: combinations['국수영사과']!,
    semesters: ['1-1', '1-2', '2-1', '2-2'], method_id: 'five-to-nine-range', method_version: conversionBasisVersion(), source: `${INTEREST_SOURCE} · 샘플 비교 기준(가상)`,
    review_status: 'draft', sample: true },
  fill_rate: fill, minimum_required: minimum, interview: false, region: '서울', field: '사회', admission_type: '교과',
}));
