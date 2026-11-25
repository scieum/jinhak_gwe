import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Link, useSearchParams } from 'react-router-dom';
import { InterestButton } from '../components/InterestButton';
import { PrepareProgram } from '../components/PrepareProgram';
import { Icon } from '../components/Icon';
import { ScreenActions } from '../components/ScreenActions';
import { SegmentedControl } from '../components/SegmentedControl';
import { UniversityLogo } from '../components/UniversityLogo';
import { useCompactResults } from '../components/ResultFilters';
import { interestId, programPath } from '../domain/interests';
import { useReleasedResults } from '../data/releasedResults';
import { loadAdmissionPlans } from '../data/admissionPlans';
import { useSampleMode } from '../data/sample/mode';
import { sampleUnivDetail } from '../data/sample/univDetail';
import { sampleProgramDetail } from '../data/sample/programDetail';
import { programLine, planView, programView, type Pair, type PdView, type UdChange, type UdProgram, type UdView } from '../domain/univDetail';
import { programLines, yearsOf } from '../domain/resultBrowse';
import { RESULT_NOTICE } from './AdmissionResults';
import '../styles/result-browser.css';
import '../styles/univ-detail.css';
import '../styles/program-detail.css';

function PlanLink({ name }: { name: string }) {
  return <p className="notice"><Link className="t-link" to={`/admissions-list?q=${encodeURIComponent(name)}`}>2028학년도 전형계획 확인하기</Link> · 시행계획·모집요강 자료는 변경될 수 있으므로 최종 모집요강을 확인해 주세요.</p>;
}

function Missing({ what }: { what: string }) {
  return <div className="empty-state"><h3 className="t-heading-3">{what}을 찾지 못했어요</h3><p>공개된 입결 자료에 있는 대학·전형만 볼 수 있어요.</p>
    <Link className="button-outline" to="/admission-results">수시 입결에서 찾기</Link></div>;
}

// 대학 상세(v2 시안 346:144159 · 346:143371). 샘플 모드 = 시안 데모(경희대학교), 지우면 2028 시행계획 목록의 그 대학.
const TABS = ['전체', '교과', '종합', '논술', '기타', '정시'] as const;
type Tab = (typeof TABS)[number];
type Sort = 'desc' | 'asc' | null;
type Loaded = { view: UdView | null; error: string } | null;

const Delta = ({ d }: { d?: number }) => d ? <span className={`ud-delta ud-delta--${d < 0 ? 'down' : 'up'}`}><span>{d < 0 ? '▼' : '▲'}</span><span>{Math.abs(d)}</span></span> : null;
const Next = ({ c }: { c: UdChange }) => <><strong>{c.next}</strong><Delta d={c.delta} /></>;
const Pending = ({ children }: { children: ReactNode }) => <div className="ud-pending"><span className="data-status-badge">준비 중</span><p>{children}</p></div>;

const COL_DEFAULT = [64, 200, 100, 92, 73];
/** 2026-11-25 사용자 요청: 열 경계를 끌거나(마우스·터치) 좌우 화살표로 너비를 바꿔요. 두 번 누르면 처음 너비. */
function ColResize({ label, i, cols, setCols }: { label: string; i: number; cols: number[]; setCols: (f: (c: number[]) => number[]) => void }) {
  const set = (w: number) => setCols(c => c.map((x, j) => j === i ? Math.min(480, Math.max(48, Math.round(w))) : x));
  const drag = (e: React.PointerEvent) => {
    e.preventDefault(); e.stopPropagation();
    const x0 = e.clientX, w0 = cols[i];
    const move = (ev: PointerEvent) => set(w0 + ev.clientX - x0);
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
  };
  return <span className="ud-col-resize" role="separator" aria-orientation="vertical" aria-label={`${label} 열 너비`} aria-valuenow={cols[i]} aria-valuemin={48} aria-valuemax={480} tabIndex={0}
    onPointerDown={drag} onClick={e => e.stopPropagation()} onDoubleClick={() => set(COL_DEFAULT[i])}
    onKeyDown={e => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); set(cols[i] + (e.key === 'ArrowRight' ? 8 : -8)); } }} />;
}

