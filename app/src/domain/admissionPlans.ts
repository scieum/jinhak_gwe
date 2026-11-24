// Reference-only catalog. Never pass these draft summaries to the scoring engine.
import { universitySearchLabels } from './universityIdentity';
export interface PlanDocument {
  id: string; label: string; provider: 'university' | 'adiga'; source_url: string; download_url: string;
  format: 'pdf' | 'hwp' | 'hwpx' | 'zip'; sha256: string; checked_at: string;
  page_count: number | null; filename: string; year_check: 'visual' | 'text' | 'filename' | 'portal';
  topics: { label: string; pages: number[] }[]; note: string;
}
export interface PlanProgram {
  name: string; round: string; type: string; quota: string; method: string; minimum: string;
  eligibility: string; pages: number[]; document_id: string;
  interview?: string; scope?: string;
  field_pages?: Record<'method' | 'minimum' | 'eligibility' | 'interview', number[]>;
}
export interface AdmissionPlan {
  id: string; university: string; campus: string; region: string; year: number; review_status: 'draft';
  documents: PlanDocument[]; notices: { title: string; url: string; checked_at: string; change_notice: boolean }[];
  programs: PlanProgram[];
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
      for (const item of d.topics) { const t = record(item); strings(t, ['label']); requireValue(d.format === 'pdf'); pages(t.pages, d.page_count); }
    }
    for (const item of e.programs) {
      const p = record(item); strings(p, ['name', 'round', 'type', 'quota', 'method', 'minimum', 'eligibility', 'document_id']);
      const d = docs.get(String(p.document_id)); requireValue(d?.format === 'pdf'); pages(p.pages, d.page_count);
      if (p.interview !== undefined) strings(p, ['interview']);
      if (p.scope !== undefined) strings(p, ['scope']);
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
export function planPageUrl(doc: PlanDocument, page: number) {
  if (doc.format !== 'pdf' || !doc.page_count || !Number.isInteger(page) || page < 1 || page > doc.page_count) return doc.download_url;
  const result = new URL(doc.download_url); result.hash = `page=${page}`; return result.href;
}
