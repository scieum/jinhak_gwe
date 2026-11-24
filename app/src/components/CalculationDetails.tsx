import type { Trace } from '../engine/types';
import { dataAsOf } from '../data/catalog';
import { Icon } from './Icon';

/** icon: v2 disclaimer-note의 info 아이콘(16). 아이콘을 CSS로 그리는 화면이 있어서 켜는 화면만 넘겨요. */
export function Disclaimer({ icon }: { icon?: boolean }) {
  return <p className="disclaimer-note t-caption text-muted">{icon && <Icon name="info" size={16} />}대학 공식 계산기·모집요강이 최종 기준이에요 · 데이터 기준일 {dataAsOf}</p>;
}
export function TraceAccordion({ trace, open, note }: { trace: readonly Trace[]; open?: boolean; note?: string }) {
  return <details className="trace-accordion" open={open}><summary><span>어떻게 계산했나요?</span><Icon name="chevron-down" size={20} /></summary>
    {trace.length ? <ol>{trace.map((t, i) => <li key={i}><span>{t.detail}</span>{t.value !== undefined && <strong className="num"> {t.value.toLocaleString('ko-KR', { maximumFractionDigits: 6 })}</strong>}<small className="text-muted"> · {t.rule}</small></li>)}</ol>
      : <p className="text-muted">검수된 규칙과 필요한 성적이 준비되면 계산 과정을 보여드려요.</p>}
    {note ? <p className="disclaimer-note t-caption text-muted">{note}</p> : <Disclaimer />}
  </details>;
}
