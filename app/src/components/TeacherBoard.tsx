// 우리 반 홈 · 카드 수합 v2 시안 공통 조각(teacher-dashboard 330:1766·330:16438, card-collect 346:78062·346:78011).
// 오늘 할 일 카드 · 표 카드(머리줄 + data-table 행) · 학생 줄(student-row-card) · 한 줄 고지. 값은 Figma 노드 실측(styles/teacher-board.css).
import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { dataAsOf } from '../data/catalog';
import { Icon } from './Icon';
import '../styles/teacher-board.css';

const MEDIA = '(min-width: 1024px)';
/** PC(≥1024)인지. matchMedia가 없는 환경(테스트)은 PC로 봐요. */
export function useDesktop() {
  const [desktop, setDesktop] = useState(() => typeof matchMedia !== 'function' || matchMedia(MEDIA).matches);
  useEffect(() => {
    if (typeof matchMedia !== 'function') return;
    const media = matchMedia(MEDIA), update = () => setDesktop(media.matches);
    update(); media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  return desktop;
}

/** PC는 셸 머리(page-header)에 lead를, 모바일은 앱바에 데이터 기준일 배지를 붙여요. */
export function BoardHead({ desktop, lead }: { desktop: boolean; lead: string }) {
  const [slot, setSlot] = useState<Element | null>(null);
  useEffect(() => setSlot(document.querySelector(desktop ? '.topbar__heading' : '#appbar-actions')), [desktop]);
  if (!slot) return null;
  return createPortal(desktop ? <p className="tb-lead">{lead}</p> : <span className="data-status-badge tb-asof">데이터 기준일 {dataAsOf}</span>, slot);
}

/** 판정 표식(design.md judge-badge): 모양 + 이름. tone = risk ■ · reach ▲ · fit ◐ · safe ● · none(이름만) · edge(경계, 이름만). */
export type Tone = 'risk' | 'reach' | 'fit' | 'safe' | 'none' | 'edge';
export function Mark({ tone, label, soft }: { tone: Tone; label?: string; soft?: boolean }) {
  return <span className={`tb-mark tb-mark--${tone}${soft ? ' tb-mark--soft' : ''}${label ? '' : ' tb-mark--only'}`}>
    {tone !== 'none' && tone !== 'edge' && <i aria-hidden="true" />}{label}</span>;
}

export interface TodayRow { icon: string; count: string; title: string; sub: string; action: ReactNode }
/** 오늘 할 일 카드. PC = 아이콘 · 숫자 · 제목/설명 · 링크, 모바일 = 제목/설명 · 링크. */
export function TodayCard({ desktop, rule, rows }: { desktop: boolean; rule: string; rows: TodayRow[] }) {
  return <section className="tb-today" aria-label="오늘 할 일">
    <div className="tb-today__head"><h3 className="tb-today__title">오늘 할 일</h3>{desktop && <span className="tb-caption">{rule}</span>}</div>
    {rows.map(r => <div className="tb-today__row" key={r.title}>
      {desktop && <><Icon name={r.icon} size={24} /><strong className="tb-today__count">{r.count}</strong></>}
      <div className="tb-today__text"><p className="tb-today__name">{r.title}</p><p className="tb-today__sub">{r.sub}</p></div>
      {r.action}</div>)}
  </section>;
}
export const ActionLink = ({ to, children }: { to: string; children: ReactNode }) => <Link className="tb-action" to={to}>{children}</Link>;

/** 거르기 칩(filter-chip). */
export function Chips<T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return <div className="tb-chips" role="group" aria-label="거르기">{options.map(([v, label]) =>
    <button key={v} type="button" className="filter-chip" aria-pressed={value === v} onClick={() => onChange(v)}>{label}</button>)}</div>;
}

export interface Column { label: string; className?: string; width?: number; headWidth?: number; sort?: () => void }
/** 표(data-table): 시안처럼 머리줄과 학생 줄이 각각 data-table/row예요. 열 폭·정렬은 className(CSS)로 정해요. */
export function BoardTable({ label, columns, rows }: { label: string; columns: Column[]; rows: { key: string; cells: ReactNode[] }[] }) {
  return <div className="tb-table" role="table" aria-label={label}>
    <div className="data-table tb-row tb-row--head" role="row">{columns.map((c, i) => <div key={i} role="columnheader" className={`tb-cell ${c.className ?? ''}`} style={{ width: c.headWidth ?? c.width }}>
      {c.sort ? <button type="button" className="tb-sort" onClick={c.sort}>{c.label}<Icon name="arrow-up-down" size={16} /></button> : c.label}</div>)}</div>
    {rows.map(r => <div key={r.key} className="data-table tb-row" role="row">{r.cells.map((cell, i) =>
      <div key={i} role="cell" className={`tb-cell ${columns[i].className ?? ''}`} style={{ width: columns[i].width }}>{cell}</div>)}</div>)}
  </div>;
}

/** 모바일 학생 줄(student-row-card). */
export function RowCard({ number, alias, middle, badges, line2, to }: { number: string; alias: string; middle?: string; badges: ReactNode; line2?: string; to: string }) {
  return <Link className={`tb-rowcard${line2 ? ' tb-rowcard--two' : ''}`} to={to}>
    <span className="tb-rowcard__line"><span className="tb-rowcard__num">{Number(number)}번</span><span className="tb-rowcard__alias">{alias}</span>
      {middle && <span className="tb-rowcard__mid">{middle}</span>}<span className="tb-rowcard__badges">{badges}</span></span>
    {line2 && <span className="tb-rowcard__sub">{line2}</span>}
  </Link>;
}

export const ViewOnly = ({ children }: { children: string }) => <p className="tb-viewonly"><Icon name="info" size={16} />{children}</p>;
export const Disclaimer = ({ children }: { children: string }) => <p className="disclaimer-note tb-disclaimer"><Icon name="info" size={16} /><span>{children}</span></p>;

/** "15번 바다" */
export const who = (s: { number: string; alias: string }) => `${Number(s.number)}번 ${s.alias}`;
/** "3번 노을 · 4번 단비 · 11번 구름 외 4명" */
export const someOf = (list: { number: string; alias: string }[], n = 3) => list.slice(0, n).map(who).join(' · ') + (list.length > n ? ` 외 ${list.length - n}명` : '');
/** 상담카드를 안 낸 학생에게 보낼 알림 문구를 복사해요(학급 메신저에 붙여 넣기). */
export function NotifyButton({ code, missing }: { code: string; missing: { number: string; alias: string }[] }) {
  const [done, setDone] = useState('');
  const copy = async () => {
    const text = `${missing.map(who).join(', ')} 학생은 수시로에서 상담카드를 보내 주세요. 학급 코드 ${code}`;
    try { await navigator.clipboard.writeText(text); setDone('알림 문구를 복사했어요. 학급 메신저에 붙여 넣어 주세요.'); } catch { setDone(text); }
  };
  return <><button type="button" className="tb-action" onClick={copy}>알림 보내기 ›</button>{done && <span role="status" className="sr-only">{done}</span>}</>;
}
