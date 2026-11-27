import { useEffect, useState } from 'react';
import { loadAdmissionPlans } from './admissionPlans';
import { parseTierDraft } from '../domain/deptTier';
import { collectTracks } from '../domain/trackCollection';

async function readResults() {
  const response = await fetch(`${import.meta.env.BASE_URL}data/dept-tier.json`);
  if (!response.ok) throw new Error('입결');
  const value = await response.json();
  if (value?.format !== 'jinhak-navi-dept-tier' || value.version !== 1 || !Array.isArray(value.rows) || !Array.isArray(value.fields)) throw new Error('입결 형식');
  return parseTierDraft(value);
}
export async function loadTrackCollection() {
  const [plans, results] = await Promise.allSettled([loadAdmissionPlans(), readResults()]);
  const catalog = plans.status === 'fulfilled' ? plans.value : null;
  const draft = results.status === 'fulfilled' ? results.value : { units: [], fields: [] };
  return {
    rows: collectTracks(catalog, draft.units, draft.fields),
    year: catalog?.year, checkedAt: catalog?.checked_at,
    errors: [plans, results].flatMap((r, i) => r.status === 'rejected' ? [['전형계획', '수시 입결'][i]] : []),
  };
}
export function useTrackCollection() {
  const [data, setData] = useState<Awaited<ReturnType<typeof loadTrackCollection>> | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let live = true;
    loadTrackCollection().then(value => { if (live) setData(value); });
    return () => { live = false; };
  }, [attempt]);
  return { data, retry: () => { setData(null); setAttempt(n => n + 1); } };
}
