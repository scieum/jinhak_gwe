import type { Trace } from '../engine/types';
import { dataAsOf } from '../data/catalog';

export function Disclaimer() {
  return <p className="disclaimer-note t-caption text-muted">대학 공식 계산기·모집요강이 최종 기준이에요 · 데이터 기준일 {dataAsOf}</p>;
}
export function TraceAccordion({ trace }: { trace: readonly Trace[] }) {
  return <details className="trace-accordion"><summary>어떻게 계산했나요?</summary>
    {trace.length ? <ol>{trace.map((t, i) => <li key={i}><span>{t.detail}</span>{t.value !== undefined && <strong className="num"> {t.value.toLocaleString('ko-KR', { maximumFractionDigits: 6 })}</strong>}<small className="text-muted"> · {t.rule}</small></li>)}</ol>
      : <p className="text-muted">검수된 규칙과 필요한 성적이 준비되면 계산 과정을 보여드려요.</p>}
    <Disclaimer />
  </details>;
}
