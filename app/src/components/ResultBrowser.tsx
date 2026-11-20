import { useState } from 'react';
import { Link } from 'react-router-dom';
import { SegmentedControl } from './SegmentedControl';
import type { ReleasedUnit } from '../domain/resultReview';
import { programPath } from '../domain/interests';
import { axisPoints, axisRange, delta, resultLines, TYPE_TABS, universities, yearsOf, type ResultLine, type TypeTab } from '../domain/resultBrowse';
import '../styles/result-browser.css';

const fmt = (v: number | null | undefined) => v === null || v === undefined ? '—' : String(v);
const basisLabel = (l: ResultLine, year: number) => { const c = l.years.get(year); return c ? [c.metric || '지표 미기재', c.basis].filter(Boolean).join(' · ') : '—'; };

export function ResultBrowser({ units, initialUniversity }: { units: readonly ReleasedUnit[]; initialUniversity?: string }) {
  const names = universities(units);
  const [university, setUniversity] = useState(initialUniversity && names.includes(initialUniversity) ? initialUniversity : names[0] ?? '');
  const [tab, setTab] = useState<TypeTab>('교과'), [view, setView] = useState<'plot' | 'table'>('plot'), [search, setSearch] = useState('');
  if (!names.length) return <div className="empty-state"><h3 className="t-heading-3">공개된 수시 입결이 아직 없어요</h3>
    <p>관리자 2명이 원문과 대조하고 이용 조건을 확인한 자료부터 이곳에 보여요.</p></div>;
  const lines = resultLines(units, university, tab), years = yearsOf(lines), last = years[years.length - 1];
  const plotted = lines.filter(l => l.plottable), tableOnly = lines.length - plotted.length;
  const range = axisRange(plotted.flatMap(l => axisPoints(l).map(p => p.value)));
  const x = (v: number) => `${((v - range.min) / (range.max - range.min)) * 100}%`;
  const ticks = Array.from({ length: (range.max - range.min) * 2 + 1 }, (_, i) => range.min + i / 2);
  const filtered = names.filter(n => n.includes(search.trim()));
  return <div className="result-browser">
    <div className="result-browser__pick">
      <label>대학 찾기<input value={search} onChange={e => setSearch(e.target.value)} placeholder="대학 이름으로 찾기" /></label>
      <label>대학<select value={university} onChange={e => setUniversity(e.target.value)}>
        {(filtered.includes(university) ? filtered : [university, ...filtered]).map(n => <option key={n}>{n}</option>)}</select></label>
      <Link className="t-link" to={`/univ-detail?u=${encodeURIComponent(university)}`}>대학 상세 ›</Link>
    </div>
    <SegmentedControl label="전형 유형" value={tab} onChange={setTab} options={TYPE_TABS.map(t => ({ value: t, label: t }))} />
    <SegmentedControl label="보기" value={view} onChange={setView} options={[{ value: 'plot', label: '좌표' }, { value: 'table', label: '표' }]} />
    {!lines.length ? <div className="empty-state"><h3 className="t-heading-3">이 전형이 없어요</h3><p>{university}의 공개된 {tab} 전형 입결이 없어요. 다른 전형 유형을 골라 보세요.</p></div>
      : view === 'plot' ? <>
        <p className="text-muted t-body-sm">{university} {tab === '전체' ? '수시' : tab} 전형 최근 {years.length}년 70% 컷이에요. 점 하나가 한 해의 컷이에요.</p>
        <p className="result-browser__legend t-caption">{years.map(y => <span key={y}><i className={y === last ? 'dot dot--latest' : 'dot'} /> {y}학년도</span>)}<span>{range.min.toFixed(1)}~{range.max.toFixed(1)} 구간 · 숫자가 작을수록 상위 등급</span></p>
        {!plotted.length ? <p className="text-muted">70% 컷(교과등급)으로 공개된 학과가 없어요. 표에서 다른 기준 값을 볼 수 있어요.</p> :
          <div className="result-plot" role="list" aria-label="70% 컷 점 그래프">
            <div className="result-plot__axis" aria-hidden="true"><span />{<div className="result-plot__ticks">{ticks.map(t => <span key={t} style={{ left: x(t) }}>{t.toFixed(1)}</span>)}</div>}</div>
            {plotted.map(l => { const pts = axisPoints(l), lo = Math.min(...pts.map(p => p.value)), hi = Math.max(...pts.map(p => p.value));
              return <div role="listitem" className="result-plot__row" key={l.key} aria-label={`${l.unit} ${l.program} ${pts.map(p => `${p.year} ${p.value}`).join(', ')}`}>
                <div className="result-plot__head"><span>{l.unit}</span><Link className="t-link t-caption" to={programPath(university, l.program)}>{l.program}</Link></div>
                <div className="result-plot__track">{ticks.map(t => <i key={t} className="result-plot__grid" style={{ left: x(t) }} />)}
                  {pts.length > 1 && <i className="result-plot__span" style={{ left: x(lo), width: `calc(${x(hi)} - ${x(lo)})` }} />}
                  {pts.map(p => <i key={p.year} title={`${p.year} · 70% 컷 ${p.value}`} className={p.year === last ? 'dot dot--latest' : 'dot'} style={{ left: x(p.value) }} />)}</div>
              </div>; })}
          </div>}
        {tableOnly > 0 && <button className="text-button" onClick={() => setView('table')}>다른 기준으로 공개된 학과 {tableOnly}개는 표에서 볼 수 있어요 ›</button>}
      </> : <>
        <div className="table-scroll"><table className="data-table result-table">
          <thead><tr><th>모집단위</th><th>전형</th>{years.map(y => <th key={y} className="num">{y}</th>)}<th className="num">전년 대비</th><th className="num">경쟁률</th><th className="num">모집</th><th>기준</th><th>원문</th></tr></thead>
          <tbody>{lines.map(l => { const d = delta(l, years), c = l.years.get(last) ?? [...l.years.values()].pop()!;
            return <tr key={l.key}><td>{l.unit}</td><td><Link className="t-link" to={programPath(university, l.program)}>{l.program}</Link></td>{years.map(y => <td key={y} className={`num${y === last ? ' strong' : ''}`}>{fmt(l.years.get(y)?.cut70)}</td>)}
              <td className={`num ${d === null || d === 0 ? '' : d > 0 ? 'delta-up' : 'delta-down'}`}>{d === null ? '—' : d === 0 ? '0.00' : `${d > 0 ? '▲' : '▼'}${Math.abs(d).toFixed(2)}`}</td>
              <td className="num">{c.competition || '—'}</td><td className="num">{c.quota || '—'}</td><td>{basisLabel(l, last)}</td>
              <td><a className="t-link" href={c.source} target="_blank" rel="noreferrer">원문 ↗</a></td></tr>; })}</tbody></table></div>
        <p className="t-caption text-muted">표의 숫자는 70% 컷이에요. 전년 대비는 {last} 컷에서 {years[years.length - 2] ?? '이전 해'} 컷을 뺀 값이에요(같은 지표일 때만). 등급은 숫자가 작을수록 상위예요 — ▲는 컷 숫자가 커진 것, ▼는 작아진 것이에요.</p>
      </>}
    <p className="t-caption text-muted result-browser__source">출처: 각 대학 공식 수시 입시결과 · {years.join('·')}학년도 · 행마다 원문 링크</p>
    <Link className="t-link" to="/doelgak">내 성적으로 판정을 보려면 될각에서 확인해 주세요 ›</Link>
  </div>;
}
