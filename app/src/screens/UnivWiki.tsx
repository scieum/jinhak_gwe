import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Link, useSearchParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { InterestButton } from '../components/InterestButton';
import { ScreenActions } from '../components/ScreenActions';
import { SegmentedControl } from '../components/SegmentedControl';
import { UniversityLogo } from '../components/UniversityLogo';
import { useCompactResults } from '../components/ResultFilters';
import { interestId } from '../domain/interests';
import { programLine, planView, type UdProgram, type UdView } from '../domain/univDetail';
import { departmentsOf, signed, similarUniversities, SIMILAR_MAX, SIMILAR_MIN, SIMILAR_RANGE, WIKI_SECTIONS, type WikiSection, type WikiSectionKey } from '../domain/univWiki';
import { loadAdmissionPlans } from '../data/admissionPlans';
import { useReleasedResults } from '../data/releasedResults';
import { useUnivWiki } from '../data/univWiki';
import { useSampleMode } from '../data/sample/mode';
import { sampleUnivDetail } from '../data/sample/univDetail';
import { sampleSimilarDemo, sampleWikiDemo, type WikiDemoSource } from '../data/sample/univWiki';
import '../styles/univ-detail.css';
import '../styles/univ-wiki.css';

// 대학 위키(시안 univ-detail-wiki 365:38171 · 365:38085). 대학 상세(/univ-detail)와 따로 /univ-detail/wiki?u=… 로 열어요(2026-11-25 사용자 결정).
// 샘플 모드 = 시안 데모(경희대학교), 실제 모드 = 시행계획 목록 + 관리자 2인 검수를 마친 위키 요약(univ-wiki.json)만. 검수 전 섹션은 제목 + "준비 중"(spec D4).
const ANCHORS = [['wiki-overview', '개요'], ['wiki-notes', '특이점'], ['wiki-method', '반영 방법'], ['wiki-minimum', '수능 최저'], ['wiki-elements', '전형요소'], ['wiki-similar', '비슷한 대학']] as const;
const ROUNDS = ['전체', '수시', '정시'] as const;
const TYPES = ['교과', '종합'] as const;
type Round = (typeof ROUNDS)[number];
type Type = (typeof TYPES)[number];
type SimRow = { university: string; unit: string; cut: number; diff: number; relation: string };
type Sim = { status: 'pending'; reason: string } | { status: 'ok' | 'short'; base: { unit: string; type: Type; cut: number; year: number }; rows: SimRow[]; steps: string[] };
const typeName = (t: Type) => `학생부${t}`;
const wikiPath = (u: string) => `/univ-detail/wiki?u=${encodeURIComponent(u)}`;

/** sub-nav 변형 anchor(spec 9장 제안 1): 누르면 그 섹션으로, 스크롤하면 위에 걸린 섹션의 탭이 선택. */
function AnchorNav() {
  const [active, setActive] = useState<string>(ANCHORS[0][0]);
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return; // jsdom: 누를 때만 바뀐다
    const seen = new Map<string, boolean>();
    const io = new IntersectionObserver(es => {
      es.forEach(e => seen.set(e.target.id, e.isIntersecting));
      const top = ANCHORS.find(([id]) => seen.get(id));
      if (top) setActive(top[0]);
    }, { rootMargin: '-120px 0px -60% 0px' });
    ANCHORS.forEach(([id]) => { const el = document.getElementById(id); if (el) io.observe(el); });
    return () => io.disconnect();
  }, []);
  return <nav className="sub-nav sub-nav--anchor" aria-label="섹션 이동">
    {ANCHORS.map(([id, label]) => <a key={id} href={`#${id}`} className="sub-nav__tab" aria-current={active === id ? 'location' : undefined} onClick={() => setActive(id)}>{label}</a>)}
  </nav>;
}

