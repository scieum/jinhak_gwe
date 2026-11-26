import { useEffect, useState } from 'react';
import { loadCollectedIndex, loadCollectedRows } from './collectedResults';
import { collectedUniversityCandidates } from '../domain/universityIdentity';
import { latestReferenceCut, type ReferenceCut } from '../domain/interestComparison';
import type { Interest } from '../domain/interests';
import type { ResultRow } from '../domain/resultReview';

/** 한 대학의 수집 입결 행(캠퍼스 후보 모두). 대학을 못 찾으면 빈 배열. 하트로 학과를 고를 때 써요. */
export async function loadUniversityRows(university: string): Promise<ResultRow[]> {
  const index = await loadCollectedIndex();
  const campuses = collectedUniversityCandidates(university, index.universities.map(e => e.university));
  const all = await Promise.all(index.universities.filter(e => campuses.includes(e.university)).map(e => loadCollectedRows(e)));
  return all.flat();
}

type Loaded = Record<string, { rows: ResultRow[]; error: string }>;
/** 관심 전형마다 최근 수집 입결 컷(참고 비교). 아직 불러오는 중이면 null. 될각 · 홈이 같이 써요. */
export function useReferenceCuts(interests: readonly Interest[]): { cuts: Record<string, ReferenceCut | null>; rowsOf: (university: string) => ResultRow[]; error: string } {
  const [loaded, setLoaded] = useState<Loaded>({}), [error, setError] = useState('');
  const names = JSON.stringify([...new Set(interests.map(i => i.university))].sort());
  useEffect(() => {
    let active = true; setLoaded({}); setError('');
    const wanted = JSON.parse(names) as string[];
    if (wanted.length) loadCollectedIndex().then(index => {
      for (const university of wanted) {
        // 관심 목록은 '경희대학교'처럼 캠퍼스 없이 저장될 수 있어서 캠퍼스 후보('경희대(서울)' 등)를 모두 읽어요
        const campuses = collectedUniversityCandidates(university, index.universities.map(e => e.university));
        const entries = index.universities.filter(e => campuses.includes(e.university));
        if (!entries.length) { if (active) setLoaded(p => ({ ...p, [university]: { rows: [], error: '수집 자료에서 이 대학을 찾지 못했어요.' } })); continue; }
        Promise.all(entries.map(e => loadCollectedRows(e))).then(all => { if (active) setLoaded(p => ({ ...p, [university]: { rows: all.flat(), error: '' } })); })
          .catch(() => { if (active) setLoaded(p => ({ ...p, [university]: { rows: [], error: '입결 자료를 불러오지 못했어요.' } })); });
      }
    }).catch(() => { if (active) setError('입결 목록을 불러오지 못했어요. 잠시 뒤 다시 열어 주세요.'); });
    return () => { active = false; };
  }, [names]);
  const cuts = Object.fromEntries(interests.map(i => {
    const pack = loaded[i.university];
    return [i.id, pack ? (pack.error ? { reason: pack.error } : latestReferenceCut(i, pack.rows)) : null];
  }));
  return { cuts, rowsOf: university => loaded[university]?.rows ?? [], error };
}
