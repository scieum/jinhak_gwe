// 대학 상세 위키(work/univ-detail-wiki/02-spec.md). 관리자 2명이 검수한 공식 문서 요약과 학과 계열표만 화면에 보인다.
import { REQUIRED_APPROVALS, type Approval, type ReleasedUnit } from './resultReview';
import { typeTab } from './resultBrowse';

export const WIKI_SECTIONS = [
  { key: 'notes', title: '올해 특이점' },
  { key: 'changes', title: '전년 대비 바뀐 점' },
  { key: 'programs', title: '2028 전형 목록' },
  { key: 'method', title: '전형별 반영 방법' },
  { key: 'minimum', title: '수능 최저' },
  { key: 'elements', title: '전형요소' },
] as const;
export type WikiSectionKey = typeof WIKI_SECTIONS[number]['key'];
export interface WikiItem { heading?: string; text: string; source_label: string; source_url: string }
export interface WikiSection { reviewed_at: string; approvals: Approval[]; items: WikiItem[] }
export interface FieldRow { university: string; unit: string; small: string; mid: string }
export interface WikiFile {
  format: 'jinhak-navi-univ-wiki'; version: 1;
  fields: { reviewed_at: string; approvals: Approval[]; rows: FieldRow[] };
  entries: { university: string; sections: Partial<Record<WikiSectionKey, WikiSection>> }[];
}
export interface Wiki { sections: Map<string, Partial<Record<WikiSectionKey, WikiSection>>>; fields: FieldRow[] }

const text = (v: unknown) => typeof v === 'string' && v.trim() !== '';
const date = (v: unknown) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
const https = (v: unknown) => { try { return typeof v === 'string' && new URL(v).protocol === 'https:'; } catch { return false; } };
const approved = (a: unknown) => Array.isArray(a) && new Set(a.map(x => text(x?.reviewer) ? x.reviewer : null).filter(Boolean)).size >= REQUIRED_APPROVALS;
const sectionOk = (s: WikiSection | undefined) => !!s && date(s.reviewed_at) && approved(s.approvals) && Array.isArray(s.items) && s.items.length > 0
  && s.items.every(i => text(i?.text) && text(i?.source_label) && https(i?.source_url) && (i.heading === undefined || text(i.heading)));

/** Trust boundary: anything not reviewed by two admins is dropped, so the screen shows "준비 중". */
export function parseWiki(value: unknown): Wiki {
  const file = value as WikiFile, wiki: Wiki = { sections: new Map(), fields: [] };
  if (file?.format !== 'jinhak-navi-univ-wiki' || file.version !== 1) return wiki;
  const f = file.fields;
  if (f && date(f.reviewed_at) && approved(f.approvals) && Array.isArray(f.rows))
    wiki.fields = f.rows.filter(r => text(r?.university) && text(r?.unit) && text(r?.small) && text(r?.mid));
  for (const e of Array.isArray(file.entries) ? file.entries : []) {
    if (!text(e?.university) || !e.sections || typeof e.sections !== 'object') continue;
    const kept: Partial<Record<WikiSectionKey, WikiSection>> = {};
    for (const { key } of WIKI_SECTIONS) if (sectionOk(e.sections[key])) kept[key] = e.sections[key];
    wiki.sections.set(e.university, kept);
  }
  return wiki;
}

export interface SimilarRow { university: string; unit: string; program: string; cut: number; diff: number; relation: '같은 계열' | '관련 계열' }
export interface Department { unit: string; program: string; type: '교과' | '종합'; cut: number | null; year: number | null }
export type Similar =
  | { status: 'pending'; reason: string }
  | { status: 'short' | 'ok'; base: Department & { cut: number; year: number }; rows: SimilarRow[]; outside: SimilarRow[] };

export const SIMILAR_RANGE = 0.5, SIMILAR_MIN = 3, SIMILAR_MAX = 5;
const round1 = (x: number) => Math.round(x * 10) / 10;

/** 9등급 교과등급 70% 컷이 있는 교과·종합 모집단위. 같은 모집단위가 여러 해면 가장 최근 해. */
function departments(units: readonly ReleasedUnit[], university: string | null) {
  const map = new Map<string, Department & { university: string }>();
  for (const u of units) {
    if (university !== null && u.university !== university) continue;
    for (const r of u.rows) {
      const type = typeTab(r);
      if (r.round !== '수시' || (type !== '교과' && type !== '종합') || !r.recruit_unit.trim()) continue;
      const key = `${u.university}|${r.recruit_unit}|${type}`, cut = r.cut_70 === '' ? NaN : Number(r.cut_70), year = Number(r.result_year);
      const ok = r.metric === '교과등급' && r.grade_system !== '5' && cut >= 1 && cut <= 9;
      const old = map.get(key);
      if (!old) map.set(key, { university: u.university, unit: r.recruit_unit, program: r.program, type, cut: ok ? cut : null, year: ok ? year : null });
      else if (ok && (old.year === null || year > old.year)) Object.assign(old, { program: r.program, cut, year });
    }
  }
  return [...map.values()];
}
export const departmentsOf = (units: readonly ReleasedUnit[], university: string): Department[] =>
  departments(units, university).sort((a, b) => a.unit.localeCompare(b.unit, 'ko') || a.type.localeCompare(b.type, 'ko'));

/** spec 4절: 같은 전형 유형 × 같은/관련 계열 × 다른 대학 × 같은 해 공개 입결, |차이| ≤ 0.5, 차이 작은 순 → 가나다, 최대 5개. */
export function similarUniversities(units: readonly ReleasedUnit[], fields: readonly FieldRow[], university: string, base: Department): Similar {
  if (base.cut === null || base.year === null) return { status: 'pending', reason: '이 학과의 공개 입결(9등급 교과 70% 컷)이 아직 없어요' };
  const field = fields.find(f => f.university === university && f.unit === base.unit);
  if (!field) return { status: 'pending', reason: '이 학과의 계열이 아직 검수되지 않았어요' };
  const all: SimilarRow[] = [];
  for (const d of departments(units, null)) {
    if (d.university === university || d.type !== base.type || d.year !== base.year || d.cut === null) continue;
    const f = fields.find(x => x.university === d.university && x.unit === d.unit);
    const relation = !f ? null : f.small === field.small ? '같은 계열' : f.mid === field.mid ? '관련 계열' : null;
    if (relation) all.push({ university: d.university, unit: d.unit, program: d.program, cut: d.cut, diff: round1(d.cut - base.cut), relation });
  }
  all.sort((a, b) => Math.abs(a.diff) - Math.abs(b.diff) || a.university.localeCompare(b.university, 'ko') || a.unit.localeCompare(b.unit, 'ko'));
  const inside = all.filter(r => Math.abs(r.diff) <= SIMILAR_RANGE), outside = all.filter(r => Math.abs(r.diff) > SIMILAR_RANGE);
  const b = { ...base, cut: base.cut, year: base.year };
  return inside.length < SIMILAR_MIN ? { status: 'short', base: b, rows: inside, outside } : { status: 'ok', base: b, rows: inside.slice(0, SIMILAR_MAX), outside };
}
export const signed = (x: number) => (x > 0 ? `+${x.toFixed(1)}` : x < 0 ? `−${Math.abs(x).toFixed(1)}` : '0.0');
