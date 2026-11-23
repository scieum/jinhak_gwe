// 대학 위키 요약 검수. 대학 × 섹션마다 관리자 2명이 승인한 요약만 univ-wiki.json의 entries로 나간다.
import { REQUIRED_APPROVALS, type Approval } from './resultReview';
import { forbiddenIn, https, WIKI_SECTIONS, type WikiItem, type WikiSectionKey } from './univWiki';
import type { FieldStatus } from './fieldReview';

export interface WikiDraft { key: string; university: string; section: WikiSectionKey; items: WikiItem[]; approvals: Approval[]; updated_at: string }

export const wikiKey = (university: string, section: WikiSectionKey) => `${university.trim()}|${section}`;
export const sectionTitle = (k: WikiSectionKey) => WIKI_SECTIONS.find(s => s.key === k)!.title;
export const newWikiDraft = (university: string, section: WikiSectionKey, items: WikiItem[] = []): WikiDraft =>
  ({ key: wikiKey(university, section), university: university.trim(), section, items, approvals: [], updated_at: '' });
export const wikiStatus = (d: WikiDraft): FieldStatus =>
  d.approvals.length >= REQUIRED_APPROVALS ? '검수 완료' : d.approvals.length === 1 ? '1인 승인' : '검수 대기';

/** 빈 칸·https 아닌 출처·금지 표현은 승인 전에 막는다. 제목은 비워 두면 뺀다. */
export function itemProblems(items: readonly WikiItem[]): string[] {
  const out: string[] = [];
  if (!items.length) out.push('요약이 하나도 없어요');
  items.forEach((i, n) => {
    const at = `${n + 1}번 요약`;
    if (!i.text.trim()) out.push(`${at}: 내용이 비어 있어요`);
    if (!i.source_label.trim()) out.push(`${at}: 출처 이름이 비어 있어요`);
    if (!https(i.source_url.trim())) out.push(`${at}: 출처 주소는 https://로 시작해야 해요`);
    for (const w of forbiddenIn(`${i.heading ?? ''} ${i.text}`)) out.push(`${at}: 쓸 수 없는 표현 ‘${w}’이 있어요`);
  });
  return out;
}
const clean = (items: readonly WikiItem[]): WikiItem[] => items.map(i => ({
  ...(i.heading?.trim() ? { heading: i.heading.trim() } : {}), text: i.text.trim(), source_label: i.source_label.trim(), source_url: i.source_url.trim() }));

/** 요약이 바뀌면 승인을 모두 지운다(다시 검수). */
export function editItems(d: WikiDraft, items: WikiItem[], now = new Date()): WikiDraft {
  return { ...d, items: clean(items), approvals: [], updated_at: now.toISOString() };
}
export function approveWiki(d: WikiDraft, reviewer: string, now = new Date()): WikiDraft {
  const name = reviewer.trim();
  if (!name) throw new Error('검수자 이름을 먼저 적어 주세요.');
  const problems = itemProblems(d.items);
  if (problems.length) throw new Error(`${problems[0]} · 고친 뒤 승인해 주세요.`);
  if (d.approvals.some(a => a.reviewer === name)) throw new Error('이미 승인했어요. 다른 검수자가 확인해야 해요.');
  if (wikiStatus(d) === '검수 완료') throw new Error('이미 검수가 끝났어요.');
  return { ...d, approvals: [...d.approvals, { reviewer: name, at: now.toISOString() }], updated_at: now.toISOString() };
}

export const wikiRecordFile = (drafts: readonly WikiDraft[]) => ({ format: 'jinhak-navi-wiki-review', drafts });
const keys = new Set<string>(WIKI_SECTIONS.map(s => s.key));
/** 다른 검수자의 기록. 같은 요약이면 승인을 합치고, 요약이 다른 것은 conflicts로 돌려 화면이 덮어쓸지 묻는다. */
export function mergeWikiRecords(local: ReadonlyMap<string, WikiDraft>, incoming: unknown) {
  const f = incoming as { format?: string; drafts?: unknown };
  if (f?.format !== 'jinhak-navi-wiki-review' || !Array.isArray(f.drafts)) throw new Error('위키 검수 기록 파일이 아니에요.');
  const merged: WikiDraft[] = [], conflicts: WikiDraft[] = [];
  for (const raw of f.drafts as WikiDraft[]) {
    if (typeof raw?.university !== 'string' || !raw.university.trim() || !keys.has(raw.section) || !Array.isArray(raw.items) || !Array.isArray(raw.approvals)) continue;
    const items = clean(raw.items.map(i => ({ heading: String(i?.heading ?? ''), text: String(i?.text ?? ''), source_label: String(i?.source_label ?? ''), source_url: String(i?.source_url ?? '') })));
    const approvals = raw.approvals.filter(a => typeof a?.reviewer === 'string' && a.reviewer.trim() && typeof a?.at === 'string').map(a => ({ reviewer: a.reviewer, at: a.at }));
    const d: WikiDraft = { ...newWikiDraft(raw.university, raw.section, items), approvals: approvals.slice(0, REQUIRED_APPROVALS), updated_at: String(raw.updated_at ?? '') };
    const mine = local.get(d.key);
    if (!mine) merged.push(d);
    else if (JSON.stringify(mine.items) !== JSON.stringify(d.items)) conflicts.push(d);
    else {
      const all = [...mine.approvals];
      for (const a of d.approvals) if (!all.some(x => x.reviewer === a.reviewer)) all.push(a);
      merged.push({ ...mine, approvals: all.slice(0, REQUIRED_APPROVALS) });
    }
  }
  return { merged, conflicts };
}

/** 지금 공개 파일의 계열표와 다른 대학 요약은 그대로 두고, 검수 완료된 섹션만 덮어쓴다.
 *  검수 중인(고친 뒤 재승인 전) 섹션은 이전에 공개된 내용이 그대로 남는다. */
export function buildWikiEntries(current: unknown, drafts: readonly WikiDraft[]) {
  const done = drafts.filter(d => wikiStatus(d) === '검수 완료' && !itemProblems(d.items).length);
  if (!done.length) throw new Error(`검수자 ${REQUIRED_APPROVALS}명이 승인한 요약이 아직 없어요.`);
  const c = current as { format?: string; fields?: unknown; entries?: unknown };
  const ok = c?.format === 'jinhak-navi-univ-wiki';
  const entries = new Map<string, Record<string, unknown>>();
  for (const e of ok && Array.isArray(c.entries) ? c.entries as { university?: unknown; sections?: unknown }[] : [])
    if (typeof e?.university === 'string' && e.sections && typeof e.sections === 'object') entries.set(e.university, { ...e.sections as object });
  for (const d of done) {
    const reviewed_at = new Date(d.approvals.map(a => a.at).sort().pop()!).toLocaleDateString('sv-SE'); // 마지막 승인일(이 기기 날짜)
    entries.set(d.university, { ...entries.get(d.university), [d.section]: { reviewed_at, approvals: d.approvals, items: d.items } });
  }
  return { file: { format: 'jinhak-navi-univ-wiki', version: 1, fields: ok && c.fields ? c.fields : { reviewed_at: '', approvals: [], rows: [] },
    entries: [...entries].sort(([a], [b]) => a.localeCompare(b, 'ko')).map(([university, sections]) => ({ university, sections })) }, count: done.length };
}
