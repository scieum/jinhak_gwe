import { useEffect, useState } from 'react';
import { EMPTY_TRACKS, parseTracks, type TracksData } from '../domain/specialTracks';
import { isSampleMode } from './sample/mode';
import { sampleTracks } from './sample/specialTracks';

/** public/data/special-tracks.json: 관리자 2명이 검수한 묶음 매핑표 · 실기 채점 기준표. 파일이 없으면 모든 묶음이 "준비 중". */
let cache: Promise<TracksData> | null = null;
export function loadSpecialTracks(fetcher: typeof fetch = fetch): Promise<TracksData> {
  if (isSampleMode()) return Promise.resolve(sampleTracks); // 샘플 모드: 시안 데모(가상)
  return cache ??= fetcher(`${import.meta.env.BASE_URL}data/special-tracks.json`)
    .then(r => r.ok ? r.json() : null).then(parseTracks).catch(() => EMPTY_TRACKS);
}
export function resetSpecialTracks() { cache = null; }
export function useSpecialTracks() {
  const [data, setData] = useState<TracksData | null>(null);
  useEffect(() => { let live = true; loadSpecialTracks().then(d => { if (live) setData(d); }); return () => { live = false; }; }, []);
  return data;
}