export function UnivDetail() {
  const [query] = useSearchParams(), name = query.get('u') ?? '';
  const sample = useSampleMode(), compact = useCompactResults();
  const demo = sample && (!name || name === sampleUnivDetail.university);
  const [loaded, setLoaded] = useState<Loaded>(null), [attempt, setAttempt] = useState(0);
  const [cols, setCols] = useState(COL_DEFAULT); // 전형 표 열 너비(유형~면접). 전형명은 남는 폭
  const [tab, setTab] = useState<Tab>('전체'), [sort, setSort] = useState<Sort>(null), [picked, setPicked] = useState<string | null>(null);
  const [head, setHead] = useState<Element | null>(null), [bar, setBar] = useState<Element | null>(null);
  useEffect(() => { setHead(compact ? null : document.querySelector('.topbar__heading')); setBar(compact ? document.getElementById('appbar-actions') : null); }, [compact]);
  useEffect(() => {
    if (demo) return;
    let live = true; setLoaded(null);
    loadAdmissionPlans().then(c => { const plan = c.entries.find(e => e.university === name); if (live) setLoaded({ view: plan ? planView(plan) : null, error: '' }); })
      .catch(e => { if (live) setLoaded({ view: null, error: e instanceof Error ? e.message : '대학 자료를 읽지 못했어요.' }); });
    return () => { live = false; };
  }, [demo, name, attempt]);
  const view = demo ? sampleUnivDetail : loaded?.view;
  const screen = (children: ReactNode) => <section className="student-screen ud" data-slug="univ-detail" aria-label="대학 상세">{children}</section>;
  if (!view) return screen(!loaded ? <p role="status" className="ud-status">대학 자료를 읽고 있어요.</p>
    : loaded.error ? <div className="ud-card ud-error" role="alert"><Icon name="triangle-alert" size={20} /><p>대학 자료를 읽지 못했어요. 연결을 확인하고 다시 읽어 주세요.</p><button type="button" className="button-outline" onClick={() => setAttempt(a => a + 1)}>다시 읽기</button></div>
      : <div className="empty-state ud-missing"><Icon name="search" size={48} /><h3 className="t-heading-4">대학을 찾지 못했어요</h3><p>{name ? `‘${name}’의 자료가 없어요. ` : ''}공개된 자료에 있는 대학만 볼 수 있어요.</p><Link className="button-primary" to={name ? `/admissions-list?q=${encodeURIComponent(name)}` : '/admissions-list'}>전형계획에서 찾기</Link></div>);

  const { programs, changes } = view, total = programs.length;
  const shown = programs.filter(p => tab === '전체' || p.type === tab);
  const ordered = sort ? [...shown].sort((a, b) => ((a.quota ?? -1) - (b.quota ?? -1)) * (sort === 'asc' ? 1 : -1)) : shown;
  const selected = programs.find(p => p.name === (picked ?? programs[0]?.name)), panel = selected && shown.includes(selected) ? selected : undefined;
  const count = (list: UdProgram[]) => `수시 ${list.filter(p => p.round === '수시').length} · 정시 ${list.filter(p => p.round === '정시').length}`;
  const note = <p className="disclaimer-note"><Icon name="info" size={16} /><span>대학 공식 자료가 최종 기준이에요 · 데이터 기준일 {view.checked}{sample ? ' · 샘플의 대학·숫자는 예시예요' : ''}</span></p>;
  const heart = (p?: UdProgram) => p && <InterestButton key={interestId(view.university, p.name)} university={view.university} program={p.name} compact />;
  const source = view.source && <div className="ud-source"><a className="button-pill-soft" href={view.source.url} target="_blank" rel="noreferrer">원문 보기 ↗</a><span>{compact ? view.source.short : view.source.label}</span></div>;
  const lead = !changes ? '전년 대비 비교는 2027학년도 자료가 모이면 보여요' : !changes.length ? '2027학년도와 비교해 바뀐 점이 없어요' : view.headline?.[compact ? 'mobile' : 'pc'] ?? '';
  const hero = <div className="stat-tile ud-tile">
    <p className="ud-tile__caption">{compact ? '2028학년도 · ' : `${view.university} · 2028학년도 `}{changes ? '전년 대비' : '시행계획'}</p>
    <p className="ud-tile__value">{changes ? `바뀐 점 ${changes.length}건` : `전형 ${total}개`}</p>
    <p className="ud-tile__lead">{lead}</p></div>;
  const empty = <div className="empty-state"><Icon name="search" /><h3 className="t-heading-4">이 유형의 2028 전형은 없어요</h3><p>다른 유형을 골라 보세요.</p><button type="button" className="button-pill-soft" onClick={() => setTab('전체')}>전체 보기</button></div>;
  const rows = (list: UdProgram[]) => <ul className="ud-rows">{list.map(p => <li key={p.name}><Link to={p.path}><span><strong>{p.name}</strong><span>{programLine(p)}</span></span><Icon name="chevron-right" /></Link></li>)}</ul>;

  if (compact) return screen(<>
    {bar && createPortal(<span className="data-status-badge ud-asof">{view.status}</span>, bar)}
    <div className="ud-name"><UniversityLogo university={view.university} /><div><h2>{view.university}</h2><p>{view.place}</p></div>{heart(programs[0])}</div>
    {hero}
    <Link className="t-link ud-wiki" to={`/univ-detail/wiki?u=${encodeURIComponent(view.university)}`}>대학 위키 보기 ›</Link>
    <section className="ud-card ud-changes" aria-label="전년 대비 바뀐 점">
      {!changes ? <Pending>2027학년도 자료가 아직 없어서 비교하지 않았어요</Pending> : changes.length > 0 && <ul className="ud-change-list">{changes.map(c => <li key={c.program + c.item}>
        <p>{c.program} · {c.item}</p><div className="ud-change-value"><span>{c.prev} →</span><span className="data-table ud-cell"><Next c={c} /></span></div></li>)}</ul>}
      {changes && source}
    </section>
    <section className="ud-card ud-list">
      <div className="ud-title"><h2>2028 전형 목록</h2><span>{shown.length}개</span></div>
      <div className="ud-chips" role="group" aria-label="전형 유형">{TABS.map(t => <button key={t} type="button" className="filter-chip" aria-pressed={t === tab} onClick={() => setTab(t)}>{t}</button>)}</div>
      {shown.length ? <><p className="ud-caption">{shown.length}개 모두 {view.status}이에요</p>
        {(['수시', '정시'] as const).map(r => { const list = shown.filter(p => p.round === r); return list.length > 0 && <div key={r} className="ud-group"><h3>{r} {list.length}개</h3>{rows(list)}</div>; })}</> : empty}
    </section>
    {note}
  </>);

  const changed = panel && changes?.filter(c => c.program === panel.name);
  return screen(<>
    {head && createPortal(<div className="ud-head"><p className="t-caption text-muted">대학 찾기 › 전형계획</p><h1>{view.university}</h1><p className="ud-lead">{view.place} · 2028학년도 전형 {total}개</p></div>, head)}
    <ScreenActions><span className="data-status-badge ud-asof">{view.status} · {view.checked}</span><Link className="button-outline ud-wiki-btn" to={`/univ-detail/wiki?u=${encodeURIComponent(view.university)}`}>대학 위키 보기</Link>{view.homepage && <a className="button-outline" href={view.homepage} target="_blank" rel="noreferrer">홈페이지 ↗</a>}</ScreenActions>
    <div className="ud-hero"><UniversityLogo university={view.university} />{hero}{heart(panel ?? programs[0])}</div>
    <section className="ud-card ud-changes"><h2 className="ud-h2">전년 대비 바뀐 점</h2>
      {!changes ? <Pending>2027학년도 자료가 아직 없어서 비교하지 않았어요</Pending> : changes.length > 0 && <table className="data-table ud-table ud-table--changes">
        <colgroup><col /><col style={{ width: 128 }} /><col style={{ width: 136 }} /><col style={{ width: 184 }} /></colgroup>
        <thead><tr><th scope="col">전형</th><th scope="col">항목</th><th scope="col" className="num">2027</th><th scope="col" className="num">2028</th></tr></thead>
        <tbody>{changes.map(c => <tr key={c.program + c.item}><td>{c.program}</td><td>{c.item}</td><td className="num">{c.prev}</td><td className="num"><Next c={c} /></td></tr>)}</tbody></table>}
      {changes && source}
    </section>
    <div className="ud-columns">
      <section className="ud-card ud-list">
        <div className="ud-title"><h2 className="ud-h2">2028 전형 목록</h2><span>{shown.length}개</span></div>
        <div className="ud-filter"><SegmentedControl label="전형 유형" value={tab} onChange={setTab} options={TABS.map(t => ({ value: t, label: t }))} /><span>{count(shown)}</span></div>
        {shown.length ? <><p className="ud-caption">{shown.length}개 모두 {view.status}이에요</p>
          <table className="data-table ud-table ud-table--programs">
            <colgroup><col />{cols.map((w, i) => <col key={i} style={{ width: w }} />)}</colgroup>
            <thead><tr><th scope="col">전형명</th><th scope="col">유형<ColResize label="유형" i={0} cols={cols} setCols={setCols} /></th><th scope="col">세부 유형<ColResize label="세부 유형" i={1} cols={cols} setCols={setCols} /></th>
              <th scope="col" aria-sort={sort === 'desc' ? 'descending' : sort === 'asc' ? 'ascending' : 'none'}><button type="button" className="ud-sort" data-on={sort ?? undefined} onClick={() => setSort(s => s === null ? 'desc' : s === 'desc' ? 'asc' : null)}>모집인원<Icon name="arrow-up-down" size={16} /></button><ColResize label="모집인원" i={2} cols={cols} setCols={setCols} /></th>
              <th scope="col">수능최저<ColResize label="수능최저" i={3} cols={cols} setCols={setCols} /></th><th scope="col">면접<ColResize label="면접" i={4} cols={cols} setCols={setCols} /></th></tr></thead>
            <tbody>{ordered.map(p => <tr key={p.name} tabIndex={0} aria-selected={p === panel} onClick={() => setPicked(p.name)} onKeyDown={e => { if (e.key === 'Enter') setPicked(p.name); }}>
              <td>{p.name}</td><td>{p.type}</td><td>{p.sub}</td><td className="num">{p.quota ?? '—'}</td><td>{p.minimum}</td><td>{p.interview}</td></tr>)}</tbody></table></> : empty}
      </section>
      <aside className="ud-card ud-panel" aria-label="선택한 전형 요약">{!panel ? <div className="ud-panel-empty"><Icon name="search" /><p>표에서 전형을 고르면 여기에 요약이 보여요.</p></div> : <>
        <div className="ud-panel__title"><h3>{panel.name}</h3><p>{panel.type} · {panel.sub} · {panel.round}</p></div>
        <table className="data-table ud-table ud-table--facts"><tbody>{panel.facts.map(([k, v]) => <tr key={k}><th scope="row">{k}</th><td>{v}</td></tr>)}</tbody></table>
        <div className="ud-panel__changes"><h4>이 전형에서 바뀐 점</h4>{!changed ? <span className="data-status-badge">준비 중</span> : !changed.length ? <p className="ud-muted">바뀐 점이 없어요</p>
          : changed.map(c => <div key={c.item} className="ud-compare"><p>{c.item}</p><p>{c.prev} → <Next c={c} /></p></div>)}</div>
        <div className="ud-panel__actions"><Link className="button-outline" to={panel.path}>전형 상세 보기</Link>{panel.source && <a className="button-pill-soft" href={panel.source} target="_blank" rel="noreferrer">원문 보기 ↗</a>}</div>
        <div className="ud-panel__status"><span className="data-status-badge">{view.status}</span><span>모집요강이 나오면 갱신돼요</span></div></>}
      </aside>
    </div>
    {note}
  </>);
}

