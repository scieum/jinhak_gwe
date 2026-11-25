// 특수 계열 모아보기(work/special-tracks/02-spec.md). 묶음 매핑표(4-1)와 실기 채점 기준표(4-2)는 관리자 2명 검수분만 공개 파일에 실리고,
// 화면은 공개 입결(검수 완료)을 그대로 옮기고 거르기만 한다. 환산 · 보간 · 평균 · 점수 계산 없음(NEVER-1), 정렬은 가나다 · 모집인원만(D10).
import { REQUIRED_APPROVALS, type Approval, type ReleasedUnit, type ResultRow } from './resultReview';
import { typeTab } from './resultBrowse';
import { forbiddenIn, https } from './univWiki';

export const TRACKS = [
  { id: '메디컬', subs: ['의예', '치의예', '한의예', '약학', '수의예'], desc: '의예 · 치의예 · 한의예 · 약학 · 수의예 모집단위를 모았어요' },
  { id: '보건', subs: ['간호', '물리치료', '작업치료', '임상병리', '방사선', '치위생', '그 밖의 보건'], desc: '간호 · 물리치료 · 작업치료 · 임상병리 · 방사선 · 치위생 같은 보건 계열 모집단위를 모았어요' },
  { id: '교육', subs: ['교대(초등교육)', '사범대'], desc: '교육대학교 · 초등교육과와 사범대학 모집단위를 모았어요' },
  { id: '과기원', subs: [], desc: 'KAIST · GIST · DGIST · UNIST · KENTECH을 모았어요 · POSTECH은 과기원이 아닌 사립대지만 함께 찾는 경우가 많아 같이 모았어요' },
  { id: '체육', subs: ['체육교육', '스포츠과학', '그 밖의 체육'], desc: '실기 전형은 교과 컷을 표시하지 않아요 · 실기 종목과 채점 기준은 대학별 상세에서 확인해 주세요' },
  { id: '예체능 실기', subs: ['미술', '디자인', '음악', '연극영화', '무용'], desc: '미술 · 디자인 · 음악 · 연극영화 · 무용 모집단위를 모았어요 · 실기가 있는 전형은 입결 숫자 없이 모집인원과 실기 과목 · 채점 기준을 보여요' },
  { id: '계약학과', subs: ['반도체', '군', '그 밖의 채용 조건형'], desc: '졸업 뒤 채용이나 의무 복무를 조건으로 뽑는 계약학과를 모았어요 · 재직자 재교육형은 빼요' },
  { id: '자유전공', subs: [], desc: '전공을 입학 뒤에 고르는 자유전공 · 무전공 모집단위를 모았어요' },
  { id: '특수목적대', subs: [], desc: '사관학교 · 경찰대학 등의 자료는 아직 검수 중이에요' },
] as const;
export type TrackId = typeof TRACKS[number]['id'];
export const trackOf = (id: TrackId) => TRACKS.find(t => t.id === id)!;
/** T1 ② 묶음별 기준 문장. */
export const TRACK_RULE: Record<TrackId, string> = {
  메디컬: '의예 · 치의예 · 한의예 · 약학 · 수의예 모집단위(학과 이름이 달라도 매핑표 기준, 예: 의학과 · 약학부)',
  보건: '간호 · 물리치료 · 작업치료 · 임상병리 · 방사선 · 치위생 등 보건 계열 모집단위',
  교육: '교육대학교 · 초등교육과와 사범대학 모집단위',
  과기원: 'KAIST · GIST · DGIST · UNIST · KENTECH과 POSTECH(사립대)의 학부 모집단위',
  체육: '체육교육 · 스포츠과학 등, 실기가 있는 전형은 모집인원만 · 실기 과목과 채점 기준은 모집요강 원문을 옮겨 상세에 둬요',
  '예체능 실기': '미술 · 디자인 · 음악 · 연극영화 · 무용 모집단위, 실기가 있는 전형은 모집인원만',
  계약학과: '전형계획 원문에 졸업 뒤 채용 또는 의무 복무 조건이 적힌 계약학과(반도체 · 군 · 그 밖), 재직자 재교육형 제외',
  자유전공: '자유전공 · 무전공 · 전공자율선택 모집단위',
  특수목적대: '사관학교 · 경찰대학 등',
};
export const PRACTICAL_TRACKS: readonly TrackId[] = ['체육', '예체능 실기'];
export const FACT_TAGS = ['채용 조건형', '의무 복무 조건', '특수법 설립', '초등교원 양성'] as const;
export type FactTag = typeof FACT_TAGS[number];
export type ResultType = '교과' | '종합';
export type SortKey = '가나다' | '모집';
export const RESULT_YEAR = 2026, PLAN_YEAR = 2028;
export const defaultType = (t: TrackId): ResultType => t === '과기원' ? '종합' : '교과';

