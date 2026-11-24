import { useEffect, useState } from 'react';
import { ButtonOutline, ButtonPrimary } from './Buttons';
import { loadCollectedIndex, loadCollectedRows } from '../data/collectedResults';
import type { CollectedIndex } from '../domain/collectedResults';
import type { ResultRow } from '../domain/resultReview';
import { currentUniversityName } from '../domain/universityIdentity';

/** Loads only the selected university; collection never grants review or license approval. */
export function CollectedResultPicker({ busy, onLoad }: {
  busy: boolean; onLoad: (rows: ResultRow[], label: string) => void;
}) {
  const [index, setIndex] = useState<CollectedIndex | null>(null), [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(true), [error, setError] = useState(''), [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let live = true;
    setLoading(true); setError('');
    loadCollectedIndex().then(data => {
      if (!live) return;
      setIndex(data); setSelected(data.universities[0]?.university ?? '');
    }).catch(e => { if (live) setError(e instanceof Error ? e.message : '수집 자료 목록을 불러오지 못했어요.'); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [attempt]);
  const load = async () => {
    const entry = index?.universities.find(e => e.university === selected);
    if (!entry || loading || busy) return;
    setLoading(true); setError('');
    try { onLoad(await loadCollectedRows(entry), `수집본 · ${entry.university} · ${entry.years.join('·')}학년도`); }
    catch (e) { setError(e instanceof Error ? e.message : '수집 자료를 불러오지 못했어요.'); }
    finally { setLoading(false); }
  };
  return <section className="filter-panel" aria-label="모아둔 입결 자료">
    <h3 className="t-heading-3">모아둔 입결 자료</h3>
    {index && <p className="text-muted">대학·캠퍼스명 {index.universities.length}개 · {index.rows.toLocaleString()}행 · 원문 {index.sources.toLocaleString()}건 · 검수 전</p>}
    <div className="toolbar">
      {index && <label>수집 대학<select value={selected} disabled={busy || loading} onChange={e => setSelected(e.target.value)}>
        {index.universities.map(e => <option key={e.university} value={e.university}>{currentUniversityName(e.university)} · {e.rows.toLocaleString()}행</option>)}
      </select></label>}
      {index && <ButtonPrimary disabled={busy || loading} onClick={load}>수집본 불러오기</ButtonPrimary>}
      <ButtonOutline disabled={busy || loading} onClick={() => setAttempt(n => n + 1)}>수집 목록 새로고침</ButtonOutline>
    </div>
    {loading && <p role="status">수집 자료를 읽고 있어요.</p>}
    {error && <p role="alert" className="error-note">{error}</p>}
    <p className="t-caption text-muted">대학을 선택하면 저장해 둔 자료를 바로 불러와요. 일부 연도·전형은 수집되지 않았으며 원문 대조와 이용 조건 확인이 필요해요.</p>
  </section>;
}