export function ProgramDetail() {
  const [query] = useSearchParams(), name = query.get('u') ?? '', program = query.get('p') ?? '';
  const sample = useSampleMode(), units = useReleasedResults();
  const [plan, setPlan] = useState<PdView | null | undefined>(undefined);
  useEffect(() => {
    if (sample) return;
    let live = true; setPlan(undefined);
    loadAdmissionPlans().then(c => { const e = c.entries.find(x => x.university === name); if (live) setPlan(e ? programView(e, program) : null); })
      .catch(() => { if (live) setPlan(null); });
    return () => { live = false; };
  }, [sample, name, program]);
  const lines = units ? programLines(units, name, program) : [];
  // 샘플 모드: 샘플 입결에 있는 전형이면 입결 표, 아니면 시안 데모
  const view = sample ? (units && !lines.length ? sampleProgramDetail : null) : plan;
  if (view) return <PlanDetail view={view} sample={sample} />;
  if (!units || (!sample && plan === undefined)) return <section className="student-screen" data-slug="program-detail"><p role="status">전형 자료를 읽고 있어요.</p></section>;
  if (!lines.length) return <section className="student-screen" data-slug="program-detail"><Missing what="전형" /></section>;
  return <ResultDetail name={name} program={program} lines={lines} />;
}

