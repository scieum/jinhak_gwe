// 대학 지도(work/univ-map/02-spec.md). 공개 파일의 캠퍼스 위치를 거르고 · 세고 · 묶기만 한다.
// 거리 · 통학 시간 · 순위 · 입결 · 환산 계산 없음(spec 4장, NEVER-1). 화면 숫자는 개수뿐이다.
import { SIDO } from './auth';
import { forbiddenIn } from './univWiki';
import type { Sido } from '../assets/map/sido';

export const FOUNDINGS = ['국립', '공립', '사립', '특별법 법인'] as const;
export const KINDS = ['일반대학', '교육대학', '산업대학', '특별법 대학'] as const; // D16 4년제 범위
export type Founding = typeof FOUNDINGS[number];
export type Kind = typeof KINDS[number];
export const SHORT: Record<Sido, string> = {
  서울특별시: '서울', 부산광역시: '부산', 대구광역시: '대구', 인천광역시: '인천', 광주광역시: '광주', 대전광역시: '대전', 울산광역시: '울산', 세종특별자치시: '세종',
  경기도: '경기', 강원특별자치도: '강원', 충청북도: '충북', 충청남도: '충남', 전북특별자치도: '전북', 전라남도: '전남', 경상북도: '경북', 경상남도: '경남', 제주특별자치도: '제주',
};

/** 4-1 대학 위치 표 한 행 = 캠퍼스 위치 하나(검수 완료분만 남긴다). */
export interface Campus {
  id: string; univ_id: string; name: string; campus: string; campus_type: '본교' | '분교';
  school_kind: Kind; founding: Founding; sido: Sido; sigungu: string; address: string; lat: number; lng: number;
  aliases?: string[]; source_url?: string; campus_source_url?: string;
}
export interface UnivMapData { base_date: string; list_source: string; list_as_of: string; reviewed_at: string; campuses: Campus[]; pending: Partial<Record<Sido, number>>; provenance?: 'official-published'; source_url?: string; coordinate_source?: string }
export const EMPTY_MAP: UnivMapData = { base_date: '', list_source: '', list_as_of: '', reviewed_at: '', campuses: [], pending: {} };

const text = (v: unknown): v is string => typeof v === 'string' && v.trim() !== '';
const date = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
const isSido = (v: unknown): v is Sido => (SIDO as readonly unknown[]).includes(v);
// 남한 본토 · 제주 · 울릉 범위 밖 좌표는 잘못 바꾼 좌표로 보고 버린다
const inKorea = (lat: unknown, lng: unknown) => typeof lat === 'number' && typeof lng === 'number' && lat >= 33 && lat <= 38.7 && lng >= 124.5 && lng <= 131;
type Row = Partial<Campus> & { campus_id?: string; source_school_code?: string; source_as_of?: string; reviewer_1?: string; reviewer_2?: string; reviewed_at?: string; review_status?: string };
const verified = (r: Row) => r.review_status === 'verified' && text(r.reviewer_1) && text(r.reviewer_2) && r.reviewer_1.trim() !== r.reviewer_2.trim() && date(r.reviewed_at);
const MOE_SOURCE = 'https://www.data.go.kr/data/15138981/fileData.do';
const httpsUrl = (v: unknown): v is string => {
  if (!text(v)) return false;
  try { const u = new URL(v); return u.protocol === 'https:' && !u.username && !u.password; } catch { return false; }
};
const sourced = (r: Row) => r.review_status === 'source-published' && text(r.campus_id) && /^[a-zA-Z0-9-]+$/.test(r.campus_id)
  && date(r.source_as_of) && text(r.address)
  && ((r.source_url === MOE_SOURCE && text(r.source_school_code))
    || (r.campus_id === 'campus-police-asan' && r.source_url === 'https://findby.co.kr/details/31539-442004559821-st-652befd74e0223ae180452ee'
      && r.campus_source_url === 'https://police.ac.kr/police/police/html/intro/camp/map.do?mdex=police35'));

