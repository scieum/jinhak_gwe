import type { ApplicationPlan } from './planner';
import { currentUniversityName } from './universityIdentity';

// Reference metadata deliberately has no Criterion or executable scoring rule.
export interface MinimumEvidence { document_id: string; url: string; sha256: string; pages: number[]; checked_at: string }
export interface MinimumReferenceRule {
  id: string; source_pointer: string; applicability: 'required' | 'not_required' | 'conditional' | 'unspecified';
  sentences: string[]; evidence: MinimumEvidence;
}
export interface MinimumReferenceScope {
  program_id: string; program: string; round: string; unit_id: string; unit: string;
  scope_status: 'classified' | 'explicit_pending' | 'unclassified'; rule_ids: string[];
  pending: { reason: string; evidence: MinimumEvidence | null }[];
}
interface PackageIdentity { package_id: string; university: string; campus: string; admission_year: number; source_sha256: string }
interface DraftReference { version: 1; review_status: 'draft'; executable: false }
export interface MinimumReferenceEntry extends PackageIdentity { file: string; sha256: string; bytes: number; rules: number; rows: number }
export interface MinimumReferenceIndex extends DraftReference {
  format: 'unavi-minimum-reference-index'; prepared_at: string; source_sha256: string; entries: MinimumReferenceEntry[];
}
export interface MinimumReferencePackage extends PackageIdentity, DraftReference {
  format: 'unavi-minimum-reference-package'; rules: MinimumReferenceRule[]; rows: MinimumReferenceScope[];
}
export type MinimumReferenceTarget = Pick<ApplicationPlan, 'year' | 'university' | 'program' | 'department' | 'source_selection'>;
export type MinimumReferenceResult = { status: 'missing' | 'ambiguous' | 'incomplete' | 'stale' }
  | { status: 'matched'; entry: MinimumReferenceEntry; scope: MinimumReferenceScope; rules: MinimumReferenceRule[] };

