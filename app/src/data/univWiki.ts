import { useEffect, useState } from 'react';
import { parseWiki, type Wiki } from '../domain/univWiki';
import { isSampleMode } from './sample/mode';
import { sampleWikiFile } from './sample/admin';

/** public/data/univ-wiki.json: 관리자 검수를 마친 공식 문서 요약과 학과 계열표. 검수 전 항목은 parseWiki가 버린다. */
let cache: Promise<Wiki> | null = null;
export function loadUnivWiki(fetcher: typeof fetch = fetch): Promise<Wiki> {
  if (isSampleMode()) return Promise.resolve(parseWiki(sampleWikiFile)); // 샘플 모드: 검수 예시 요약
  return cache ??= fetcher(`${import.meta.env.BASE_URL}data/univ-wiki.json`)
    .then(r => r.ok ? r.json() : null).then(parseWiki).catch(() => parseWiki(null));
}
export function resetUnivWiki() { cache = null; }
export function useUnivWiki() {
  const [wiki, setWiki] = useState<Wiki | null>(null);
  useEffect(() => { let live = true; loadUnivWiki().then(w => { if (live) setWiki(w); }); return () => { live = false; }; }, []);
  return wiki;
}
