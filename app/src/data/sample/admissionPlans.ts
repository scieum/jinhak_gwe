// 샘플 모드에서만 전형계획 목록(admissions-list)이 보여 주는 데모 전형 12행. public/data의 실제 공개 파일은 건드리지 않아요.
// 값: work/admissions-list/02-spec.md 1장 예시 데이터 = Figma admissions-list/1440(346:125015) · /390(346:123524) 표·목록.
// 대학명은 실제, 숫자는 모두 가상이에요. id는 로고 매핑이 같도록 실제 시행계획 자료의 캠퍼스 id를 써요(광주과학기술원은 자료에 없어 샘플 id).
import type { AdmissionPlan, PlanCatalog, PlanDocument, PlanProgram } from '../../domain/admissionPlans';

const CHECKED = '2026-11-18';
const doc = (id: string): PlanDocument => ({
  id: `${id}-doc`, label: '2028학년도 대입전형 시행계획(샘플)', provider: 'university', source_url: 'https://admission.example.ac.kr/2028/plan',
  download_url: 'https://admission.example.ac.kr/2028/plan.pdf', format: 'pdf', sha256: '', checked_at: CHECKED, page_count: null,
  filename: '', year_check: 'visual', topics: [], note: '샘플 데이터(가상) · 실제 시행계획이 아니에요',
});
// 전형명, 유형, 모집단위, 모집인원, 전년 모집인원(없으면 변화 없음), 수능최저 있음, 면접 있음
type Line = [name: string, type: string, unit: string, quota: number, prev: number | null, minimum: boolean, interview: boolean];
const plan = (id: string, university: string, region: string, lines: Line[]): AdmissionPlan => ({
  id, university, campus: '본교', region, year: 2028, review_status: 'draft', documents: [doc(id)], notices: [],
  programs: lines.map(([name, type, unit, quota, prev, minimum, interview]): PlanProgram & { quota_prev?: string; unit: string } => ({
    name, round: type === '정시' ? '정시' : '수시', type, unit, quota: `${quota}명`, ...(prev === null ? {} : { quota_prev: `${prev}명` }),
    method: '샘플 데이터(가상)', minimum: minimum ? '적용(샘플)' : '미적용', interview: interview ? '있음' : '없음',
    eligibility: '샘플 데이터(가상)', pages: [1], document_id: `${id}-doc`,
  })),
});

export const samplePlanCatalog: PlanCatalog = {
  format: 'jinhak-navi-admission-plans', version: 1, year: 2028, checked_at: CHECKED, review_status: 'draft',
  entries: [
    plan('plan-0000003', '강원대학교', '강원', [['학생부교과(지역인재)', '교과', '전 모집단위', 412, 374, true, false], ['학생부종합(미래인재)', '종합', '전 모집단위', 520, 535, false, true]]),
    plan('plan-0000066', '경희대학교', '서울', [['학생부교과(지역균형)', '교과', '인문·자연', 568, null, true, false]]),
    plan('plan-0000069', '고려대학교', '서울', [['학생부교과(학교추천)', '교과', '전 모집단위', 650, 672, true, false], ['논술전형', '논술', '인문·자연', 344, 334, true, false]]),
    // 로고 이름표(universityLogoNames.json)에는 '광주과학기술원(GIST)'로 있어서 logo_name으로 찾아요
    { ...plan('sample-plan-gist', '광주과학기술원', '광주', [['학생부종합(일반)', '종합', '기초교육학부', 150, null, false, true]]), logo_name: '광주과학기술원(GIST)' } as AdmissionPlan,
    plan('plan-0000133', '성균관대학교', '서울', [['학생부교과(학교장추천)', '교과', '전 모집단위', 361, 350, true, false]]),
    plan('plan-0000149', '연세대학교', '서울', [['학생부교과(추천형)', '교과', '전 모집단위', 498, 523, false, true]]),
    plan('plan-0000175', '중앙대학교', '서울', [['학생부교과(지역균형)', '교과', '전 모집단위', 507, null, true, false], ['수능 가군 일반전형', '정시', '인문·자연', 615, 645, false, false]]),
    plan('plan-0000198', '한림대학교', '강원', [['학생부교과(지역인재)', '교과', '의예·간호 외', 210, 190, true, false]]),
    plan('plan-0000203', '한양대학교', '서울', [['학생부교과(추천형)', '교과', '전 모집단위', 330, 338, false, false]]),
  ],
};
