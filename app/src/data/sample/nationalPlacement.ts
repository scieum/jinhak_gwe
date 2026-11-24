// 샘플 모드에서만 전국 배치표(national-placement)가 보여 주는 데모: 대학 24곳 · 원문 61행(2026 수시 교과등급 70% 컷) + 수집 대학 32곳.
// 값: work/national-placement/02-spec.md 1-1 · 1-2 · 1-3 = Figma national-placement/390(530:85565) · /1440(532:86654) 좌표 배치표 1페이지.
// 2~3페이지 14곳은 시안에 그려지지 않아 같은 규칙(가나다순 · 대학당 1~2행)으로 채웠어요. 대학명은 실제, 숫자는 모두 가상이에요.
// 관심 대학(student.ts)과 겹치는 경희·성균관·동국·한양·중앙은 같은 전형명을 써요. public/data의 실제 공개 파일은 건드리지 않아요.
import type { CollectedIndex } from '../../domain/collectedResults';
import type { NationalPlacementIndex, NationalPlacementRow } from '../../domain/nationalPlacement';
import type { ResultRow } from '../../domain/resultReview';

const YEAR = '2026', ZERO = '0'.repeat(64);
// 대학, 모집단위, 전형, 유형(교과·종합·논술 · 그 밖은 '기타' 모양), 70% 컷, 산출 기준
type Line = [university: string, unit: string, program: string, type: string, cut: string, basis?: string];
const R = '반영 교과 평균', A = '전과목 평균';
const LINES: Line[] = [
  ['가천대학교', '간호학과', '학생부우수자', '교과', '2.1'], ['가천대학교', '물리치료학과', '학생부우수자', '교과', '2.1'], ['가천대학교', '의예과', '가천의약학', '종합', '2.8'],
  ['가톨릭관동대학교', '간호학과', '교과일반', '교과', '3.9', A], ['가톨릭관동대학교', '의예과', 'CKU종합', '종합', '4.6'],
  ['강릉원주대학교', '치의예과', '교과성적우수자', '교과', '4.4'], ['강릉원주대학교', '간호학과', '교과성적우수자', '교과', '4.4'], ['강릉원주대학교', '경영학과', '교과성적우수자', '교과', '4.4'],
  ['강릉원주대학교', '해양생명과학과', '지역교과', '교과', '5.1'], ['강릉원주대학교', '컴퓨터공학과', '해람인재', '종합', '5.0'],
  ['강원대학교', '간호학과', '학생부교과(일반)', '교과', '2.9'], ['강원대학교', '수학교육과', '학생부교과(일반)', '교과', '2.9'], ['강원대학교', '경영학과', '학생부교과(지역인재)', '교과', '2.9', A],
  ['강원대학교', '생명건강공학과', '학생부교과(일반)', '교과', '2.9'], ['강원대학교', '행정학과', '학생부교과(지역인재)', '교과', '3.3'], ['강원대학교', '국어교육과', '미래인재', '종합', '3.4'],
  ['강원대학교', '체육교육과', '실기', '실기', '4.1'],
  ['건국대학교(글로컬)', '간호학과', '교과일반', '교과', '4.8'], ['건국대학교(글로컬)', '유아교육과', 'Cogito자기추천', '종합', '5.3'],
  ['경북대학교', '수학과', '교과우수자', '교과', '2.2'], ['경북대학교', '전자공학부', '교과우수자', '교과', '2.2'], ['경북대학교', '경영학부', '지역인재', '교과', '2.2'],
  ['경북대학교', '생명과학부', '일반학생', '종합', '2.7'], ['경북대학교', '영어영문학과', '논술(AAT)', '논술', '3.6'],
  ['경상국립대학교', '수의예과', '일반', '교과', '3.1'], ['경상국립대학교', '사범대학', '일반', '종합', '3.8'],
  ['경희대학교', '한의예과(인문)', '학생부교과(지역균형)', '교과', '1.8'], ['경희대학교', '행정학과', '네오르네상스', '종합', '2.4'], ['경희대학교', '경영학과', '논술우수자', '논술', '4.2'],
  ['계명대학교', '간호학과', '일반', '교과', '3.7'], ['계명대학교', '경영학전공', '학생부종합', '종합', '4.3'],
  ['고려대학교', '의과대학', '학교추천', '교과', '1.5'], ['고려대학교', '경영대학', '학교추천', '교과', '1.5'], ['고려대학교', '정치외교학과', '학업우수', '종합', '2.0'], ['고려대학교', '통계학과', '논술', '논술', '3.9'],
  // 2~3페이지(시안에 그려지지 않은 14곳 · 26행)
  ['광운대학교', '전자공학과', '지역균형', '교과', '2.6'], ['광운대학교', '경영학부', '광운참빛인재', '종합', '3.1'],
  ['국민대학교', '경영학부', '교과성적우수자', '교과', '2.5'], ['국민대학교', '소프트웨어학부', '국민프런티어', '종합', '3.0'],
  ['군산대학교', '간호학과', '일반', '교과', '3.8'], ['군산대학교', '해양생명의학과', '새만금인재', '종합', '5.2'],
  ['단국대학교', '경영학부', '지역균형', '교과', '2.4'], ['단국대학교', '응용통계학과', 'DKU인재', '종합', '3.2'],
  ['동국대학교', '행정학과', '학생부교과', '교과', '2.0'], ['동국대학교', '경찰행정학부', 'Do Dream', '종합', '2.6'],
  ['부산대학교', '기계공학부', '학생부교과', '교과', '2.1'], ['부산대학교', '사회학과', '학생부종합', '종합', '2.9'],
  ['서울시립대학교', '세무학과', '지역균형', '교과', '1.9'], ['서울시립대학교', '도시공학과', '학생부종합', '종합', '2.5'],
  ['성균관대학교', '행정학과', '학생부교과(학교장추천)', '교과', '1.7'], ['성균관대학교', '글로벌경영학', '융합형', '종합', '2.3'],
  ['숭실대학교', '경영학부', '학생부우수자', '교과', '2.6'], ['숭실대학교', '컴퓨터학부', 'SSU미래인재', '종합', '3.1'],
  ['아주대학교', '의학과', '고교추천', '교과', '1.6'], ['아주대학교', '경영학과', 'ACE', '종합', '2.9'],
  ['연세대학교', '경제학부', '추천형', '교과', '1.4'], ['연세대학교', '생명공학과', '활동우수형', '종합', '2.2'],
  ['인하대학교', '기계공학과', '지역균형', '교과', '2.3'],
  ['중앙대학교', '공공인재학부', '학생부교과(지역균형)', '교과', '1.9'], ['중앙대학교', '경영학부', 'CAU융합형인재', '종합', '2.6'],
  ['한양대학교', '정책학과', '학생부교과(추천형)', '교과', '1.6'],
];
// 좌표를 찍지 않는 수집 대학 8곳: 검수 전 5곳(시안 묶음 줄) + 2026 자료 없는 3곳 → 수집 대학 32
const UNPLOTTED = ['가야대학교', '강남대학교', '강서대학교', '경일대학교', '광주대학교', '서강대학교', '한국외국어대학교', '홍익대학교'];
export const SAMPLE_PENDING_NOTE = '검수 전인 대학 5곳은 좌표를 찍지 않았어요';

