import { useEffect, useState } from 'react';
import { EMPTY_TRACKS, parseTracks, type TracksData } from '../domain/specialTracks';
import { isSampleMode, useSampleMode } from './sample/mode';
import { sampleTracks } from './sample/specialTracks';

/** 관리자 2명이 검수한 매핑표. 없으면 화면에서 수집 자료 탐색으로 연결한다. */
let cache: Promise<TracksData> | null = null;
export function loadSpecialTracks(fetcher: typeof fetch = fetch): Promise<TracksData> {
  if (isSampleMode()) return Promise.resolve(sampleTracks); // 샘플 모드: 시안 데모(가상)
  return cache ??= fetcher(`${import.meta.env.BASE_URL}data/special-tracks.json`)
    .then(r => r.ok ? r.json() : null).then(parseTracks).catch(() => EMPTY_TRACKS);
}
export function resetSpecialTracks() { cache = null; }
export function useSpecialTracks() {
  const sample = useSampleMode();
  const [state, setState] = useState<{ sample: boolean; data: TracksData } | null>(null);
  useEffect(() => { let live = true; loadSpecialTracks().then(data => { if (live) setState({ sample, data }); }); return () => { live = false; }; }, [sample]);
  return state?.sample === sample ? state.data : null;
}