/** 2028 전형계획(시행계획) 한 줄. practical = 전형요소에 실기가 있음(type 실기면 항상). minimum null = 원문에 없음. */
export interface PlanLine { name: string; type: '교과' | '종합' | '논술' | '실기'; quota: number; minimum: boolean | null; practical?: boolean }
export interface TrackRow {
  university: string; unit: string; track: TrackId; sub?: string; tag?: FactTag; evidence: string;
  approvals: Approval[]; reviewed_at: string; plan: PlanLine[]; apply_period?: string; is_new?: boolean;
}
export type Criteria = { columns: string[]; rows: string[][] } | { text: string };
export interface Subject { name: string; measure: string; points: string; criteria: Criteria; note?: string }
export interface Practical {
  university: string; unit: string; year: number; program: string; quota: number; ratio: string;
  source_label: string; source_page: string; source_url: string; approvals: Approval[]; reviewed_at: string; subjects: Subject[];
}
export interface TracksData { base_date: string; mapping_reviewed_at: string; rows: TrackRow[]; pending: Partial<Record<TrackId, number>>; practical: Practical[] }
export const EMPTY_TRACKS: TracksData = { base_date: '', mapping_reviewed_at: '', rows: [], pending: {}, practical: [] };

const text = (v: unknown): v is string => typeof v === 'string' && v.trim() !== '';
const date = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
const approved = (a: unknown) => Array.isArray(a) && new Set(a.map(x => text(x?.reviewer) ? x.reviewer.trim() : null).filter(Boolean)).size >= REQUIRED_APPROVALS && a.every(x => date(String(x?.at ?? '').slice(0, 10)));
const clean = (...v: unknown[]) => !forbiddenIn(v.filter(text).join(' ')).length;
const count = (v: unknown) => Number.isInteger(v) && (v as number) >= 0;
const planOk = (p: PlanLine) => text(p?.name) && ['교과', '종합', '논술', '실기'].includes(p.type) && count(p.quota) && (p.minimum === null || typeof p.minimum === 'boolean');
const criteriaOk = (c: Criteria) => 'text' in (c ?? {}) ? text((c as { text: string }).text)
  : Array.isArray((c as { columns: string[] })?.columns) && (c as { columns: string[] }).columns.length > 0 && (c as { columns: string[] }).columns.every(text)
    && Array.isArray((c as { rows: string[][] }).rows) && (c as { rows: string[][] }).rows.every(r => Array.isArray(r) && r.length === (c as { columns: string[] }).columns.length && r.every(x => typeof x === 'string'));

/** Trust boundary(public/data/special-tracks.json): 2인 검수 · 근거 · https 출처가 없으면 버려서 화면은 "준비 중"이 된다. */
export function parseTracks(value: unknown): TracksData {
  const f = value as { format?: string; version?: number; base_date?: string; mapping?: { reviewed_at?: string; rows?: TrackRow[]; pending?: Record<string, number> }; practical?: Practical[] };
  if (f?.format !== 'jinhak-navi-special-tracks' || f.version !== 1) return EMPTY_TRACKS;
  const m = f.mapping, ids = TRACKS.map(t => t.id) as string[];
  const rows = (Array.isArray(m?.rows) ? m!.rows : []).filter(r => text(r?.university) && text(r.unit) && ids.includes(r.track)
    && (r.sub === undefined || (trackOf(r.track).subs as readonly string[]).includes(r.sub)) && (r.tag === undefined || FACT_TAGS.includes(r.tag))
    && text(r.evidence) && approved(r.approvals) && date(r.reviewed_at) && Array.isArray(r.plan) && r.plan.every(planOk) && clean(r.evidence, r.apply_period));
  const pending: Partial<Record<TrackId, number>> = {};
  // 2028 전형계획 줄이 없는 모집단위는 행으로 그리지 않고 준비 중으로 센다(spec 4절 "전형계획이 등록된 것")
  for (const r of rows.filter(r => !r.plan.length)) pending[r.track] = (pending[r.track] ?? 0) + 1;
  for (const [k, n] of Object.entries(m?.pending ?? {})) if (ids.includes(k) && count(n)) pending[k as TrackId] = (pending[k as TrackId] ?? 0) + n;
  const practical = (Array.isArray(f.practical) ? f.practical : []).filter(p => text(p?.university) && text(p.unit) && p.year === PLAN_YEAR && text(p.program) && count(p.quota)
    && text(p.ratio) && text(p.source_label) && text(p.source_page) && https(p.source_url) && approved(p.approvals) && date(p.reviewed_at)
    && Array.isArray(p.subjects) && p.subjects.length > 0 && p.subjects.every(s => text(s?.name) && typeof s.measure === 'string' && typeof s.points === 'string' && criteriaOk(s.criteria))
    && clean(p.ratio, ...p.subjects.flatMap(s => [s.name, s.measure, s.note, 'text' in s.criteria ? s.criteria.text : ''])));
  return { base_date: date(f.base_date) ? f.base_date : '', mapping_reviewed_at: date(m?.reviewed_at) ? m!.reviewed_at! : '', rows: rows.filter(r => r.plan.length), pending, practical };
}