function useShellSlots(compact: boolean) {
  const [head, setHead] = useState<Element | null>(null), [bar, setBar] = useState<Element | null>(null);
  useEffect(() => { setHead(compact ? null : document.querySelector('.topbar__heading')); setBar(compact ? document.getElementById('appbar-actions') : null); }, [compact]);
  return { head, bar };
}

const Pairs = ({ rows }: { rows: Pair[] }) => <table className="data-table ud-table pd-table"><tbody>{rows.map(([k, v]) => <tr key={k}><th scope="row">{k}</th><td>{v}</td></tr>)}</tbody></table>;
const Card = ({ title, children, className = '' }: { title: string; children: ReactNode; className?: string }) =>
  <section className={`ud-card pd-card ${className}`} aria-label={title}><h2 className="pd-h2">{title}</h2>{children}</section>;

function PlanDetail({ view: v, sample }: { view: PdView; sample: boolean }) {
  const compact = useCompactResults(), { head, bar } = useShellSlots(compact);
  const heart = <InterestButton key={interestId(v.university, v.program)} university={v.university} program={v.program} compact />;
  const tile = <div className="stat-tile ud-tile">
    <p className="ud-tile__caption">{compact ? '' : `${v.university} · `}2028 {v.round} · 모집인원</p>
    <p className="ud-tile__value">{v.quota}</p><p className="ud-tile__lead">{v.lead[compact ? 'mobile' : 'pc']}</p></div>;
  const facts = <dl className="pd-facts">{v.facts.map(([k, x]) => <div key={k}><dt>{k}</dt><dd>{x}</dd></div>)}</dl>;
  const { method: m } = v;
  const method = <Card title="전형요소와 비율"><p className="pd-lead">{m.lead}</p>
    {m.table && <table className="data-table ud-table pd-table pd-table--grid"><thead><tr>{m.table.head.map((h, i) => <th key={h} scope="col" className={i >= 2 ? 'num' : undefined}>{h}</th>)}</tr></thead>
      <tbody>{m.table.rows.map(r => <tr key={r[0]}>{r.map((c, i) => <td key={i} className={i >= 2 ? 'num' : undefined}>{c}</td>)}</tr>)}</tbody></table>}
    {m.note && <p className="pd-note">{m.note}</p>}</Card>;
  const eligibility = v.eligibility.length > 0 && <Card title="지원자격"><Pairs rows={v.eligibility} /></Card>;
  const minimum = v.minimum && <Card title="수능최저학력기준"><Pairs rows={v.minimum.rows} />{v.minimum.original && <p className="pd-note">{v.minimum.original}</p>}</Card>;
  const schedule = v.schedule.length > 0 && <Card title="일정" className="pd-card--schedule"><Pairs rows={v.schedule} />{!compact && <p className="pd-note">일정은 대학 사정으로 바뀔 수 있어요. 원문에서 꼭 확인해 주세요.</p>}</Card>;
  const record = v.record.length > 0 && <Card title="교과 반영 방법"><Pairs rows={v.record} /></Card>;
  const note = <p className="disclaimer-note"><Icon name="info" size={16} /><span>대학 공식 자료가 최종 기준이에요 · 데이터 기준일 {v.checked}{sample ? ' · 샘플의 대학·숫자는 예시예요' : ''}</span></p>;
  const screen = (children: ReactNode) => <section className="student-screen ud pd" data-slug="program-detail" aria-label="전형 상세">{children}</section>;

  if (compact) return screen(<>
    {bar && createPortal(<span className="data-status-badge ud-asof">{v.status}</span>, bar)}
    <div className="pd-head"><div className="pd-name"><UniversityLogo university={v.university} /><p>{v.university}</p>{heart}</div><h2 className="pd-title">{v.program}</h2></div>
    <div className="pd-summary">{tile}{facts}</div>
    {method}{eligibility}{minimum}{schedule}{record}
    {v.source && <section className="ud-card pd-source" aria-label="출처와 원문"><p>{v.source.label}</p><a className="button-pill-soft" href={v.source.url} target="_blank" rel="noreferrer">원문 보기 ↗</a></section>}
    {note}
  </>);
  return screen(<>
    {head && createPortal(<div className="ud-head"><p className="t-caption text-muted">대학 찾기 › 전형계획</p><h1>{v.program}</h1><p className="ud-lead">{v.university} · 2028 {v.round} · {v.type}</p></div>, head)}
    <ScreenActions><span className="data-status-badge ud-asof">{v.status} · {v.checked}</span>{v.source && <a className="button-outline" href={v.source.url} target="_blank" rel="noreferrer">원문 보기 ↗</a>}</ScreenActions>
    <div className="ud-hero"><UniversityLogo university={v.university} /><div className="pd-hero">{tile}{facts}</div>{heart}</div>
    <div className="pd-columns"><div className="pd-col">{method}{eligibility}{record}</div>
      <div className="pd-col">{schedule}{minimum}{v.source && <section className="ud-card pd-source" aria-label="출처"><p>{v.source.label}</p></section>}</div></div>
    {note}
  </>);
}

