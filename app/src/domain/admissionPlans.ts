// Reference-only catalog. Never pass these draft summaries to the scoring engine.
import { universitySearchLabels } from './universityIdentity';
import type { Campus } from './univMap';
export type PlanFounding = '국립' | '공립' | '사립' | '그 밖';
/** 전형계획 계열 칩. build_admission_plan_programs.py FIELD_CHIPS가 계열표(검수 전 초안)를 이 이름으로 묶어요. */
export const PLAN_FIELDS = ['인문', '사회', '자연', '공학', '의약', '예체능'] as const;
export interface PlanDocument {
  id: string; label: string; provider: 'university' | 'adiga'; source_url: string; download_url: string;
  format: 'pdf' | 'hwp' | 'hwpx' | 'zip'; sha256: string; checked_at: string;
  page_count: number | null; filename: string; year_check: 'visual' | 'text' | 'filename' | 'portal';
  topics: { label: string; pages: number[] }[]; note: string;
  /** 우리 서버에 둔 같은 해시의 PDF 사본(app/public/plans, 배포 자료). 없으면 download_url 원래 링크 */
  local_file?: string;
}
export interface PlanProgram {
  name: string; round: string; type: string; quota: string; method: string; minimum: string;
  eligibility: string; pages: number[]; document_id: string;
  interview?: string; scope?: string;
  field_pages?: Record<'method' | 'minimum' | 'eligibility' | 'interview', number[]>;
  /** 수시 교과·종합만. [모집단위, 인원(숫자) 또는 원문 문구('약간 명' · '수시 미충원 시'), 근거 쪽] */
  units?: [string, number | string, number[]][];
  /** 공동선발 총원. 학과별로 나누거나 더하지 않는다 */
  pooled?: { quota: number; units: string[]; pages: number[] }[];
  /** units · pooled 모집단위 중 계열표와 대학+모집단위가 정확히 같은 것의 계열 칩(검수 전). 없으면 계열 정보 없음 */
  fields?: (typeof PLAN_FIELDS)[number][];
}
export interface AdmissionPlan {
  id: string; university: string; campus: string; region: string; year: number; review_status: 'draft';
  founding?: PlanFounding;
  documents: PlanDocument[]; notices: { title: string; url: string; checked_at: string; change_notice: boolean }[];
  programs: PlanProgram[];
}