const Source = ({ s }: { s: WikiDemoSource }) => <div className="uw-source"><a className="button-pill-soft" href={s.url} target="_blank" rel="noreferrer">원문 보기 ↗</a><span>{s.label}</span></div>;
const Badge = ({ reviewed }: { reviewed?: string }) => <span className="data-status-badge">{reviewed ? `공식 문서 요약 · 검수일 ${reviewed}` : '준비 중'}</span>;
function Section({ id, title, reviewed, children, head }: { id: string; title: string; reviewed?: string; children?: ReactNode; head?: ReactNode }) {
  return <section id={id} className="uw-section" aria-label={title}>
    <div className="uw-head"><h2>{title}</h2>{head ?? <Badge reviewed={reviewed} />}</div>{children}</section>;
}
const Table = ({ cols, head, rows }: { cols: (number | null)[]; head: string[]; rows: ReactNode[][] }) =>
  <table className="data-table ud-table uw-table"><colgroup>{cols.map((w, i) => <col key={i} style={w ? { width: w } : undefined} />)}</colgroup>
    <thead><tr>{head.map(h => <th key={h} scope="col">{h}</th>)}</tr></thead>
    <tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, k) => <td key={k}>{c}</td>)}</tr>)}</tbody></table>;

/** 실제 모드: 검수된 위키 요약(머리 · 글 · 출처)을 그대로 줄로 보여요. */
const Facts = ({ s }: { s: WikiSection }) => <ul className="uw-facts">{s.items.map((i, k) => <li key={k}>
  <p>{i.heading && <strong>{i.heading} · </strong>}{i.text}</p><Source s={{ label: `출처: ${i.source_label}`, url: i.source_url }} /></li>)}</ul>;

