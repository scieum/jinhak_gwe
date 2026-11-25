import { useCallback, useEffect, useState } from 'react';
import { parseUnivMap, type UnivMapData } from '../domain/univMap';

/** 교육부 공개 위치(v2) 또는 기존 2인 검수 자료(v1). 출처/행 검증은 parseUnivMap에서 수행한다. */
let cache: Promise<UnivMapData> | null = null;
export function loadUnivMap(fetcher: typeof fetch = fetch): Promise<UnivMapData> {
  return cache ??= fetcher(`${import.meta.env.BASE_URL}data/univ-map.json`)
    .then(r => r.ok ? r.json().catch(() => null) : null).then(parseUnivMap)
    .catch(e => { cache = null; throw e; });
}
export function resetUnivMap() { cache = null; }
export function useUnivMap() {
  const [state, setState] = useState<UnivMapData | 'loading' | 'error'>('loading');
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let live = true; setState('loading');
    loadUnivMap().then(d => { if (live) setState(d); }, () => { if (live) setState('error'); });
    return () => { live = false; };
  }, [tick]);
  return [state, useCallback(() => setTick(t => t + 1), [])] as const;
}