// 시행계획에 없는 전형(공개 입결의 전형명으로 들어온 링크)은 예전처럼 모집단위별 70% 컷을 보여 줘요.
function ResultDetail({ name, program, lines }: { name: string; program: string; lines: ReturnType<typeof programLines> }) {
  const years = yearsOf(lines), last = years[years.length - 1];
  return <section className="student-screen" data-slug="program-detail" aria-label="전형 상세">
    <div className="screen-heading"><div><p className="t-caption text-muted"><Link className="t-link" to={`/univ-detail?u=${encodeURIComponent(name)}`}>{name}</Link></p>
      <h2 className="t-heading-1">{program}</h2><span className="data-status-badge">공개 입결 기준</span></div></div>
    <Link className="t-link" to="/admission-results?view=interests">관심 전형 모아보기</Link>
    <PrepareProgram key={programPath(name, program)} university={name} program={program} />
    <PlanLink name={name} />
    <h3 className="t-heading-2">모집단위별 70% 컷</h3>
    <p className="t-caption text-muted">관심 있는 학과 옆의 하트를 눌러 저장하세요. 같은 전형의 다른 학과는 함께 저장되지 않아요.</p>
    <div className="table-scroll"><table className="data-table result-table">
      <thead><tr><th>모집단위</th>{years.map(y => <th key={y} className="num">{y}</th>)}<th className="num">경쟁률</th><th className="num">모집</th><th>기준</th><th>원문</th></tr></thead>
      <tbody>{lines.map(l => { const c = l.years.get(last) ?? [...l.years.values()].pop()!;
        return <tr key={l.key}><td><div className="collection-program">{l.unit.trim() && <InterestButton key={interestId(name, program, l.unit)} university={name} program={program} department={l.unit} compact />}<span>{l.unit}</span></div></td>{years.map(y => <td key={y} className={`num${y === last ? ' strong' : ''}`}>{l.years.get(y)?.cut70 ?? '—'}</td>)}
          <td className="num">{c.competition || '—'}</td><td className="num">{c.quota || '—'}</td><td>{[c.metric || '지표 미기재', c.basis].filter(Boolean).join(' · ')}</td>
          <td><a className="t-link" href={c.source} target="_blank" rel="noreferrer">원문 ↗</a></td></tr>; })}</tbody></table></div>
    <p className="t-caption text-muted">경쟁률·모집은 가장 최근 학년도 값이에요. 기준이 다른 값은 서로 바로 비교하지 않아요.</p>
    <p className="disclaimer-note">{RESULT_NOTICE}</p>
  </section>;
}
