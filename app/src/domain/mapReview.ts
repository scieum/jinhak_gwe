// 대학 위치(univ-map) 검수. 캠퍼스 행마다 관리자 2명이 승인한 것만 univ-map.json에 들어간다(NEVER-1: 승인 전 행은 공개 파일에 넣지 않는다).
import { SIDO } from './auth';
import { REQUIRED_APPROVALS, type Approval } from './resultReview';
import { FOUNDINGS, KINDS, parseUnivMap } from './univMap';
import { forbiddenIn } from './univWiki';
import type { FieldStatus } from './fieldReview';

/** 고칠 수 있는 칸. 숫자 칸은 비어 있으면 null. */
export interface MapFields { name: string; campus: string; campus_type: string; school_kind: string; founding: string; sido: string; sigungu: string; address: string; lat: number | null; lng: number | null }
/** key = 초안을 불러올 때 정한 univ_id|캠퍼스(캠퍼스 이름을 고쳐도 바뀌지 않는다). */
export interface MapDraft extends MapFields { key: string; univ_id: string; draft_basis: string; approvals: Approval[]; updated_at: string }

export const mapStatus = (d: MapDraft): FieldStatus =>
  d.approvals.length >= REQUIRED_APPROVALS ? '검수 완료' : d.approvals.length === 1 ? '1인 승인' : '검수 대기';
const str = (v: unknown) => typeof v === 'string' ? v.trim() : '';
const num = (v: unknown) => typeof v === 'number' && Number.isFinite(v) ? v : null;
const fieldsOf = (r: Partial<Record<keyof MapFields, unknown>>): MapFields => ({ name: str(r.name), campus: str(r.campus), campus_type: str(r.campus_type), school_kind: str(r.school_kind),
  founding: str(r.founding), sido: str(r.sido), sigungu: str(r.sigungu), address: str(r.address), lat: num(r.lat), lng: num(r.lng) });
const sameFields = (a: MapFields, b: MapFields) => JSON.stringify(fieldsOf(a)) === JSON.stringify(fieldsOf(b));
const at = (d: Pick<MapDraft, 'name' | 'campus'>) => `${d.name || '대학 없음'} ${d.campus}`.trim();

/** work/_data/review-queue/univ-map-draft.json(또는 같은 형식) → 검수 행. 승인·검수자 칸은 읽지 않는다(새로 받는다). */
export function parseMapDraft(value: unknown): MapDraft[] {
  const f = value as { format?: string; campuses?: unknown };
  if (f?.format !== 'jinhak-navi-univ-map' || !Array.isArray(f.campuses)) throw new Error('대학 위치 파일(jinhak-navi-univ-map)이 아니에요.');
  const out = new Map<string, MapDraft>();
  for (const r of f.campuses as Record<string, unknown>[]) {
    const univ_id = str(r?.univ_id);
    if (!univ_id) continue;
    const key = `${univ_id}|${str(r.campus)}`;
    if (!out.has(key)) out.set(key, { key, univ_id, draft_basis: str(r.draft_basis), ...fieldsOf(r), approvals: [], updated_at: '' });
  }
  return [...out.values()].sort((a, b) => a.name.localeCompare(b.name, 'ko') || a.campus.localeCompare(b.campus, 'ko'));
}

/** 승인을 막는 문제. 공개 화면 로더(parseUnivMap)가 받지 않을 행은 승인할 수 없다. */
export function mapProblems(d: MapDraft, all: readonly MapDraft[] = []): string[] {
  const out: string[] = [];
  const empty = ([['name', '대학'], ['campus', '캠퍼스'], ['sigungu', '시·군·구']] as const).filter(([k]) => !d[k]).map(([, l]) => l);
  if (empty.length) out.push(`${at(d)}: ${empty.join('·')}이 비어 있어요`);
  if (d.campus_type !== '본교' && d.campus_type !== '분교') out.push(`${at(d)}: 본교·분교를 골라 주세요`);
  if (!(KINDS as readonly string[]).includes(d.school_kind)) out.push(`${at(d)}: 학교 종류를 골라 주세요`);
  if (!(FOUNDINGS as readonly string[]).includes(d.founding)) out.push(`${at(d)}: 설립 구분을 골라 주세요`);
  if (!(SIDO as readonly string[]).includes(d.sido)) out.push(`${at(d)}: 시·도를 골라 주세요`);
  if (d.lat === null || d.lng === null) out.push(`${at(d)}: 위도·경도가 비어 있어요`);
  for (const w of forbiddenIn(`${d.name} ${d.campus}`)) out.push(`${at(d)}: 쓸 수 없는 표현 ‘${w}’이 있어요`);
  const id = `${d.univ_id}|${d.campus}`.replace(/\s/g, '');
  if (all.some(o => o.key !== d.key && `${o.univ_id}|${o.campus}`.replace(/\s/g, '') === id)) out.push(`${at(d)}: 같은 캠퍼스가 두 번 있어요`);
  // 좌표 범위 등 남은 규칙은 공개 화면 로더에 그대로 넣어 본다(규칙을 두 곳에 두지 않으려고)
  if (!out.length && parseUnivMap(fileOf([verifiedRow({ ...d, approvals: [{ reviewer: 'a', at: '2000-01-01T00:00:00Z' }, { reviewer: 'b', at: '2000-01-01T00:00:00Z' }] })], {})).campuses.length !== 1)
    out.push(`${at(d)}: 위도·경도가 우리나라 범위 밖이에요`);
  return out;
}

