import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { loadTargetMinimumReference } from '../data/minimumReferences';
import { minimumEvidenceUrl, type MinimumEvidence, type MinimumReferenceResult, type MinimumReferenceTarget } from '../domain/minimumReferences';

function Evidence({ value }: { value: MinimumEvidence }) {
  return <p className="t-caption">{value.pages.length ? value.pages.map(page => <a key={page} className="t-link" href={minimumEvidenceUrl(value, page)} target="_blank" rel="noreferrer">근거 PDF {page}쪽 ↗ </a>)
    : <a className="t-link" href={minimumEvidenceUrl(value)} target="_blank" rel="noreferrer">근거 원문 열기 ↗</a>}
    {value.checked_at && <span> · 원문 수집 {value.checked_at}</span>}</p>;
}

/** Draft references stay separate from the grade/minimum calculation path. */
export function TargetMinimumReference({ target }: { target: MinimumReferenceTarget }) {
  const [result, setResult] = useState<MinimumReferenceResult | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(false), [attempt, setAttempt] = useState(0);
  const { year, university, program, department, source_selection } = target;
  useEffect(() => {
    if (!open) return;
    let live = true; setResult(null); setError(false);
    loadTargetMinimumReference({ year, university, program, department, source_selection }).then(value => { if (live) setResult(value); }, () => { if (live) setError(true); });
    return () => { live = false; };
  }, [year, university, program, department, source_selection, attempt, open]);
  return <details className="trd-reference" onToggle={event => setOpen(event.currentTarget.open)}>
    <summary>수능 최저 원문·근거</summary>
    {open && <>
    {!result && !error && <p role="status">참고자료를 읽고 있어요.</p>}
    {error && <div role="alert"><p>참고자료를 읽지 못했어요.</p><button type="button" className="button-outline" onClick={() => setAttempt(n => n + 1)}>참고자료 다시 읽기</button></div>}
    {result?.status === 'matched' ? <>
      <p>{result.entry.admission_year}학년도 · {result.entry.university} · {result.entry.campus}<br />{result.scope.round} · {result.scope.program} · {result.scope.unit}</p>
      <span className="data-status-badge trd-status">검수 전 참고자료</span>
      {result.rules.map(rule => <div key={rule.id}>
        <p>{rule.applicability === 'not_required' ? '최저 미적용으로 정리된 원문이 있어요. 적용 범위와 예외는 원문을 확인해 주세요.'
          : rule.applicability === 'required' ? '최저 조건이 정리되어 있어요. 세부 조건은 원문을 확인해 주세요.'
            : '조건별 적용 여부를 원문에서 확인해 주세요.'}</p>
        {rule.sentences.map((sentence, i) => <p key={i}>{sentence}</p>)}
        <Evidence value={rule.evidence} />
      </div>)}
      {result.scope.scope_status !== 'classified' && <p>{result.scope.scope_status === 'explicit_pending' ? '이 전형·모집단위의 적용 범위를 확인 중이에요.' : '이 전형·모집단위의 최저 기준은 아직 연결되지 않았어요.'}</p>}
      {result.scope.pending.map((pending, i) => <div key={i}>{pending.reason && <p>{pending.reason}</p>}{pending.evidence && <Evidence value={pending.evidence} />}</div>)}
      <p className="t-caption text-muted">검수 전 자료로 성적을 판정하지 않아요. 수집 이후 변경될 수 있으므로 입학처 최신 공지와 최종 모집요강을 확인해 주세요.</p>
    </> : result && <p>{result.status === 'incomplete' ? '지원 준비에서 학과·모집단위를 입력하면 원문을 연결할 수 있어요.'
      : result.status === 'stale' ? '선택한 뒤 원문 자료가 갱신되었어요. 지원 준비에서 전형을 다시 선택해 주세요.'
      : result.status === 'ambiguous' ? '캠퍼스 또는 모집시기가 여러 개라 원문을 하나로 연결하지 않았어요. 지원 준비의 대학·전형 정보를 확인해 주세요.'
        : `${year}학년도 대학·전형·모집단위가 일치하는 참고자료가 아직 없어요.`}</p>}
    <Link className="t-link" to="/admissions-list">전형계획 원문 찾아보기 ›</Link>
    </>}
  </details>;
}
