import { useEffect, useState } from 'react';
import { parseRelease, type ReleasedUnit } from '../domain/resultReview';
import { isSampleMode } from './sample/mode';
import { sampleReleasedUnits } from './sample/public';

/** public/data/released-results.json is written by the admin "공개 자료 내보내기" step. */
// shortcut: one file for all released results; split per university once it grows past a few MB.
let cache: Promise<ReleasedUnit[]> | null = null;
export function loadReleasedResults(fetcher: typeof fetch = fetch): Promise<ReleasedUnit[]> {
  if (isSampleMode()) return Promise.resolve(sampleReleasedUnits); // 샘플 모드: 공개 파일 대신 가상 입결
  return cache ??= fetcher(`${import.meta.env.BASE_URL}data/released-results.json`)
    .then(r => r.ok ? r.json() : null).then(parseRelease).catch(() => []);
}
export function resetReleasedResults() { cache = null; }
export function useReleasedResults() {
  const [units, setUnits] = useState<ReleasedUnit[] | null>(null);
  useEffect(() => { let live = true; loadReleasedResults().then(u => { if (live) setUnits(u); }); return () => { live = false; }; }, []);
  return units;
}