/** 설립만 대학 지도 공개 목록에서 연결한다. 캠퍼스 분류는 시행계획의 원래 표기를 따른다. */
export function withPlanFoundings(catalog: PlanCatalog, campuses: readonly Campus[]): PlanCatalog {
  const names = new Map<string, Set<PlanFounding>>();
  const normalize = (name: string) => name.normalize('NFKC').replace(/\s/g, '');
  for (const campus of campuses) {
    const founding = campus.founding === '특별법 법인' ? '그 밖' : campus.founding;
    for (const name of [campus.name, ...campus.aliases ?? []]) {
      const key = normalize(name), values = names.get(key) ?? new Set<PlanFounding>();
      values.add(founding); names.set(key, values);
    }
  }
  return { ...catalog, entries: catalog.entries.map(plan => {
    const values = names.get(normalize(plan.university));
    return { ...plan, founding: values?.size === 1 ? [...values][0] : undefined };
  }) };
}
export function planCampusCategory(campus: string): '본교' | '분교' | '제2캠퍼스 이상' | undefined {
  if (campus === '본교' || campus === '분교') return campus;
  if (/^제(?:[2-9]|\d{2,})캠퍼스$/.test(campus)) return '제2캠퍼스 이상';
  return undefined;
}
export interface PlanCatalog {
  format: 'jinhak-navi-admission-plans'; version: 1; year: number; checked_at: string;
  review_status: 'draft'; entries: AdmissionPlan[];
}
function requireValue(value: unknown): asserts value { if (!value) throw new Error('전형계획 자료 형식을 확인해 주세요.'); }
function record(value: unknown): Record<string, unknown> {
  requireValue(value && typeof value === 'object' && !Array.isArray(value)); return value as Record<string, unknown>;
}
function strings(value: Record<string, unknown>, keys: string[]) { keys.forEach(key => requireValue(typeof value[key] === 'string' && String(value[key]).trim())); }
function date(value: unknown) { requireValue(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)); }
function url(value: unknown) {
  requireValue(typeof value === 'string');
  const parsed = new URL(value); requireValue(parsed.protocol === 'https:' && !parsed.username && !parsed.password);
}
function pages(value: unknown, total: unknown) {
  requireValue(Array.isArray(value) && value.length && Number.isInteger(total) && Number(total) > 0);
  requireValue(new Set(value).size === value.length && value.every(p => Number.isInteger(p) && p > 0 && p <= Number(total)));
}
export function parsePlanCatalog(input: unknown): PlanCatalog {
  const root = record(input);
  requireValue(root.format === 'jinhak-navi-admission-plans' && root.version === 1 && root.year === 2028 && root.review_status === 'draft');
  date(root.checked_at); requireValue(Array.isArray(root.entries) && root.entries.length);
  const ids = new Set<string>(), campuses = new Set<string>();
  for (const item of root.entries) {
    const e = record(item); strings(e, ['id', 'university', 'campus', 'region']);
    requireValue(e.year === root.year && e.review_status === 'draft');
    const key = `${e.university}|${e.campus}`;
    requireValue(!ids.has(String(e.id)) && !campuses.has(key)); ids.add(String(e.id)); campuses.add(key);
    requireValue(Array.isArray(e.documents) && e.documents.length && Array.isArray(e.programs) && Array.isArray(e.notices));
    const docs = new Map<string, Record<string, unknown>>();
    for (const item of e.documents) {
      const d = record(item); strings(d, ['id', 'label', 'sha256']);
      requireValue(!docs.has(String(d.id))); docs.set(String(d.id), d);
      requireValue(['university', 'adiga'].includes(String(d.provider)) && ['pdf', 'hwp', 'hwpx', 'zip'].includes(String(d.format)));
      requireValue(['visual', 'text', 'filename', 'portal'].includes(String(d.year_check)) && /^[a-f0-9]{64}$/.test(String(d.sha256)));
      requireValue(typeof d.filename === 'string' && typeof d.note === 'string');
      requireValue(d.page_count === null || (Number.isInteger(d.page_count) && Number(d.page_count) > 0));
      date(d.checked_at); url(d.source_url); url(d.download_url); requireValue(Array.isArray(d.topics));
      if (d.local_file !== undefined) requireValue(d.format === 'pdf' && typeof d.local_file === 'string' && /^plans\/2028_[^/\\]+\.pdf$/.test(d.local_file));
      for (const item of d.topics) { const t = record(item); strings(t, ['label']); requireValue(d.format === 'pdf'); pages(t.pages, d.page_count); }
    }
    for (const item of e.programs) {
      const p = record(item); strings(p, ['name', 'round', 'type', 'quota', 'method', 'minimum', 'eligibility', 'document_id']);
      const d = docs.get(String(p.document_id)); requireValue(d?.format === 'pdf'); pages(p.pages, d.page_count);
      if (p.interview !== undefined) strings(p, ['interview']);
      if (p.scope !== undefined) strings(p, ['scope']);
      if (p.units !== undefined) {
        requireValue(Array.isArray(p.units));
        for (const u of p.units) {
          requireValue(Array.isArray(u) && u.length === 3 && typeof u[0] === 'string' && u[0].trim());
          requireValue((Number.isInteger(u[1]) && u[1] >= 0) || (typeof u[1] === 'string' && u[1].trim())); pages(u[2], d.page_count);
        }
      }
      if (p.pooled !== undefined) {
        requireValue(Array.isArray(p.pooled));
        for (const item of p.pooled) {
          const q = record(item); requireValue(Number.isInteger(q.quota) && Number(q.quota) > 0 && Array.isArray(q.units) && q.units.length);
          requireValue((q.units as unknown[]).every(n => typeof n === 'string' && n.trim())); pages(q.pages, d.page_count);
        }
      }
      if (p.fields !== undefined) requireValue(Array.isArray(p.fields) && p.fields.length && p.fields.every(f => (PLAN_FIELDS as readonly unknown[]).includes(f)));
      if (p.field_pages !== undefined) {
        const fields = record(p.field_pages); strings(p, ['interview']);
        for (const key of ['method', 'minimum', 'eligibility', 'interview']) {
          pages(fields[key], d.page_count);
          requireValue((fields[key] as number[]).every(page => (p.pages as number[]).includes(page)));
        }
      }
    }
    for (const item of e.notices) { const n = record(item); strings(n, ['title']); url(n.url); date(n.checked_at); requireValue(typeof n.change_notice === 'boolean'); }
  }
  return input as PlanCatalog;
}
export function normalizePlanSearch(value: string) { return value.normalize('NFKC').toLowerCase().replace(/대학교/g, '대').replace(/^국립/, '').replace(/\s/g, ''); }
export function matchesPlan(plan: AdmissionPlan, query: string) {
  const haystack = normalizePlanSearch([...universitySearchLabels(plan.university), plan.campus, plan.region, ...plan.programs.map(p => p.name)].join(' '));
  return query.trim().split(/\s+/).every(term => haystack.includes(normalizePlanSearch(term)));
}
/** 내려받을 때 쓸 규칙 이름(우리 사본이 있을 때만). 다른 출처 링크에는 download 속성이 먹지 않아요 */
export const planFileName = (doc: PlanDocument) => doc.local_file?.slice('plans/'.length);
export function planFileUrl(doc: PlanDocument) {
  const name = planFileName(doc);
  return name ? `${import.meta.env.BASE_URL}plans/${encodeURIComponent(name)}` : doc.download_url;
}
export function planPageUrl(doc: PlanDocument, page: number) {
  if (doc.format !== 'pdf' || !doc.page_count || !Number.isInteger(page) || page < 1 || page > doc.page_count) return planFileUrl(doc);
  if (doc.local_file) return `${planFileUrl(doc)}#page=${page}`;
  const result = new URL(doc.download_url); result.hash = `page=${page}`; return result.href;
}
