// 대학 상세(univ-detail, v2 시안 346:144159 · 346:143371) 화면 자료. 실제 모드는 2028 시행계획 목록(admission-plans.json)에서,
// 샘플 모드는 data/sample/univDetail.ts(시안 데모)에서 만들어요. 판정·환산은 없어요(공개 자료 화면).
import type { AdmissionPlan } from './admissionPlans';
import { programPath } from './interests';

export type UdType = '교과' | '종합' | '논술' | '기타' | '정시';
export interface UdProgram {
  name: string; type: UdType; sub: string; round: '수시' | '정시'; quota: number | null;
  minimum: '있음' | '없음' | '해당 없음' | '원문 확인'; interview: '있음' | '없음' | '원문 확인';
  facts: [label: string, value: string][]; path: string; source?: string;
}
export interface UdChange { program: string; item: string; prev: string; next: string; delta?: number }
export interface UdView {
  university: string; place: string; status: string; checked: string; homepage?: string;
  /** null = 2027 자료가 없어 비교 전(준비 중) */
  changes: UdChange[] | null; headline?: { pc: string; mobile: string };
  source?: { url: string; label: string; short: string };
  programs: UdProgram[];
}

const TYPES: UdType[] = ['교과', '종합', '논술', '기타', '정시'];
const typeOf = (round: string, type: string): UdType => round === '정시' ? '정시' : TYPES.find(t => type.includes(t)) ?? '기타';
const none = (v: string | undefined) => !v || /미적용|없음|미실시|해당 없음/.test(v);
// 구조화 자료에서 근거 쪽수가 없는 항목은 '원문 확인 필요'로 와요(build_admission_plan_programs.py). 있음·없음으로 바꾸지 않아요.
const UNKNOWN = '원문 확인 필요';

export function planView(plan: AdmissionPlan): UdView {
  const doc = plan.documents[0];
  const homepage = plan.documents.find(d => d.provider === 'university')?.source_url;
  return {
    university: plan.university, place: [plan.region, plan.campus].join(' · '), status: '시행계획 기준', checked: doc?.checked_at ?? '',
    homepage: homepage ? new URL(homepage).origin : undefined, changes: null,
    source: doc && { url: doc.source_url, label: `출처: ${doc.label}`, short: doc.label },
    programs: plan.programs.map(p => {
      const round = p.round === '정시' ? '정시' : '수시', quota = Number.parseInt(p.quota, 10);
      return {
        name: p.name, type: typeOf(round, p.type), sub: p.scope ?? '—', round, quota: Number.isFinite(quota) ? quota : null,
        minimum: round === '정시' ? '해당 없음' : p.minimum === UNKNOWN ? '원문 확인' : none(p.minimum) ? '없음' : '있음',
        interview: p.interview === UNKNOWN ? '원문 확인' : none(p.interview) ? '없음' : '있음',
        facts: [['모집인원', p.quota], ['전형요소', p.method], ['수능최저', p.minimum], ['면접', p.interview ?? '원문 확인']],
        path: programPath(plan.university, p.name), source: plan.documents.find(d => d.id === p.document_id)?.source_url,
      };
    }),
  };
}

/** 모바일 전형 행 아래 줄: "교과 · 모집 98명 · 수능최저 있음" */
export const programLine = (p: UdProgram) =>
  [p.type, p.quota !== null && `모집 ${p.quota}명`, p.minimum === '있음' ? '수능최저 있음' : p.interview === '있음' && '면접 있음'].filter(Boolean).join(' · ');