export function UnivWiki() {
  const [query] = useSearchParams(), name = query.get('u') ?? '';
  const sample = useSampleMode(), compact = useCompactResults();
  const demo = sample && (!name || name === sampleUnivDetail.university);
  const [loaded, setLoaded] = useState<{ view: UdView | null; error: string } | null>(null), [attempt, setAttempt] = useState(0);
  const wiki = useUnivWiki(), units = useReleasedResults();
  const [round, setRound] = useState<Round>('전체'), [sort, setSort] = useState<'desc' | 'asc' | null>(null), [picked, setPicked] = useState<string | null>(null);
  const [opened, setOpened] = useState<Set<number>>(new Set([0]));
  const [type, setType] = useState<Type>('교과'), [unit, setUnit] = useState<string | null>(null);
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
  const screen = (children: ReactNode) => <section className="student-screen ud uw" data-slug="univ-detail-wiki" aria-label="대학 위키">{children}</section>;
  if (!view) return screen(!loaded ? <p role="status" className="ud-status">대학 자료를 읽고 있어요.</p>
    : loaded.error ? <div className="ud-card ud-error" role="alert"><Icon name="triangle-alert" size={20} /><p>대학 자료를 읽지 못했어요. 연결을 확인하고 다시 읽어 주세요.</p><button type="button" className="button-outline" onClick={() => setAttempt(a => a + 1)}>다시 읽기</button></div>
      : <div className="empty-state"><Icon name="search" /><h3 className="t-heading-4">대학을 찾지 못했어요</h3><p>공개된 자료에 있는 대학만 볼 수 있어요.</p><Link className="button-primary" to="/admissions-list">전형계획에서 찾기</Link></div>);

  const { programs, changes } = view, u = view.university;
  const shown = programs.filter(p => round === '전체' || p.round === round);
  const ordered = sort ? [...shown].sort((a, b) => ((a.quota ?? -1) - (b.quota ?? -1)) * (sort === 'asc' ? 1 : -1)) : shown;
  const selected = picked ?? programs[0]?.name;
  const sections = demo ? null : wiki?.sections.get(u);
  const reviewed = (k: WikiSectionKey) => demo ? sampleWikiDemo.reviewed : sections?.[k]?.reviewed_at;
  const title = (k: WikiSectionKey) => WIKI_SECTIONS.find(s => s.key === k)!.title;
  const heart = programs[0] && <InterestButton key={interestId(u, programs[0].name)} university={u} program={programs[0].name} compact />;
  const lead = !changes ? '전년 대비 비교는 2027학년도 자료가 모이면 보여요' : !changes.length ? '2027학년도와 비교해 바뀐 점이 없어요' : view.headline?.[compact ? 'mobile' : 'pc'] ?? '';
  const tile = <div className="stat-tile ud-tile">
    <p className="ud-tile__caption">{compact ? '2028학년도 · ' : `${u} · 2028학년도 `}{changes ? '전년 대비' : '시행계획'}</p>
    <p className="ud-tile__value">{changes ? `바뀐 점 ${changes.length}건` : `전형 ${programs.length}개`}</p>
    <p className="ud-tile__lead">{lead}</p></div>;
  const Next = ({ c }: { c: NonNullable<UdView['changes']>[number] }) => <><strong>{c.next}</strong>{c.delta ? <span className={`ud-delta ud-delta--${c.delta < 0 ? 'down' : 'up'}`}><span>{c.delta < 0 ? '▼' : '▲'}</span><span>{Math.abs(c.delta)}</span></span> : null}</>;
  const udSource = view.source && <div className="ud-source"><a className="button-pill-soft" href={view.source.url} target="_blank" rel="noreferrer">원문 보기 ↗</a><span>{compact ? view.source.short : view.source.label}</span></div>;
  const pending = <div className="ud-pending"><span className="data-status-badge">준비 중</span><p>2027학년도 자료가 아직 없어서 비교하지 않았어요</p></div>;
  const roundControl = <SegmentedControl label="모집 시기" value={round} onChange={setRound} options={ROUNDS.map(r => ({ value: r, label: r }))} />;
  const pc = (p: UdProgram[]) => `수시 ${p.filter(x => x.round === '수시').length} · 정시 ${p.filter(x => x.round === '정시').length}`;

  // 위키 4섹션: 데모는 시안 구조(표 · 접이식 행), 실제 모드는 검수된 요약 줄
  const generic = (k: WikiSectionKey) => sections?.[k] && <div className="uw-card"><Facts s={sections[k]!} /></div>;
  const notes = demo ? <ul className="uw-facts">{sampleWikiDemo.notes.map(n => <li key={n.text}><p>{n.text}</p><Source s={n.source} /></li>)}</ul> : sections?.notes && <Facts s={sections.notes} />;
  const m = sampleWikiDemo.method, mi = sampleWikiDemo.minimum, el = sampleWikiDemo.elements;
  const method = !demo ? generic('method') : compact
    ? <div className="uw-card uw-rows">{m.rows.map((r, i) => { const open = opened.has(i); return <div key={r.program} className="uw-row">
      <button type="button" className="uw-row__head" aria-expanded={open} onClick={() => setOpened(s => { const n = new Set(s); if (open) n.delete(i); else n.add(i); return n; })}>
        <span>{r.program}</span><Icon name={open ? 'chevron-down' : 'chevron-right'} /></button>
      {open && <div className="uw-row__body"><dl className="uw-pairs">{([['반영 교과', r.subjects], ['반영 방법', r.how], ['학년별 비율', r.years], ['출결', r.attendance]] as const).map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
        <Source s={r.source} /></div>}</div>; })}</div>
    : <><Table cols={[220, 300, 300, 120, null]} head={['전형', '반영 교과', '반영 방법', '학년별 비율', '출결']} rows={m.rows.map(r => [r.program, r.subjects, r.how, r.years, r.attendance])} /><Source s={m.source} /></>;
  const minimum = !demo ? generic('minimum') : compact
    ? <div className="uw-card uw-list">{mi.rows.map(r => <div key={r.program}><strong>{r.program}</strong><p>{r.rule}</p><span>한국사 {r.history}</span></div>)}<Source s={mi.source} /></div>
    : <><Table cols={[320, 560, null]} head={['전형', '기준', '한국사']} rows={mi.rows.map(r => [r.program, r.rule, r.history])} /><Source s={mi.source} /></>;
  // 단계가 여럿이면 비율 글에 단계가 이미 들어 있어서 앞에 붙이지 않아요(시안)
  const elements = !demo ? generic('elements') : compact
    ? <div className="uw-card uw-list uw-list--sm">{el.rows.map(r => <div key={r.program}><strong>{r.program}</strong><p>{r.stage === '일괄' ? `${r.stage} · ${r.ratio}` : r.ratio}</p></div>)}<Source s={el.source} /></div>
    : <><Table cols={[320, 160, null]} head={['전형', '선발 단계', '요소와 비율']} rows={el.rows.map(r => [r.program, r.stage, r.ratio])} /><Source s={el.source} /></>;

  // 입결이 비슷한 대학: 데모는 시안 값, 실제 모드는 검수된 공개 입결 + 계열표로 계산(similarUniversities)
  const depts = demo ? [sampleSimilarDemo.base.unit] : units ? [...new Set(departmentsOf(units, u).filter(d => d.type === type).map(d => d.unit))] : [];
  const dept = unit && depts.includes(unit) ? unit : depts[0];
  const sim: Sim = (() => {
    const rangeSteps = (cut: number) => [`범위: ${(cut - SIMILAR_RANGE).toFixed(1)} ~ ${(cut + SIMILAR_RANGE).toFixed(1)} (차이 ±${SIMILAR_RANGE})`, `조건: 같은 전형 유형(${type}) · 같은 계열 또는 관련 계열 · 다른 대학`, '관리자가 검수해 공개한 입결과 계열표만 써요'];
    if (demo) {
      const b = sampleSimilarDemo.base;
      if (type !== b.type) return { status: 'pending', reason: '이 학과의 학생부종합 공개 입결이 아직 없어요' };
      return { status: 'ok', base: b, rows: sampleSimilarDemo.rows, steps: [`기준: ${u} ${b.unit} ${b.type} 70% 컷 ${b.cut.toFixed(1)} (${b.year}학년도 · 9등급)`, ...rangeSteps(b.cut), `차이가 작은 순으로 최대 ${SIMILAR_MAX}개 → ${sampleSimilarDemo.rows.length}개`] };
    }
    const d = units && dept ? departmentsOf(units, u).find(x => x.unit === dept && x.type === type) : undefined;
    if (!d || !wiki) return { status: 'pending', reason: '이 학과의 공개 입결이 아직 없어요' };
    const r = similarUniversities(units!, wiki.fields, u, d);
    if (r.status === 'pending') return r;
    return { status: r.status, base: { unit: d.unit, type, cut: r.base.cut, year: r.base.year }, rows: r.rows, steps: [
      `기준: ${u} ${d.unit} ${type} 70% 컷 ${r.base.cut.toFixed(1)} (${r.base.year}학년도 · 9등급)`, ...rangeSteps(r.base.cut),
      ...r.outside.map(o => `범위 밖이라 뺐어요: ${o.university} ${o.unit} ${o.cut.toFixed(1)} (${signed(o.diff)})`),
      r.status === 'ok' ? `차이가 작은 순으로 최대 ${SIMILAR_MAX}개 → ${r.rows.length}개` : `범위 안 ${r.rows.length}개 — ${SIMILAR_MIN}개보다 적어서 목록을 만들지 않아요`] };
  })();
  const deptPicker = depts.length > 0 && <label className="button-pill-soft uw-dept">{`${dept} ▾`}
    <select aria-label="학과 고르기" value={dept} onChange={e => setUnit(e.target.value)}>{depts.map(d => <option key={d}>{d}</option>)}</select></label>;
  const simHead = <div className="uw-controls">{deptPicker}<SegmentedControl label="전형 유형" value={type} onChange={setType} options={TYPES.map(t => ({ value: t, label: t }))} /></div>;
  const year = sim.status !== 'pending' ? sim.base.year : null;
  const simNote = <p className="disclaimer-note"><Icon name="info" size={16} /><span>{year ? `${year}학년도 ` : ''}입결 숫자가 가깝다는 뜻이에요 · 대학 공식 자료가 최종 기준이에요{sample ? ' · 샘플의 대학·숫자는 예시예요' : ''}</span></p>;
  const similar = sim.status === 'pending' ? <div className="ud-pending"><span className="data-status-badge">준비 중</span><p>{sim.reason}</p></div> : <>
    <div className="uw-method"><p>{u} {sim.base.unit} {sim.base.type} 70% 컷 {sim.base.cut.toFixed(1)}과 차이 ±{SIMILAR_RANGE} 이내인 같은 계열 · 관련 계열 학과예요</p>
      {compact ? <><span>관리자가 검수한 입결만 비교해요 · {sim.base.year}학년도 · 9등급 기준 · 같은 대학 학과는 빼요</span><span>등급은 숫자가 작을수록 상위예요</span></>
        : <span>관리자가 검수한 입결만 비교해요 · {sim.base.year}학년도 · 9등급 기준 · 같은 대학 학과는 빼요 · 등급은 숫자가 작을수록 상위예요</span>}</div>
    {sim.status === 'short' && <div className="empty-state"><h3 className="t-heading-4">비교할 입결이 아직 부족해요</h3><p>다른 학과를 골라 보세요.</p></div>}
    {compact ? <>
      <div className="uw-base"><span>지금 보고 있는 학과</span>
        <Link className="univ-card uw-ucard uw-ucard--base" to={`/univ-detail?u=${encodeURIComponent(u)}`}><span className="uw-ucard__head"><UniversityLogo university={u} /><strong>{u}</strong><Icon name="chevron-right" /></span>
          <span>{sim.base.unit} · {typeName(sim.base.type)}</span><span className="uw-ucard__cut">70% 컷 {sim.base.cut.toFixed(1)}</span></Link></div>
      {sim.status === 'ok' && <div className="uw-ucards">{sim.rows.map(r => <Link key={r.university + r.unit} className="univ-card uw-ucard" to={wikiPath(r.university)}>
        <span className="uw-ucard__head"><UniversityLogo university={r.university} /><strong>{r.university}</strong><Icon name="chevron-right" /></span>
        <span>{r.unit} · {typeName(sim.base.type)} · {r.relation}</span><span className="uw-ucard__cut">70% 컷 {r.cut.toFixed(1)} · 차이 {signed(r.diff)}</span></Link>)}</div>}
    </> : <table className="data-table ud-table uw-table uw-sim">
      <colgroup><col /><col style={{ width: 200 }} /><col style={{ width: 180 }} /><col style={{ width: 140 }} /><col style={{ width: 140 }} /><col style={{ width: 72 }} /></colgroup>
      <thead><tr><th scope="col">대학 · 학과</th><th scope="col">전형</th><th scope="col">계열 관계</th><th scope="col" className="num">70% 컷</th><th scope="col" className="num">차이</th><th scope="col"><span className="sr-only">열기</span></th></tr></thead>
      <tbody>{[{ university: u, unit: sim.base.unit, cut: sim.base.cut, diff: null as number | null, relation: '—', base: true }, ...(sim.status === 'ok' ? sim.rows.map(r => ({ ...r, base: false })) : [])].map(r =>
        <tr key={r.university + r.unit} className={r.base ? 'uw-sim__base' : undefined}>
          <td>{r.base && <span className="uw-sim__caption">지금 보고 있는 학과</span>}<span className="uw-sim__name"><UniversityLogo university={r.university} /><span><span>{r.university}</span><span>{r.unit}</span></span></span></td>
          <td>{typeName(sim.base.type)}</td><td>{r.relation}</td><td className="num">{r.cut.toFixed(1)}</td><td className="num">{r.diff === null ? '—' : signed(r.diff)}</td>
          <td><Link to={r.base ? `/univ-detail?u=${encodeURIComponent(u)}` : wikiPath(r.university)} aria-label={`${r.university} ${r.base ? '대학 상세' : '위키'} 보기`}><Icon name="chevron-right" size={20} /></Link></td></tr>)}</tbody></table>}
    <details className="trace-accordion"><summary><span>어떻게 골랐나요?</span><Icon name="chevron-down" size={20} /></summary><ol>{sim.steps.map(s => <li key={s}>{s}</li>)}</ol></details>
    {simNote}</>;
  const pageNote = <p className="disclaimer-note"><Icon name="info" size={16} /><span>대학 공식 문서(시행계획)를 관리자가 검수한 뒤 요약했어요 · 원문이 최종 기준이에요 · 검수 전 내용은 보여 주지 않아요 · 입결이 비슷한 대학은 검수된 {year ? `${year}학년도 ` : '공개 '}입결 숫자가 가까운 학과예요 · 데이터 기준일 {view.checked}{sample ? ' · 샘플의 대학·숫자는 예시예요' : ''}</span></p>;
  const wikiSections = <>
    <Section id="wiki-method" title={title('method')} reviewed={reviewed('method')}>{method}</Section>
    <Section id="wiki-minimum" title={title('minimum')} reviewed={reviewed('minimum')}>{minimum}</Section>
    <Section id="wiki-elements" title={title('elements')} reviewed={reviewed('elements')}>{elements}</Section>
    <Section id="wiki-similar" title="입결이 비슷한 대학" head={simHead}>{similar}</Section>
    {pageNote}</>;

  if (compact) return screen(<>
    {bar && createPortal(<span className="data-status-badge ud-asof">{view.status}</span>, bar)}
    <AnchorNav />
    <div id="wiki-overview" className="ud-name"><UniversityLogo university={u} /><div><h2>{u}</h2><p>{view.place}</p></div>{heart}</div>
    {tile}
    <Section id="wiki-notes" title={title('notes')} reviewed={reviewed('notes')}>{notes}</Section>
    <section className="ud-card ud-changes" aria-label="전년 대비 바뀐 점">
      {!changes ? pending : changes.length > 0 && <ul className="ud-change-list">{changes.map(c => <li key={c.program + c.item}>
        <p>{c.program} · {c.item}</p><div className="ud-change-value"><span>{c.prev} →</span><span className="data-table ud-cell"><Next c={c} /></span></div></li>)}</ul>}
      {changes && udSource}
    </section>
    <section className="ud-card ud-list">
      <div className="ud-title"><h2>2028 전형 목록</h2><span>{programs.length}개</span></div>
      {roundControl}
      {(['수시', '정시'] as const).map(r => { const list = shown.filter(p => p.round === r); return list.length > 0 && <div key={r} className="ud-group"><h3>{r} {list.length}개</h3>
        <ul className="ud-rows">{list.map(p => <li key={p.name}><Link to={p.path}><span><strong>{p.name}</strong><span>{programLine(p)}</span></span><Icon name="chevron-right" /></Link></li>)}</ul></div>; })}
    </section>
    {wikiSections}
  </>);

  return screen(<>
    {head && createPortal(<div className="ud-head"><p className="t-caption text-muted">대학 찾기 › 전형계획</p><h1>{u}</h1><p className="ud-lead">{view.place} · 2028학년도 전형 {programs.length}개</p></div>, head)}
    <ScreenActions><span className="data-status-badge ud-asof">{view.status} · {view.checked}</span>{view.homepage && <a className="button-outline" href={view.homepage} target="_blank" rel="noreferrer">홈페이지 ↗</a>}</ScreenActions>
    <AnchorNav />
    <div id="wiki-overview" className="ud-hero"><UniversityLogo university={u} />{tile}{heart}</div>
    <Section id="wiki-notes" title={title('notes')} reviewed={reviewed('notes')}>{notes}</Section>
    <section className="ud-card ud-changes"><h2 className="ud-h2">전년 대비 바뀐 점</h2>
      {!changes ? pending : changes.length > 0 && <table className="data-table ud-table ud-table--changes">
        <colgroup><col /><col style={{ width: 128 }} /><col style={{ width: 136 }} /><col style={{ width: 184 }} /></colgroup>
        <thead><tr><th scope="col">전형</th><th scope="col">항목</th><th scope="col" className="num">2027</th><th scope="col" className="num">2028</th></tr></thead>
        <tbody>{changes.map(c => <tr key={c.program + c.item}><td>{c.program}</td><td>{c.item}</td><td className="num">{c.prev}</td><td className="num"><Next c={c} /></td></tr>)}</tbody></table>}
      {changes && udSource}
    </section>
    <section className="ud-card ud-list">
      <div className="ud-title"><h2 className="ud-h2">2028 전형 목록</h2><span>{programs.length}개</span></div>
      <div className="ud-filter">{roundControl}<span>{pc(shown)}</span></div>
      <table className="data-table ud-table ud-table--programs uw-table uw-programs">
        <colgroup><col /><col style={{ width: 80 }} /><col style={{ width: 112 }} /><col style={{ width: 104 }} /><col style={{ width: 80 }} /><col style={{ width: 116 }} /></colgroup>
        <thead><tr><th scope="col">전형명</th><th scope="col">유형</th>
          <th scope="col" className="num" aria-sort={sort === 'desc' ? 'descending' : sort === 'asc' ? 'ascending' : 'none'}><button type="button" className="uw-sort" data-on={sort ?? undefined} onClick={() => setSort(s => s === null ? 'desc' : s === 'desc' ? 'asc' : null)}>모집인원<Icon name="arrow-up-down" size={16} /></button></th>
          <th scope="col">수능최저</th><th scope="col">면접</th><th scope="col">데이터 상태</th></tr></thead>
        <tbody>{ordered.map(p => <tr key={p.name} tabIndex={0} aria-selected={p.name === selected} onClick={() => setPicked(p.name)} onKeyDown={e => { if (e.key === 'Enter') setPicked(p.name); }}>
          <td><Link to={p.path}>{p.name}</Link></td><td>{p.type}</td><td className="num">{p.quota ?? '—'}</td><td>{p.minimum}</td><td>{p.interview}</td><td><span className="data-status-badge">{view.status}</span></td></tr>)}</tbody></table>
    </section>
    {wikiSections}
  </>);
}