export type BlankText = '미공개' | '다른 기준' | '신설' | '실기 전형' | '—';
/** 입결 칸(D6 · D8 · D14 · D15 · D19). row = 경쟁률 · 충원율 · 기준을 가져올 공개 입결 행. */
export type Cell = { cut: number; row: ResultRow } | { text: BlankText; row?: ResultRow };
const hasPractical = (r: ResultRow) => /실기/.test(`${r.admission_type} ${r.program}`);
const nonPractical = (p: PlanLine) => p.type !== '실기' && !p.practical;

export function resultCell(units: readonly ReleasedUnit[], row: TrackRow, type: ResultType): Cell {
  if (!row.plan.some(p => p.type === type && nonPractical(p))) return { text: row.plan.every(p => !nonPractical(p)) ? '실기 전형' : '—' };
  if (row.is_new) return { text: '신설' };
  const found = units.filter(u => u.university === row.university).flatMap(u => u.rows)
    .filter(r => r.recruit_unit === row.unit && r.round === '수시' && Number(r.result_year) === RESULT_YEAR && typeTab(r) === type && !hasPractical(r));
  if (!found.length) return { text: '미공개' };
  const best = found.reduce((a, b) => (Number(b.quota) || 0) > (Number(a.quota) || 0) ? b : a); // D19 모집인원이 가장 많은 전형
  if (best.cut_70 === '') return { text: '미공개', row: best };
  const cut = Number(best.cut_70);
  if (best.metric !== '교과등급' || best.grade_system !== '9' || !(cut >= 1 && cut <= 9)) return { text: '다른 기준', row: best };
  return { cut, row: best };
}
export const cellText = (c: Cell) => 'cut' in c ? (Number.isInteger(c.cut) ? c.cut.toFixed(1) : String(c.cut)) : c.text;
export const planTotal = (r: TrackRow) => r.plan.reduce((s, p) => s + p.quota, 0);
/** "교과 10 · 종합 12 · 논술 5" — 같은 유형 전형은 더한다(공개 원문 모집인원 합, 새 숫자 아님). */
export function planSummary(r: TrackRow) {
  const by = new Map<string, number>();
  for (const p of r.plan) by.set(p.type, (by.get(p.type) ?? 0) + p.quota);
  return ['교과', '종합', '논술', '실기'].filter(t => by.has(t)).map(t => `${t} ${by.get(t)}`).join(' · ');
}

export interface ViewRow { row: TrackRow; cell: Cell; total: number; others: TrackId[]; practical: Practical[] }
export type TrackView =
  | { status: 'pending' }
  | { status: 'ok' | 'empty'; rows: ViewRow[]; universities: number; pending: number; candidates: number; typeInPlan: boolean };

export const universitiesIn = (data: TracksData, track: TrackId) => new Set(data.rows.filter(r => r.track === track).map(r => r.university)).size;
export const subCount = (data: TracksData, track: TrackId, sub: string) => data.rows.filter(r => r.track === track && r.sub === sub).length;

const byName = (a: TrackRow, b: TrackRow) => a.university.localeCompare(b.university, 'ko') || a.unit.localeCompare(b.unit, 'ko');
export function sortRows(rows: ViewRow[], sort: SortKey) {
  return [...rows].sort((a, b) => (sort === '모집' ? b.total - a.total : 0) || byName(a.row, b.row));
}

export function trackView(data: TracksData, units: readonly ReleasedUnit[], track: TrackId, sub: string | null, type: ResultType, sort: SortKey): TrackView {
  const inTrack = data.rows.filter(r => r.track === track);
  if (!inTrack.length) return { status: 'pending' };
  const picked = inTrack.filter(r => !sub || r.sub === sub);
  const rows = sortRows(picked.map(r => ({
    row: r, cell: resultCell(units, r, type), total: planTotal(r),
    others: [...new Set(data.rows.filter(o => o.track !== track && o.university === r.university && o.unit === r.unit).map(o => o.track))],
    practical: data.practical.filter(p => p.university === r.university && p.unit === r.unit),
  })), sort);
  const pending = sub ? 0 : data.pending[track] ?? 0;
  return {
    status: rows.some(v => v.cell.row) ? 'ok' : 'empty', rows, pending, candidates: rows.length + pending,
    universities: new Set(rows.map(v => v.row.university)).size, typeInPlan: picked.some(r => r.plan.some(p => p.type === type)),
  };
}
