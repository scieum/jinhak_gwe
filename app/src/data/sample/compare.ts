// 샘플 모드에서만 전형 비교(compare)가 보여 주는 데모: 시안이 그리는 비교 3개(가천 · 강원 · 경북 간호학과).
// 값: Figma compare/1440(658:187197) · /390(657:186568) 비교표 그대로. 대학명은 실제, 숫자는 모두 가상이에요.
// 경북대 2026은 원문 2건(직접 선택)이라 시안처럼 컷 줄이 비고 "원문 2건 · 직접 선택"이 보여요. public/data의 실제 공개 파일은 건드리지 않아요.
import type { CollectedIndex } from '../../domain/collectedResults';
import { interestId, type Interest } from '../../domain/interests';
import type { ResultRow } from '../../domain/resultReview';

const ZERO = '0'.repeat(64);
// 대학, 전형, 모집인원, 경쟁률, 산출 기준·대상, [2024, 2025, 2026 70% 컷]('' = 미기재, 배열 = 원문 여러 건)
type Plan = [university: string, program: string, quota: string, rate: string, basis: string, cuts: (string | string[])[]];
const PLANS: Plan[] = [
  ['가천대학교', '학생부교과(지역균형)', '15', '12.4', '최종 등록자 · 반영 교과', ['2.31', '2.18', '2.05']],
  ['강원대학교', '학생부교과(일반)', '20', '8.9', '최초 합격자 · 전 교과', ['2.64', '2.52', '2.71']],
  ['경북대학교', '학생부교과(교과우수자)', '18', '10.2', '최종 등록자 · 국영수사과', ['', '2.40', ['2.33', '2.38']]],
];
const UNIT = '간호학과', YEARS = ['2024', '2025', '2026'];

export const sampleComparisonItems: Interest[] = PLANS.map(([university, program]) =>
  ({ id: interestId(university, program, UNIT), university, program, department: UNIT, created_at: '2026-11-18T00:00:00.000Z' }));
export const sampleComparisonRows: Record<string, ResultRow[]> = Object.fromEntries(PLANS.map(([university, program, quota, rate, basis, cuts]) =>
  [university, YEARS.flatMap((year, i) => [cuts[i]].flat().map((cut, page) => ({
    university, result_year: year, round: '수시', admission_type: '학생부교과', program, recruit_unit: UNIT, quota, applicants: String(Math.round(Number(quota) * Number(rate))),
    competition_rate: rate,fill_count: '', fill_rate: '', cut_50: '', cut_70: cut, cut_other: '', metric: '교과등급', basis, grade_system: '9',
    source_url: 'https://admission.example.ac.kr/result', source_page: String(10 + page), note: '샘플 데이터(가상) · 실제 입결이 아니에요',
  })))]));
export const sampleComparisonCatalog: CollectedIndex = {
  format: 'jinhak-navi-collected-index', version: 1, status: 'draft', generated_at: '2026-11-18T00:00:00.000Z', source_file: 'sample', source_sha256: ZERO,
  rows: Object.values(sampleComparisonRows).flat().length, sources: PLANS.length,
  universities: PLANS.map(([university]) => ({ university, file: 'sample.json', sha256: ZERO, bytes: 1, rows: sampleComparisonRows[university].length, years: [...YEARS].reverse(), rounds: { 수시: sampleComparisonRows[university].length }, sources: 1 })),
};
