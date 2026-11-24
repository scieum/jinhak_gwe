import { webcrypto } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import type { MinimumReferenceIndex, MinimumReferencePackage } from '../src/domain/minimumReferences';

const base = 'public/data/minimum-references/';
const index: MinimumReferenceIndex = JSON.parse(readFileSync(`${base}index.json`, 'utf8'));
const entry = index.entries.find(e => e.package_id === 'plan-0000198')!;
const bytes = readFileSync(`${base}${entry.file}`);
const pkg: MinimumReferencePackage = JSON.parse(bytes.toString('utf8'));
const target = { year: entry.admission_year, university: entry.university, program: pkg.rows[0].program, department: pkg.rows[0].unit };
beforeEach(() => { vi.resetModules(); vi.stubGlobal('crypto', webcrypto); });
afterEach(() => vi.unstubAllGlobals());

test('loads only the selected package, checks its digest, and shares repeated requests', async () => {
  const fetcher = vi.fn(async (url: string) => url.endsWith('index.json')
    ? new Response(JSON.stringify(index)) : new Response(bytes));
  vi.stubGlobal('fetch', fetcher);
  const { loadTargetMinimumReference } = await import('../src/data/minimumReferences');
  const results = await Promise.all([loadTargetMinimumReference(target), loadTargetMinimumReference(target)]);
  expect(results.map(r => r.status)).toEqual(['matched', 'matched']);
  expect(fetcher).toHaveBeenCalledTimes(2);
  expect(fetcher.mock.calls[1][0]).toContain(entry.file);
});

test('corrupt content is rejected and a later retry can load the original package', async () => {
  const corrupt = Buffer.from(bytes); corrupt[corrupt.length - 2] ^= 1;
  vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response(corrupt)).mockResolvedValueOnce(new Response(bytes)));
  const { loadMinimumReferencePackage } = await import('../src/data/minimumReferences');
  await expect(loadMinimumReferencePackage(entry)).rejects.toThrow('목록과 일치하지 않아요');
  await expect(loadMinimumReferencePackage(entry)).resolves.toMatchObject({ package_id: entry.package_id });
});

test('ambiguous campuses and unsupported years do not fetch a package', async () => {
  const fetcher = vi.fn(async () => new Response(JSON.stringify(index))); vi.stubGlobal('fetch', fetcher);
  const { loadTargetMinimumReference } = await import('../src/data/minimumReferences');
  const campus = index.entries.find(e => e.package_id === 'plan-0000003')!;
  await expect(loadTargetMinimumReference({ ...target, university: campus.university })).resolves.toEqual({ status: 'ambiguous' });
  await expect(loadTargetMinimumReference({ ...target, year: 2029 })).resolves.toEqual({ status: 'missing' });
  expect(fetcher).toHaveBeenCalledTimes(1);
});
