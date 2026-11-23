import { useCallback, useEffect, useState } from 'react';
import { parseUnivMap, type UnivMapData } from '../domain/univMap';

/** public/data/univ-map.json: 관리자 2명이 검수한 캠퍼스 위치. 파일이 없거나 형식이 틀리면 빈 자료(= 위치 확인 중), 연결 실패만 오류. */
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
