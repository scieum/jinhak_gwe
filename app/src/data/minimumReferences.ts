import { matchMinimumReference, minimumReferenceEntries, parseMinimumReferenceIndex, parseMinimumReferencePackage,
  type MinimumReferenceEntry, type MinimumReferenceIndex, type MinimumReferencePackage, type MinimumReferenceResult, type MinimumReferenceTarget } from '../domain/minimumReferences';

const base = () => `${import.meta.env.BASE_URL}data/minimum-references/`;
let indexCache: Promise<MinimumReferenceIndex> | undefined;
const packages = new Map<string, Promise<MinimumReferencePackage>>();
export async function loadMinimumReferenceIndex() {
  if (!indexCache) indexCache = (async () => {
    const response = await fetch(`${base()}index.json`);
    if (!response.ok) throw new Error('수능 최저 참고자료 목록을 읽지 못했어요.');
    return parseMinimumReferenceIndex(await response.json());
  })().catch(error => { indexCache = undefined; throw error; });
  return indexCache;
}
export async function loadMinimumReferencePackage(entry: MinimumReferenceEntry) {
  if (!/^[a-f0-9]{64}\.json$/.test(entry.file) || entry.file !== `${entry.sha256}.json`) throw new Error('참고자료 경로를 확인해 주세요.');
  let pending = packages.get(entry.sha256);
  if (!pending) {
    pending = (async () => {
      const response = await fetch(`${base()}${entry.file}`);
      if (!response.ok) throw new Error('대학 참고자료를 읽지 못했어요.');
      const bytes = await response.arrayBuffer();
      const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), b => b.toString(16).padStart(2, '0')).join('');
      if (bytes.byteLength !== entry.bytes || digest !== entry.sha256) throw new Error('참고자료가 목록과 일치하지 않아요.');
      return parseMinimumReferencePackage(JSON.parse(new TextDecoder().decode(bytes)), entry);
    })().catch(error => { packages.delete(entry.sha256); throw error; });
    packages.set(entry.sha256, pending);
  }
  return pending;
}
export async function loadTargetMinimumReference(target: MinimumReferenceTarget): Promise<MinimumReferenceResult> {
  if (!target.department.trim()) return { status: 'incomplete' };
  const entries = minimumReferenceEntries(await loadMinimumReferenceIndex(), target);
  if (entries.length !== 1) return { status: entries.length ? 'ambiguous' : 'missing' };
  return matchMinimumReference(entries[0], await loadMinimumReferencePackage(entries[0]), target);
}
