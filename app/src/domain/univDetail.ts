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

// 전형 상세(program-detail, v2 시안 346:217877 · 346:235058). 샘플 모드 = data/sample/programDetail.ts(시안 데모),
// 실제 모드 = 2028 시행계획 목록의 그 대학·전형. 자료에 없는 칸(일정·교과 반영 방법·단계별 비율)은 섹션째 빼고, 근거 없는 값은 '원문 확인'이에요.
export type Pair = [label: string, value: string];
export interface PdView {
  university: string; program: string; round: string; type: string; status: string; checked: string;
  source?: { url: string; label: string };
  quota: string; lead: { pc: string; mobile: string }; facts: Pair[];
  method: { lead: string; table?: { head: string[]; rows: string[][] }; note?: string };
  eligibility: Pair[]; minimum: { rows: Pair[]; original?: string } | null; schedule: Pair[]; record: Pair[];
}

export function programView(plan: AdmissionPlan, name: string): PdView | null {
  const rows = plan.programs.filter(p => p.name === name);
  if (!rows.length) return null;
  // shortcut: 같은 전형명이 모집단위별 여러 행이면 첫 행의 전형요소·자격·최저를 보여 줘요. 행마다 다르면 모집단위 표로 바꿔야 해요.
  const p = rows[0], u = planView({ ...plan, programs: [p] }).programs[0];
  const doc = plan.documents.find(d => d.id === p.document_id) ?? plan.documents[0];
  const known = (v?: string) => !v || v === UNKNOWN ? '원문 확인' : v;
  const lead = p.method === UNKNOWN ? '전형요소와 비율은 원문에서 확인해 주세요' : `전형요소: ${p.method}`;
  return {
    university: plan.university, program: name, round: u.round, type: p.type, status: '시행계획 기준', checked: doc?.checked_at ?? '',
    source: doc && { url: doc.source_url, label: `출처: ${doc.label}${p.pages.length ? ` ${p.pages.join('·')}쪽` : ''}` },
    quota: rows.length > 1 ? `모집단위 ${rows.length}개` : known(p.quota), lead: { pc: lead, mobile: lead },
    facts: [['수능최저', u.minimum], ['면접', u.interview]],
    method: { lead: known(p.method) === '원문 확인' ? '전형요소와 비율은 원문에서 확인해 주세요.' : p.method },
    eligibility: [['대상', known(p.eligibility)]],
    minimum: u.round === '정시' ? null : { rows: [['조건', known(p.minimum)]] },
    schedule: [], record: [],
  };
}
