import { useEffect, useState } from 'react';
import { parseTierDraft } from '../domain/deptTier';

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