/** 칸을 고치면 그 행의 승인은 지운다(다시 검수). */
export function editMap(d: MapDraft, patch: Partial<MapFields>, now = new Date()): MapDraft {
  const next = { ...d, ...fieldsOf({ ...d, ...patch }) };
  return sameFields(next, d) ? d : { ...next, approvals: [], updated_at: now.toISOString() };
}

export function approveMap(d: MapDraft, reviewer: string, all: readonly MapDraft[] = [], now = new Date()): MapDraft {
  const name = reviewer.trim();
  if (!name) throw new Error('검수자 이름을 먼저 적어 주세요.');
  const problems = mapProblems(d, all);
  if (problems.length) throw new Error(`${problems[0]} · 고친 뒤 승인해 주세요.`);
  if (d.approvals.some(a => a.reviewer === name)) throw new Error('이미 승인했어요. 다른 검수자가 확인해야 해요.');
  if (mapStatus(d) === '검수 완료') throw new Error('이미 검수가 끝났어요.');
  return { ...d, approvals: [...d.approvals, { reviewer: name, at: now.toISOString() }], updated_at: now.toISOString() };
}

export const mapRecordFile = (drafts: readonly MapDraft[]) => ({ format: 'jinhak-navi-map-review', drafts });
/** 다른 검수자의 기록. 칸이 같으면 승인을 합치고, 칸이 다른 행은 conflicts로 돌려 화면이 덮어쓸지 묻는다. */
export function mergeMapRecords(local: ReadonlyMap<string, MapDraft>, incoming: unknown) {
  const f = incoming as { format?: string; drafts?: unknown };
  if (f?.format !== 'jinhak-navi-map-review' || !Array.isArray(f.drafts)) throw new Error('대학 위치 검수 기록 파일이 아니에요.');
  const merged: MapDraft[] = [], conflicts: MapDraft[] = [];
  for (const raw of f.drafts as Record<string, unknown>[]) {
    if (!str(raw?.key) || !str(raw.univ_id) || !Array.isArray(raw.approvals)) continue;
    const approvals = (raw.approvals as Approval[]).filter(a => typeof a?.reviewer === 'string' && a.reviewer.trim() && typeof a?.at === 'string').map(a => ({ reviewer: a.reviewer, at: a.at }));
    const d: MapDraft = { key: str(raw.key), univ_id: str(raw.univ_id), draft_basis: str(raw.draft_basis), ...fieldsOf(raw), approvals: approvals.slice(0, REQUIRED_APPROVALS), updated_at: str(raw.updated_at) };
    const mine = local.get(d.key);
    if (!mine) merged.push(d);
    else if (!sameFields(mine, d)) conflicts.push(d);
    else {
      const all = [...mine.approvals];
      for (const a of d.approvals) if (!all.some(x => x.reviewer === a.reviewer)) all.push(a);
      merged.push({ ...mine, approvals: all.slice(0, REQUIRED_APPROVALS) });
    }
  }
  return { merged, conflicts };
}

const day = (iso: string) => new Date(iso).toLocaleDateString('sv-SE'); // 이 기기 날짜
function verifiedRow(d: MapDraft) {
  const [a, b] = d.approvals;
  return { univ_id: d.univ_id, name: d.name, campus: d.campus, campus_type: d.campus_type, school_kind: d.school_kind, founding: d.founding, sido: d.sido, sigungu: d.sigungu,
    address: d.address, lat: d.lat, lng: d.lng, review_status: 'verified', reviewer_1: a.reviewer, reviewer_2: b.reviewer, reviewed_at: day([a.at, b.at].sort()[1]) };
}
export interface MapMeta { base_date?: string; list_source?: string; list_as_of?: string }
const fileOf = (campuses: ReturnType<typeof verifiedRow>[], m: MapMeta) => ({ format: 'jinhak-navi-univ-map', version: 1, base_date: m.base_date?.trim() ?? '',
  list_source: m.list_source?.trim() ?? '', list_as_of: m.list_as_of?.trim() ?? '', reviewed_at: campuses.map(c => c.reviewed_at).sort().pop() ?? '', campuses });

/** 공개 파일 univ-map.json. 2명이 승인했고 지금도 문제가 없는 행만 넣는다 — 검수 전 행은 이름·개수 모두 넣지 않는다. */
export function buildMapFile(drafts: readonly MapDraft[], meta: MapMeta) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(meta.base_date?.trim() ?? '')) throw new Error('데이터 기준일을 2026-11-24처럼 적어 주세요.');
  if (!meta.list_source?.trim()) throw new Error('대학 목록 출처를 적어 주세요.');
  if (meta.list_as_of?.trim() && !/^\d{4}-\d{2}-\d{2}$/.test(meta.list_as_of.trim())) throw new Error('목록 기준일은 2026-11-24처럼 적어 주세요.');
  const done = drafts.filter(d => mapStatus(d) === '검수 완료' && !mapProblems(d, drafts).length);
  if (!done.length) throw new Error(`검수자 ${REQUIRED_APPROVALS}명이 승인한 캠퍼스가 아직 없어요.`);
  return fileOf(done.map(verifiedRow).sort((a, b) => a.name.localeCompare(b.name, 'ko') || a.campus.localeCompare(b.campus, 'ko')), meta);
}