/** v1: 기존 2인 검수 자료. v2: 출처가 명시된 교육부 공개 좌표·캠퍼스 대조 자료. 두 경로의 검수 상태를 섞지 않는다. */
export function parseUnivMap(value: unknown): UnivMapData {
  const f = value as { format?: string; version?: number; base_date?: string; list_source?: string; list_as_of?: string; reviewed_at?: string; campuses?: Row[]; provenance?: string; source_url?: string; source_sha256?: string; coordinate_source?: string };
  const official = f?.version === 2 && f.provenance === 'official-published' && f.source_url === MOE_SOURCE
    && typeof f.source_sha256 === 'string' && /^[a-f0-9]{64}$/.test(f.source_sha256) && date(f.list_as_of) && date(f.base_date);
  if (f?.format !== 'jinhak-navi-univ-map' || (f.version !== 1 && !official) || !Array.isArray(f.campuses)) return EMPTY_MAP;
  const campuses: Campus[] = [], pending: Partial<Record<Sido, number>> = {}, seen = new Set<string>();
  for (const r of f.campuses) {
    if (!r || !isSido(r.sido) || !(KINDS as readonly unknown[]).includes(r.school_kind)) continue;
    const ok = (official ? sourced(r) : verified(r)) && text(r.univ_id) && text(r.name) && text(r.campus) && (r.campus_type === '본교' || r.campus_type === '분교')
      && (FOUNDINGS as readonly unknown[]).includes(r.founding) && text(r.sigungu) && inKorea(r.lat, r.lng) && !forbiddenIn(`${r.name} ${r.campus}`).length;
    const id = official && text(r.campus_id) ? r.campus_id : `${r.univ_id}|${r.campus}`.replace(/\s/g, '');
    if (seen.has(id)) continue; // 같은 캠퍼스 중복 행
    if (!ok) { pending[r.sido] = (pending[r.sido] ?? 0) + 1; continue; } // 검수 전 · 값 오류 = 위치 확인 중(이름 없이 개수만)
    seen.add(id);
    campuses.push({ id, univ_id: r.univ_id!, name: r.name!.trim(), campus: r.campus!.trim(), campus_type: r.campus_type!, school_kind: r.school_kind!, founding: r.founding!,
      sido: r.sido, sigungu: r.sigungu!.trim(), address: text(r.address) ? r.address : '', lat: r.lat!, lng: r.lng!,
      aliases: Array.isArray(r.aliases) ? r.aliases.filter(text) : [], source_url: httpsUrl(r.source_url) ? r.source_url : undefined,
      campus_source_url: httpsUrl(r.campus_source_url) ? r.campus_source_url : undefined });
  }
  return { base_date: date(f.base_date) ? f.base_date : '', list_source: text(f.list_source) ? f.list_source : '', list_as_of: date(f.list_as_of) ? f.list_as_of : '',
    reviewed_at: official ? '' : date(f.reviewed_at) ? f.reviewed_at : '', campuses, pending,
    ...(official ? { provenance: 'official-published' as const, source_url: MOE_SOURCE, coordinate_source: text(f.coordinate_source) ? f.coordinate_source : '교육부 공개 좌표' } : {}) };
}

export interface Filters { founding: Founding | null; mainOnly: boolean; kind: Kind | null }
export const NO_FILTERS: Filters = { founding: null, mainOnly: false, kind: null };
export const filtersOn = (f: Filters) => !!f.founding || f.mainOnly || !!f.kind;
export const applyFilters = (list: readonly Campus[], f: Filters) =>
  list.filter(c => (!f.founding || c.founding === f.founding) && (!f.mainOnly || c.campus_type === '본교') && (!f.kind || c.school_kind === f.kind));
/** D17: 대학 이름만, 2글자부터. */
export const searchCampuses = (list: readonly Campus[], q: string) => {
  const t = q.replace(/\s/g, '');
  return t.length < 2 ? [] : sortCampuses(list.filter(c => [c.name, ...(c.aliases ?? [])].some(n => n.replace(/\s/g, '').includes(t))), '가나다');
};
export function countBySido(list: readonly Campus[]) {
  const n = Object.fromEntries(SIDO.map(s => [s, 0])) as Record<Sido, number>;
  for (const c of list) n[c.sido]++;
  return n;
}

export type SortKey = '시도' | '가나다' | '시군';
const ko = (a: string, b: string) => a.localeCompare(b, 'ko');
/** 사실 순서만(D19 · 4장): 시·도(SIDO 순) → 대학 → 캠퍼스, 또는 가나다 / 시·군 → 대학. */
export function sortCampuses(list: readonly Campus[], sort: SortKey) {
  const byName = (a: Campus, b: Campus) => ko(a.name, b.name) || ko(a.campus, b.campus);
  return [...list].sort((a, b) => (sort === '시도' ? SIDO.indexOf(a.sido) - SIDO.indexOf(b.sido) : sort === '시군' ? ko(a.sigungu, b.sigungu) : 0) || byName(a, b));
}

export interface PinPoint { id: string; x: number; y: number }
export interface PinGroup { ids: string[]; x: number; y: number }
/** spec 4장 묶음 핀: 화면 거리 radius(px) 안으로 이어지는 핀끼리 묶는다(단일 연결). scale = 지도 단위 1당 화면 px. 선택된 핀은 묶지 않는다. */
export function clusterPins(points: readonly PinPoint[], scale: number, selected: string | null = null, radius = 24): PinGroup[] {
  const rest = points.filter(p => p.id !== selected), done = new Set<string>(), out: PinGroup[] = [];
  const near = (a: PinPoint, b: PinPoint) => Math.hypot(a.x - b.x, a.y - b.y) * scale < radius;
  for (const seed of rest) {
    if (done.has(seed.id)) continue;
    const group = [seed]; done.add(seed.id);
    for (let i = 0; i < group.length; i++) for (const p of rest) if (!done.has(p.id) && near(group[i], p)) { group.push(p); done.add(p.id); }
    out.push({ ids: group.map(p => p.id), x: group.reduce((s, p) => s + p.x, 0) / group.length, y: group.reduce((s, p) => s + p.y, 0) / group.length });
  }
  const sel = points.find(p => p.id === selected);
  return sel ? [...out, { ids: [sel.id], x: sel.x, y: sel.y }] : out;
}

/** 묶음 이름 "원주시 부근": 묶음 안에 가장 많은 시·군(같으면 가나다 앞). */
export function clusterPlace(list: readonly Campus[]) {
  const n = new Map<string, number>();
  for (const c of list) n.set(c.sigungu, (n.get(c.sigungu) ?? 0) + 1);
  return [...n].sort((a, b) => b[1] - a[1] || ko(a[0], b[0]))[0]?.[0] ?? '';
}
