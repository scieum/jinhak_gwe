import { useEffect, useState } from 'react';
import { parseTierDraft } from '../domain/deptTier';
import { parseRelease } from '../domain/resultReview';
import { parseWiki } from '../domain/univWiki';
import { loadAdmissionPlans } from './admissionPlans';

type TierDraft = ReturnType<typeof parseTierDraft>;
/** public/data/dept-tier.json(app/tools/build_dept_tier.py). 파일이 없거나 깨지면 빈 자료 → 화면은 "준비 중". */
let cache: Promise<TierDraft> | null = null;
export function loadTierDraft(fetcher: typeof fetch = fetch): Promise<TierDraft> {
  return cache ??= fetcher(`${import.meta.env.BASE_URL}data/dept-tier.json`)
    .then(r => r.ok ? r.json() : null).then(parseTierDraft).catch(() => parseTierDraft(null));
}
/** 샘플 모드에서는 읽지 않는다(null 그대로). */
export function useTierDraft(enabled: boolean) {
  const [draft, setDraft] = useState<TierDraft | null>(null);
  useEffect(() => { if (!enabled) return; let live = true; loadTierDraft().then(d => { if (live) setDraft(d); }); return () => { live = false; }; }, [enabled]);
  return draft;
}
export function resetTierDraft() { cache = null; }

/** 공공 자료는 학생 성적의 샘플 모드와 별개로 읽는다. */
async function readPublic(name: string) {
  const response = await fetch(`${import.meta.env.BASE_URL}data/${name}.json`);
  if (!response.ok) throw new Error(name);
  return response.json();
}
async function loadTierSources() {
  const [released, wiki, draft, plans] = await Promise.allSettled([
    readPublic('released-results').then(parseRelease), readPublic('univ-wiki').then(parseWiki),
    readPublic('dept-tier').then(parseTierDraft), loadAdmissionPlans(),
  ]);
  return {
    released: released.status === 'fulfilled' ? released.value : [],
    wiki: wiki.status === 'fulfilled' ? wiki.value : parseWiki(null),
    draft: draft.status === 'fulfilled' ? draft.value : parseTierDraft(null),
    plans: plans.status === 'fulfilled' ? plans.value : null,
    errors: [released, wiki, draft, plans].flatMap((r, i) => r.status === 'rejected' ? [['공개 입결', '학과 계열표', '수시 입결', '전형계획'][i]] : []),
  };
}
export function useTierSources() {
  const [sources, setSources] = useState<Awaited<ReturnType<typeof loadTierSources>> | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let live = true;
    loadTierSources().then(value => { if (live) setSources(value); });
    return () => { live = false; };
  }, [attempt]);
  return { sources, retry: () => setAttempt(n => n + 1) };
}
