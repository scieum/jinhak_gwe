import type { ReactNode } from 'react';
import type { Trace } from '../engine/types';
import { dataAsOf } from '../data/catalog';
import { Icon } from './Icon';

/** icon: v2 disclaimer-note의 info 아이콘(16). 아이콘을 CSS로 그리는 화면이 있어서 켜는 화면만 넘겨요. */
/** lead: 앞 문장(화면마다 시안 문구가 달라요) · sample: 샘플 모드 고지 문구를 붙여요(넘기는 화면만). */
export function Disclaimer({ icon, lead = '대학 공식 계산기·모집요강이 최종 기준이에요', sample }: { icon?: boolean; lead?: string; sample?: boolean }) {
  return <p className="disclaimer-note t-caption text-muted">{icon && <Icon name="info" size={16} />}{lead} · 데이터 기준일 {dataAsOf}{sample && ' · 샘플의 대학·숫자는 예시예요'}</p>;
}
/** children: 화면이 시안 단계 목록을 직접 그릴 때(5 to 9). note: info 아이콘 + 문구. */
export function TraceAccordion({ trace, open, note, children }: { trace: readonly Trace[]; open?: boolean; note?: string; children?: ReactNode }) {
  return <details className="trace-accordion" open={open}><summary><span>어떻게 계산했나요?</span><Icon name="chevron-down" size={20} /></summary>
    {children ?? (trace.length ? <ol>{trace.map((t, i) => <li key={i}><span>{t.detail}</span>{t.value !== undefined && <strong className="num"> {t.value.toLocaleString('ko-KR', { maximumFractionDigits: 6 })}</strong>}<small className="text-muted"> · {t.rule}</small></li>)}</ol>
      : <p className="text-muted">검수된 규칙과 필요한 성적이 준비되면 계산 과정을 보여드려요.</p>)}
    {note ? <p className="disclaimer-note t-caption text-muted"><Icon name="info" size={16} /><span>{note}</span></p> : <Disclaimer />}
  </details>;
}