const index = new Map<string, number>();
export const sampleNationalRows: NationalPlacementRow[] = LINES.map(([university, recruit_unit, program, admission_type, cut_70, basis = R]) => {
  const sourceRow = index.get(university) ?? 0; index.set(university, sourceRow + 1);
  return { id: `${university}:${sourceRow}`, sourceRow, year: YEAR, university, round: '수시', admission_type, program, recruit_unit,
    metric: '교과등급', basis, cut_50: '', cut_70, grade_system: '9' };
});

const names = [...new Set([...LINES.map(l => l[0]), ...UNPLOTTED])].sort((a, b) => a.localeCompare(b, 'ko'));
const collection: CollectedIndex = {
  format: 'jinhak-navi-collected-index', version: 1, status: 'draft', generated_at: '2026-11-20T00:00:00.000Z', source_file: 'sample', source_sha256: ZERO,
  rows: sampleNationalRows.length + UNPLOTTED.length, sources: names.length,
  universities: names.map(university => { const rows = index.get(university) ?? 1;
    return { university, file: 'sample.json', sha256: ZERO, bytes: 1, rows, years: index.has(university) ? ['2024', '2025', YEAR] : ['2024', '2025'], rounds: { 수시: rows }, sources: 1 }; }),
};
const nationalIndex: NationalPlacementIndex = {
  format: 'jinhak-national-placement-index', version: 2, status: 'draft', collection_sha256: ZERO, collection_rows: collection.rows, collection_universities: names.length,
  years: ['2026', '2025', '2024'].map(year => ({ year, file: `${ZERO}.json`, sha256: ZERO, bytes: 1, rows: year === YEAR ? sampleNationalRows.length : 1, universities: 1 })),
};
export const sampleNationalCatalog = { collection, index: nationalIndex };

/** 원문 상세(CollectedResultFields)에 넘기는 가상 원문 한 행. */
export const sampleSourceRow = (row: NationalPlacementRow): ResultRow => ({
  university: row.university, result_year: row.year, round: row.round, admission_type: row.admission_type, program: row.program, recruit_unit: row.recruit_unit,
  quota: '9', applicants: '111', competition_rate: '12.3', fill_count: '7', fill_rate: '', cut_50: '', cut_70: row.cut_70, cut_other: '', metric: row.metric,
  basis: row.basis, grade_system: row.grade_system, source_url: 'https://admission.example.ac.kr/2026/result', source_page: '12', note: '샘플 데이터(가상) · 실제 입결이 아니에요',
});