function requireValue(value: unknown): asserts value { if (!value) throw new Error('수능 최저 참고자료 형식을 확인해 주세요.'); }
function object(value: unknown): Record<string, unknown> { requireValue(value && typeof value === 'object' && !Array.isArray(value)); return value as Record<string, unknown>; }
const text = (value: unknown): value is string => typeof value === 'string' && !!value.trim();
const hash = (value: unknown) => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const count = (value: unknown) => Number.isInteger(value) && Number(value) >= 0;
function draft(value: Record<string, unknown>, format: string) { requireValue(value.format === format && value.version === 1 && value.review_status === 'draft' && value.executable === false); }
function identity(value: Record<string, unknown>) {
  requireValue(typeof value.package_id === 'string' && /^plan-(?:\d{7}|[a-f0-9]{12})$/.test(value.package_id));
  requireValue(text(value.university) && text(value.campus) && Number.isInteger(value.admission_year) && hash(value.source_sha256));
}
export function parseMinimumReferenceIndex(value: unknown): MinimumReferenceIndex {
  const root = object(value); draft(root, 'unavi-minimum-reference-index');
  requireValue(typeof root.prepared_at === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(root.prepared_at) && hash(root.source_sha256));
  requireValue(Array.isArray(root.entries)); const ids = new Set<string>();
  for (const raw of root.entries) {
    const e = object(raw); identity(e);
    requireValue(hash(e.sha256) && e.file === `${e.sha256}.json` && count(e.bytes) && Number(e.bytes) > 0 && count(e.rows) && count(e.rules));
    requireValue(!ids.has(String(e.package_id))); ids.add(String(e.package_id));
  }
  return value as MinimumReferenceIndex;
}
function evidence(value: unknown) {
  const e = object(value); requireValue(text(e.document_id) && hash(e.sha256) && typeof e.checked_at === 'string' && text(e.url));
  const url = new URL(e.url); requireValue(['http:', 'https:'].includes(url.protocol) && !url.username && !url.password);
  requireValue(Array.isArray(e.pages) && e.pages.every(p => Number.isInteger(p) && p > 0));
}
export function parseMinimumReferencePackage(value: unknown, entry: MinimumReferenceEntry): MinimumReferencePackage {
  const root = object(value); draft(root, 'unavi-minimum-reference-package'); identity(root);
  for (const key of ['package_id', 'university', 'campus', 'admission_year', 'source_sha256'] as const) requireValue(root[key] === entry[key]);
  requireValue(Array.isArray(root.rules) && root.rules.length === entry.rules && Array.isArray(root.rows) && root.rows.length === entry.rows);
  const ids = new Set<string>();
  for (const raw of root.rules) {
    const r = object(raw); requireValue(text(r.id) && !ids.has(r.id) && text(r.source_pointer)); ids.add(r.id);
    requireValue(['required', 'not_required', 'conditional', 'unspecified'].includes(String(r.applicability)));
    requireValue(Array.isArray(r.sentences) && r.sentences.every(text)); evidence(r.evidence);
  }
  const scopeIds = new Set<string>();
  for (const raw of root.rows) {
    const r = object(raw);
    for (const key of ['program_id', 'program', 'round', 'unit_id', 'unit']) requireValue(text(r[key]));
    const key = JSON.stringify([r.program_id, r.unit_id]); requireValue(!scopeIds.has(key)); scopeIds.add(key);
    requireValue(['classified', 'explicit_pending', 'unclassified'].includes(String(r.scope_status)));
    requireValue(Array.isArray(r.rule_ids) && r.rule_ids.every(id => typeof id === 'string' && ids.has(id)));
    requireValue(r.scope_status === 'classified' ? r.rule_ids.length > 0 : r.rule_ids.length === 0);
    requireValue(Array.isArray(r.pending));
    for (const rawPending of r.pending) { const p = object(rawPending); requireValue(typeof p.reason === 'string'); if (p.evidence !== null) evidence(p.evidence); }
  }
  return value as MinimumReferencePackage;
}
const normalize = (value: string) => value.normalize('NFKC').trim().replace(/\s+/g, ' ');
export function minimumReferenceEntries(index: MinimumReferenceIndex, target: MinimumReferenceTarget) {
  const name = normalize(currentUniversityName(target.university));
  return index.entries.filter(e => (!target.source_selection || e.package_id === target.source_selection.package_id) && e.admission_year === target.year && [e.university, `${e.university}(${e.campus})`, `${e.university} ${e.campus}`]
    .some(label => normalize(currentUniversityName(label)) === name));
}
export function matchMinimumReference(entry: MinimumReferenceEntry, data: MinimumReferencePackage, target: MinimumReferenceTarget): MinimumReferenceResult {
  if (entry.admission_year !== target.year || data.package_id !== entry.package_id) return { status: 'missing' };
  if (target.source_selection && target.source_selection.source_sha256 !== entry.source_sha256) return { status: 'stale' };
  if (!target.department.trim()) return { status: 'incomplete' };
  const scopes = data.rows.filter(r => normalize(r.program) === normalize(target.program) && normalize(r.unit) === normalize(target.department)
    && (!target.source_selection || r.program_id === target.source_selection.program_id && r.unit_id === target.source_selection.unit_id && r.round === target.source_selection.round));
  if (scopes.length !== 1) return { status: scopes.length ? 'ambiguous' : 'missing' };
  const scope = scopes[0];
  return { status: 'matched', entry, scope, rules: data.rules.filter(r => scope.rule_ids.includes(r.id)) };
}
export function applicationFromMinimumScope(entry: MinimumReferenceEntry, data: MinimumReferencePackage, scope: MinimumReferenceScope) {
  if (data.package_id !== entry.package_id || data.source_sha256 !== entry.source_sha256 || !data.rows.includes(scope)) throw new Error('선택한 전형 자료를 다시 확인해 주세요.');
  const evidence = data.rules.find(r => scope.rule_ids.includes(r.id))?.evidence ?? scope.pending.find(p => p.evidence)?.evidence;
  return {
    year: entry.admission_year, university: entry.campus === '본교' ? entry.university : `${entry.university}(${entry.campus})`,
    program: scope.program, department: scope.unit, source_url: evidence?.url.startsWith('https://') ? minimumEvidenceUrl(evidence, evidence.pages[0]) : '',
    source_selection: { package_id: entry.package_id, program_id: scope.program_id, unit_id: scope.unit_id, round: scope.round, source_sha256: entry.source_sha256 },
  };
}
export function minimumEvidenceUrl(evidence: MinimumEvidence, page?: number) {
  const url = new URL(evidence.url);
  if (page !== undefined && evidence.pages.includes(page)) url.hash = `page=${page}`;
  return url.href;
}
