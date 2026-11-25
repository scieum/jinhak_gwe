// 대학 지도(work/univ-map/02-spec.md · 05-build.json). 전국 보기(시·도별 개수 표식) ↔ 시·도 보기(핀 · 묶음 핀 · 선택 핀), 목록 대안.
// 계산 · 판정 없음: 판정 색 · 입결 · 순위 없이 개수만. Route Blue는 선택된 시·도 · 핀 · 컨트롤 선택 · 링크에만(D21).
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { SIDO } from '../domain/auth';
import {
  applyFilters, clusterPins, clusterPlace, countBySido, filtersOn, FOUNDINGS, NO_FILTERS, searchCampuses, SHORT, sortCampuses,
  type Campus, type Filters, type Kind,
} from '../domain/univMap';
import { BOUNDARY_SOURCE, project, SIDO_SHAPES, type Sido } from '../assets/map/sido';
import { DISTRICT_DATE, DISTRICT_SOURCE, REGION_BOUNDARIES, districtLabels } from '../assets/map/districts';
import { useUnivMap } from '../data/univMap';
import { useSampleMode } from '../data/sample/mode';
import { SAMPLE_UNIV_MAP_SOURCE, sampleUnivMap } from '../data/sample/univMap';
import { ScreenActions } from '../components/ScreenActions';
import { UniversityLogo } from '../components/UniversityLogo';
import { Modal } from '../components/Modal';
import { Icon } from '../components/Icon';
import { useCompactResults } from '../components/ResultFilters';
import '../styles/univ-map.css';

type Sheet = 'region' | 'founding' | 'campus' | 'kind' | 'sort' | { cluster: string[] };
type View = { x: number; y: number; w: number; h: number };
const PX = { compact: { w: 350, h: 440 }, wide: { w: 636, h: 540 } }; // 지도 칸 크기(spec M6 · P3) — 24px 묶음 기준
// 전국 보기 화면 틀: Figma region-map 390(504:81871) · 1440(506:87629)의 땅 자리에 맞춘 viewBox(지도 단위)
const NATIONAL = { compact: { x: -54.98, y: -15.38, w: 528.71, h: 664.67 }, wide: { x: -205.44, y: -9.34, w: 768.59, h: 652.58 } };
const KINDS_SHOWN: Kind[] = ['일반대학', '교육대학', '산업대학', '특별법 대학'];
const FIRST = 4, MORE = 20;
const Caret = () => <span className="um-caret" aria-hidden="true">▾</span>;
const LEAD = '전국 4년제 대학이 어디 있는지 지도로 봐요 · 시·도를 고르면 그 지역 대학만 따로 보여 드려요';
const facts = (c: Campus) => `${c.founding} · ${c.school_kind} · ${c.sido} ${c.sigungu}`;
const detailHref = (c: Campus) => `/univ-detail?u=${encodeURIComponent(c.name)}`;
const press = (fn: () => void) => (e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); } };
function viewOf(region: Sido | null, compact = false, pins: Campus[] = []): View {
  if (!region) return compact ? NATIONAL.compact : NATIONAL.wide;
  const b = REGION_BOUNDARIES[region].bbox, points = pins.map(c => project([c.lng, c.lat]));
  const left = Math.min(b.x, ...points.map(p => p[0])), top = Math.min(b.y, ...points.map(p => p[1]));
  const right = Math.max(b.x + b.w, ...points.map(p => p[0])), bottom = Math.max(b.y + b.h, ...points.map(p => p[1]));
  const w = Math.max(right - left, 20) * 1.2, h = Math.max(bottom - top, 20) * 1.2;
  return { x: (left + right - w) / 2, y: (top + bottom - h) / 2, w, h };
}

export function UnivMap() {
  const [loaded, retry] = useUnivMap(), compact = useCompactResults();
  // 대학 위치는 개인 성적의 샘플 모드와 별개인 공개 자료다. 시안 대조 빌드에서만 고정 예시를 사용한다.
  const sampleMode = useSampleMode();
  const sample = sampleMode && import.meta.env.VITE_MAP_DESIGN_FIXTURE === 'true', state = sample ? sampleUnivMap : loaded;
  const [top, setTop] = useState<Element | null>(null);
  useEffect(() => { setTop(compact ? null : document.querySelector('.topbar__heading')); }, [compact]);
  const [region, setRegion] = useState<Sido | null>(null), [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [query, setQuery] = useState(''), [selected, setSelected] = useState<string | null>(null);
  const [mode, setMode] = useState<'map' | 'list'>('map'), [sort, setSort] = useState<'가나다' | '시군'>('가나다');
  const [sheet, setSheet] = useState<Sheet | null>(null), [only, setOnly] = useState<string[] | null>(null), [announce, setAnnounce] = useState('');
  const cardTitle = useRef<HTMLHeadingElement>(null);

  const data = typeof state === 'object' ? state : null;
  const all = useMemo(() => data?.campuses ?? [], [data]);
  const filtered = useMemo(() => applyFilters(all, filters), [all, filters]);
  const counts = countBySido(filtered), raw = countBySido(all);
  const pendingOf = (s: Sido | null) => s ? data?.pending[s] ?? 0 : Object.values(data?.pending ?? {}).reduce((a, b) => a + (b ?? 0), 0);
  const scope = region ? filtered.filter(c => c.sido === region) : filtered;
  const pending = pendingOf(region), pick = scope.find(c => c.id === selected) ?? null;
  const searching = query.replace(/\s/g, '').length >= 2, results = searching ? searchCampuses(filtered, query) : [];
  const onlyList = only ? scope.filter(c => only.includes(c.id)) : null;
  const listed = sortCampuses(onlyList ?? scope, region ? sort : '시도');
  // 전국 목록은 패널에 보이는 만큼(4곳)부터 그리고 '더 보기'로 20곳씩 늘려요(206곳 · 로고를 한 번에 그리지 않게). 고른 대학은 늘 그려요
  const [shown, setShown] = useState(FIRST);
  useEffect(() => setShown(FIRST), [region, filters, only, sort]);
  const limit = region || onlyList ? listed.length : Math.max(shown, listed.findIndex(c => c.id === pick?.id) + 1); // 시·도를 고르면 전부
  const sidoText = (s: Sido) => !counts[s] && !raw[s] && pendingOf(s) ? `위치 확인 중 ${pendingOf(s)}곳` : `대학 ${counts[s]}곳`;
  const place = region ?? '전국';

  useEffect(() => { if (pick) { cardTitle.current?.focus(); document.getElementById(`um-item-${pick.id}`)?.scrollIntoView?.({ block: 'nearest' }); } }, [pick?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const goRegion = (s: Sido | null) => {
    if (s === region) { setSelected(null); return; }
    setRegion(s); setSelected(null); setOnly(null);
    setAnnounce(s ? `${s}, ${sidoText(s)}` : `전국, 대학 ${filtered.length}곳`);
  };
  const selectCampus = (c: Campus) => {
    if (c.sido !== region) { setRegion(c.sido); setOnly(null); setAnnounce(`${c.sido}, ${sidoText(c.sido)}`); }
    setSelected(c.id);
  };
  const closeCard = () => {
    const id = selected; setSelected(null);
    setTimeout(() => [...document.querySelectorAll<SVGElement>('[data-ids]')].find(el => el.dataset.ids!.split(' ').includes(id ?? ''))?.focus(), 0);
  };
  const clearFilters = () => setFilters(NO_FILTERS);

  const controls = <div className="um-controls">
    <div className="um-search"><Icon name="search" size={16} />
      <input type="search" className="text-input" placeholder="대학 이름으로 찾기" aria-label="대학 이름으로 찾기" value={query} onChange={e => setQuery(e.target.value)} />
      {query && <button type="button" className="um-icon-button" aria-label="입력 지우기" onClick={() => setQuery('')}><Icon name="x" size={16} /></button>}</div>
    <div className="um-chips" role="group" aria-label="조건">
      <Chip on={!!region} onClick={() => setSheet('region')} expanded={sheet === 'region'}>{region ? SHORT[region] : '전국'} <Caret /></Chip>
      <Chip on={!!filters.founding} onClick={() => setSheet('founding')} expanded={sheet === 'founding'}>{filters.founding ? `설립 · ${filters.founding}` : <>설립 <Caret /></>}</Chip>
      <Chip on={filters.mainOnly} onClick={() => setSheet('campus')} expanded={sheet === 'campus'}>{filters.mainOnly ? '캠퍼스 · 본교만' : <>캠퍼스 <Caret /></>}</Chip>
      <Chip on={!!filters.kind} onClick={() => setSheet('kind')} expanded={sheet === 'kind'}>{filters.kind ? `학교 종류 · ${filters.kind}` : <>학교 종류 <Caret /></>}</Chip>
    </div>
  </div>;

  const searchBox = results.length ? <section className="um-results" aria-label="검색 결과"><p className="t-caption text-muted">대학 {results.length}곳</p>
    <ul>{results.map(c => <li key={c.id}><button type="button" onClick={() => { selectCampus(c); setQuery(''); setMode('map'); }}>
      <UniversityLogo university={c.name} /><span><span className="t-title">{mark(c.name, query)}</span><span className="t-body-sm text-muted">{c.campus} · {c.sido} {c.sigungu}</span></span></button></li>)}</ul></section>
    : <div className="empty-state um-empty"><Icon name="search" /><h3 className="t-heading-4">찾는 대학이 없어요</h3>
      <p className="t-body-sm">대학 이름을 줄여서 넣어 보세요(예: 강원대) · 4년제 대학만 지도에 있어요</p>
      <button type="button" className="button-primary" onClick={() => setQuery('')}>검색어 지우기</button></div>;

  const errorBox = <div className="empty-state um-empty um-error"><Icon name="triangle-alert" /><h3 className="t-heading-4">지도를 불러오지 못했어요</h3>
    <p className="t-body-sm">연결을 확인하고 다시 불러와 주세요 · 한 번 불러온 뒤에는 연결 없이도 볼 수 있어요</p>
    <button type="button" className="button-primary" onClick={retry}>다시 불러오기</button></div>;

  const pendingBadge = pending > 0 && <span className="data-status-badge">위치 확인 중 {pending}곳 — 검수가 끝나면 지도에 나와요</span>;
  const baseBadge = data?.base_date && <span className="data-status-badge">데이터 기준일 {data.base_date}</span>;
  const head = <div className="um-head"><h3 className="t-heading-3">{place}</h3><span className="t-title num">대학 {scope.length}곳{sample ? ' · 시안 예시' : ''}</span>
    {region && <button type="button" className="button-pill-soft" onClick={() => goRegion(null)}>‹ 전국으로</button>}</div>;

  const band = !data || scope.length ? null
    : filtersOn(filters) ? <div className="um-band"><p>조건에 맞는 대학이 없어요</p><button type="button" className="button-pill-soft" onClick={clearFilters}>조건 지우기</button></div>
      : pending ? <div className="um-band"><p>{region ? '이 지역 ' : ''}대학 {pending}곳은 위치를 확인하고 있어요</p><p className="t-caption text-muted">검수가 끝나면 지도에 나와요</p></div>
        : <div className="um-band"><span className="data-status-badge">준비 중</span><p>대학 위치를 확인하고 있어요</p><p className="t-caption text-muted">검수가 끝나면 지도에 나와요</p></div>;

  const mapCard = <section className="um-map-card" aria-label="지도">
    {head}{compact && baseBadge}
    {!data ? <p className="t-body-sm text-muted um-loading" role="status">대학 위치를 읽고 있어요.</p>
      : <div className="um-stage">
        <RegionMap region={region} counts={counts} raw={raw} pendingOf={pendingOf} pins={scope} selected={pick?.id ?? null} px={compact ? PX.compact : PX.wide} total={filtered.length}
          labels={!compact} onSido={goRegion} onPin={selectCampus}
          onCluster={ids => { if (compact) setSheet({ cluster: ids }); else { setOnly(ids); setSelected(null); } }} />
        {!region && <div className="um-islands" aria-hidden="true"><svg viewBox="0 0 80 32" width={80} height={32}><path d="M24 14l4-3 5 1 2 5-3 4-5 1-4-3z" /><circle cx={46} cy={19} r={1.6} /><circle cx={51} cy={19} r={1.6} /></svg><span>울릉도 · 독도</span></div>}
        {band}
        {pick && <PinCard c={pick} titleRef={cardTitle} onClose={closeCard} />}
        {compact && <button type="button" className="button-primary um-toggle" onClick={() => setMode('list')}><Icon name="menu" size={20} />목록 보기</button>}
      </div>}
    {!compact && pendingBadge}
  </section>;

  const listBody = <>
    {onlyList && <div className="um-only"><p className="t-label">{clusterPlace(onlyList)} 부근 {onlyList.length}곳만 보는 중</p>
      <button type="button" className="button-pill-soft" onClick={() => setOnly(null)}>모두 보기</button></div>}
    {listed.length > 0 && <ul className="um-list">{listed.slice(0, limit).map((c, i) => <li key={c.id}>
      {!region && listed[i - 1]?.sido !== c.sido && <p className="t-label um-group">{c.sido} <span className="num">{counts[c.sido]}</span></p>}
      <Item c={c} link={compact} on={c.id === pick?.id} onPick={() => selectCampus(c)} /></li>)}</ul>}
    {listed.length > limit && <button type="button" className="button-outline um-more" onClick={() => setShown(limit + MORE)}>목록 더 보기 · {listed.length - limit}곳 남음</button>}
  </>;
  const sortButton = region ? <button type="button" className="button-pill-soft" aria-haspopup="dialog" onClick={() => setSheet('sort')}>{sort === '가나다' ? '가나다순' : '시·군순'} ▾</button>
    : <span className="um-sort-static">시·도순</span>;

  return <section data-slug="univ-map" aria-label="대학 지도" className="student-screen univ-map">
    {top && createPortal(<><h1 className="um-title">대학 지도</h1><p className="um-lead">{LEAD}</p></>, top)}
    {compact ? <h2 className="sr-only">대학 지도</h2> : <ScreenActions>{baseBadge}</ScreenActions>}
    <p role="status" className="sr-only">{announce}</p>

    {compact ? <>
      {controls}
      {state === 'error' ? errorBox : searching && data ? searchBox
        : mode === 'list' && data ? <section className="um-list-card" aria-label="목록">
          <div className="um-head"><p className="t-title">{place} · 대학 {scope.length}곳{sample ? ' · 시안 예시' : ''}</p>{region && sortButton}</div>
          {listBody}{band}{pendingBadge}
          <button type="button" className="button-primary um-toggle um-toggle--fixed" onClick={() => setMode('map')}>지도 보기</button></section>
          : mapCard}
      {mode === 'map' && !searching && state !== 'error' && pendingBadge}
    </> : state === 'error' ? <>{controls}{errorBox}</>
      : <div className="um-layout">
        <section className="um-panel" aria-label="대학 목록">{controls}
          {searching && data ? searchBox : <><div className="um-head"><p className="t-title num">대학 {scope.length}곳{sample ? ' · 시안 예시' : ''}</p>{sortButton}</div>{listBody}</>}</section>
        {mapCard}</div>}

    <div className="um-sources t-caption text-muted">
      {sample ? <p>{SAMPLE_UNIV_MAP_SOURCE}</p> : data?.list_source && <p>대학 목록 · 주소: {data.list_source}{data.list_as_of ? `(${data.list_as_of} 기준)` : ''} · 좌표: {data.provenance === 'official-published'
        ? <>{data.coordinate_source} · <a href={data.source_url} target="_blank" rel="noreferrer">원본 자료</a></>
        : <>주소를 좌표로 바꾼 뒤 관리자 2명 검수{data.reviewed_at ? `(검수일 ${data.reviewed_at})` : ''}</>}</p>}
      <p>지도 경계: {region ? <>통계청 SGIS · <a href={DISTRICT_SOURCE} target="_blank" rel="noreferrer">vuski/admdongkor</a> ({DISTRICT_DATE}, 시·군·구로 통합·단순화, 공공누리 1유형 · CC BY 4.0)</> : BOUNDARY_SOURCE} · 본교 · 분교 · 캠퍼스는 따로 세요</p></div>
    <p className="disclaimer-note"><Icon name="info" size={16} /><span>대학이 있는 곳을 보여 주는 지도예요 · 입결이나 대학 순위와는 관계없어요 · 정확한 주소와 캠퍼스 정보는 대학 공식 누리집이 최종 기준이에요{sample ? ' · 샘플의 대학·숫자는 예시예요' : ''}{data?.base_date ? ` · 데이터 기준일 ${data.base_date}` : ''}</span></p>

    {sheet === 'region' && <Sheet title="지역 고르기" onClose={() => setSheet(null)}>
      <div className="um-grid">
        <button type="button" className="filter-chip um-grid__all" aria-pressed={!region} onClick={() => { goRegion(null); setSheet(null); }}>전국 <span className="num">{filtered.length}</span></button>
        {SIDO.map(s => <button key={s} type="button" className="filter-chip" aria-pressed={s === region} aria-label={`${s}, ${sidoText(s)}`} onClick={() => { goRegion(s); setSheet(null); }}>
          {SHORT[s]} <span className="num">{!counts[s] && !raw[s] && pendingOf(s) ? '확인 중' : counts[s]}</span></button>)}
      </div></Sheet>}
    {sheet === 'founding' && <Options title="설립" onClose={() => setSheet(null)} options={[null, ...FOUNDINGS].map(v => ({
      label: v ?? '전체', desc: v === '국립' ? '국립대법인 포함' : v === '특별법 법인' ? '과학기술원 등' : undefined, on: filters.founding === v, pick: () => setFilters({ ...filters, founding: v }) }))} />}
    {sheet === 'campus' && <Options title="캠퍼스" onClose={() => setSheet(null)} options={[false, true].map(v => ({ label: v ? '본교만' : '전체', on: filters.mainOnly === v, pick: () => setFilters({ ...filters, mainOnly: v }) }))} />}
    {sheet === 'kind' && <Options title="학교 종류" onClose={() => setSheet(null)} options={[null, ...KINDS_SHOWN].map(v => ({ label: v ?? '전체', on: filters.kind === v, pick: () => setFilters({ ...filters, kind: v }) }))} />}
    {sheet === 'sort' && <Options title="정렬" onClose={() => setSheet(null)} options={(['가나다', '시군'] as const).map(v => ({ label: v === '가나다' ? '가나다순' : '시·군순', on: sort === v, pick: () => setSort(v) }))} />}
    {typeof sheet === 'object' && sheet && (() => { const list = sortCampuses(scope.filter(c => sheet.cluster.includes(c.id)), '가나다');
      return <Sheet title={`${clusterPlace(list)} 부근 ${list.length}곳`} onClose={() => setSheet(null)}>
        <div className="um-options">{list.map(c => <button key={c.id} type="button" className="um-option" onClick={() => { selectCampus(c); setSheet(null); }}>
          <UniversityLogo university={c.name} /><span><span className="t-title">{c.name}</span><span className="t-body-sm text-muted">{c.campus} · {c.campus_type} · {c.founding}</span></span><span aria-hidden="true">›</span></button>)}</div>
      </Sheet>; })()}
  </section>;
}

function mark(name: string, q: string) {
  const t = q.trim(), i = t ? name.indexOf(t) : -1;
  return i < 0 ? name : <>{name.slice(0, i)}<b>{t}</b>{name.slice(i + t.length)}</>;
}
function Chip({ on, expanded, onClick, children }: { on: boolean; expanded: boolean; onClick: () => void; children: ReactNode }) {
  return <button type="button" className={`filter-chip${on ? ' is-on' : ''}`} aria-haspopup="dialog" aria-expanded={expanded} onClick={onClick}>{children}</button>;
}
function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return <Modal label={title} onClose={onClose}><div className="um-sheet">
    <div className="section-row"><h3 className="t-heading-4">{title}</h3><button type="button" className="button-outline" onClick={onClose} aria-label="닫기"><Icon name="x" size={20} /></button></div>
    {children}</div></Modal>;
}
function Options({ title, options, onClose }: { title: string; onClose: () => void; options: { label: string; desc?: string; on: boolean; pick: () => void }[] }) {
  return <Sheet title={title} onClose={onClose}><div className="um-options">{options.map(o => <button key={o.label} type="button" className="um-option" aria-pressed={o.on} onClick={() => { o.pick(); onClose(); }}>
    <span><span>{o.label}</span>{o.desc && <span className="t-caption text-muted">{o.desc}</span>}</span>{o.on && <Icon name="check" size={20} />}</button>)}</div></Sheet>;
}

function Item({ c, link, on, onPick }: { c: Campus; link: boolean; on: boolean; onPick: () => void }) {
  const body = <><span className="um-item__name"><UniversityLogo university={c.name} /><span className="t-heading-4">{c.name}</span></span>
    <span className="t-body-sm">{c.campus} · {c.campus_type}</span><span className="t-body-sm text-muted">{c.founding} · {c.school_kind} · {c.sigungu}</span><Icon name="chevron-right" size={24} className="um-item__go" /></>;
  return link ? <Link className="univ-card um-item" to={detailHref(c)}>{body}</Link>
    : <button type="button" id={`um-item-${c.id}`} className="univ-card um-item" aria-current={on || undefined} onClick={onPick}>{body}</button>;
}

function PinCard({ c, titleRef, onClose }: { c: Campus; titleRef: React.RefObject<HTMLHeadingElement | null>; onClose: () => void }) {
  return <article className="univ-card um-pin-card" aria-label={`${c.name} ${c.campus}`} onKeyDown={e => { if (e.key === 'Escape') onClose(); }}>
    <header><UniversityLogo university={c.name} /><h3 ref={titleRef} tabIndex={-1} className="t-heading-3">{c.name}</h3>
      <button type="button" className="um-icon-button" aria-label="카드 닫기" onClick={onClose}><Icon name="x" size={20} /></button></header>
    <p className="t-title">{c.campus} · {c.campus_type}</p>
    <p className="t-body-sm text-muted">{facts(c)}</p>
    {c.address && <p className="t-body-sm">{c.address}</p>}
    {c.source_url && <p className="t-caption"><a href={c.campus_source_url ?? c.source_url} target="_blank" rel="noreferrer">위치 출처 확인</a></p>}
    <Link className="um-pin-card__link" to={detailHref(c)} aria-label={`${c.name} ${c.campus} 대학 상세 보기`}>대학 상세 보기 ›</Link>
  </article>;
}

interface MapProps {
  region: Sido | null; counts: Record<Sido, number>; raw: Record<Sido, number>; pendingOf: (s: Sido) => number; pins: Campus[]; selected: string | null; total: number;
  px: { w: number; h: number }; labels: boolean; onSido: (s: Sido) => void; onPin: (c: Campus) => void; onCluster: (ids: string[]) => void;
}
/** region-map(design.md): 시·도 = 버튼(Tab은 SIDO 순), 핀 = 버튼(누르는 영역 44). 표식 크기는 확대와 관계없이 화면 px로 고정. */
function RegionMap(props: MapProps) {
  const base = viewOf(props.region, props.px === PX.compact, props.pins);
  // 지역·필터·화면 크기가 바뀌면 해당 범위에 맞춰 확대 상태도 초기화한다.
  return <ZoomableRegionMap key={`${props.region}-${props.px.w}-${base.x}-${base.y}-${base.w}-${base.h}`} {...props} base={base} />;
}

function ZoomableRegionMap({ region, counts, raw, pendingOf, pins, selected, total, px, labels, onSido, onPin, onCluster, base }: MapProps & { base: View }) {
  const svgRef = useRef<SVGSVGElement>(null), current = useRef(base);
  const [v, setView] = useState(base), [size, setSize] = useState(px);
  const update = (next: View) => { current.current = next; setView(next); };
  const zoom = (factor: number, anchor?: { x: number; y: number }) => {
    const old = current.current;
    const w = Math.max(base.w / 12, Math.min(base.w, old.w * factor));
    if (w === old.w) return;
    if (w === base.w) { update(base); return; }
    const ratio = w / old.w, point = anchor ?? { x: old.x + old.w / 2, y: old.y + old.h / 2 };
    update({ x: point.x - (point.x - old.x) * ratio, y: point.y - (point.y - old.y) * ratio, w, h: old.h * ratio });
  };
  useEffect(() => {
    const svg = svgRef.current!;
    const wheel = (event: WheelEvent) => {
      if (!event.deltaY) return;
      event.preventDefault();
      const rect = svg.getBoundingClientRect(), old = current.current;
      const scale = Math.min(rect.width / old.w, rect.height / old.h);
      if (!scale) return;
      // SVG의 중앙 정렬 여백까지 반영해 커서 아래의 지리 좌표를 고정한다.
      const anchor = {
        x: old.x + (event.clientX - rect.left - (rect.width - old.w * scale) / 2) / scale,
        y: old.y + (event.clientY - rect.top - (rect.height - old.h * scale) / 2) / scale,
      };
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? rect.height : 1);
      zoom(Math.exp(Math.max(-200, Math.min(200, delta)) * 0.002), anchor);
    };
    // React의 수동적 wheel 이벤트 대신 지도 안에서만 페이지 스크롤을 막는다.
    svg.addEventListener('wheel', wheel, { passive: false });
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width && height) setSize({ w: width, h: height });
    });
    observer?.observe(svg);
    return () => { svg.removeEventListener('wheel', wheel); observer?.disconnect(); };
  }, []);
  const scale = Math.min(size.w / v.w, size.h / v.h), k = 1 / scale;
  const byId = new Map(pins.map(c => [c.id, c]));
  const groups = region ? clusterPins(sortCampuses(pins, '가나다').map(c => { const [x, y] = project([c.lng, c.lat]); return { id: c.id, x, y }; }), scale, selected)
    .sort((a, b) => byId.get(a.ids[0])!.name.localeCompare(byId.get(b.ids[0])!.name, 'ko')) : [];
  const num = (x: number, y: number, n: number | string) => <text x={x} y={y} fontSize={12 * k} className="um-num" textAnchor="middle" dominantBaseline="central">{n}</text>;
  return <><svg ref={svgRef} className="um-map" viewBox={`${v.x} ${v.y} ${v.w} ${v.h}`} role="group" aria-label={`대한민국 시·도 지도, 4년제 대학 ${total}곳, 목록과 같은 내용이에요`}>
    {SIDO.map(s => <path key={s} d={region ? REGION_BOUNDARIES[s].d : SIDO_SHAPES[s].d} fillRule="evenodd" vectorEffect="non-scaling-stroke" role="button" tabIndex={0}
      className={`um-sido${s === region ? ' is-selected' : region ? ' is-around' : ''}`} aria-pressed={s === region}
      aria-label={`${s}, ${!counts[s] && !raw[s] && pendingOf(s) ? `위치 확인 중 ${pendingOf(s)}곳` : `대학 ${counts[s]}곳`}`}
      onClick={() => onSido(s)} onKeyDown={press(() => onSido(s))} />)}
    {region && <g className="um-districts" role="img" aria-label={`${region} 시·군·구 경계: ${REGION_BOUNDARIES[region].districts.map(d => d.name).join(', ')}`}>
      {REGION_BOUNDARIES[region].districts.map(d => <path key={d.name} d={d.d} className="um-district" fillRule="evenodd" vectorEffect="non-scaling-stroke"><title>{d.name}</title></path>)}
      {districtLabels(REGION_BOUNDARIES[region].districts, groups, scale).map(d => <text key={d.name} x={d.x} y={d.y}
        className="um-district-name" fontSize={11 * k} strokeWidth={3 * k} textAnchor="middle" dominantBaseline="central" aria-hidden="true">{d.name}</text>)}
    </g>}
    {!region && <>
      {SIDO.map(s => { const { label: [lx, ly], marker: [mx, my] } = SIDO_SHAPES[s], n = counts[s];
        if (!n && (raw[s] || !pendingOf(s))) return null;
        return <g key={s} className="um-marker" aria-hidden="true" onClick={() => onSido(s)}>
          {(lx !== mx || ly !== my) && <line x1={lx} y1={ly} x2={mx} y2={my} className="um-leader" vectorEffect="non-scaling-stroke" />}
          {n ? <><circle cx={mx} cy={my} r={(n > 99 ? 18 : 14) * k} />{num(mx, my, n)}</>
            : <text x={mx} y={my} fontSize={12 * k} className="um-caption um-pending" textAnchor="middle" dominantBaseline="central">{labels ? `${SHORT[s]} 확인 중` : '확인 중'}</text>}
          {labels && n > 0 && <text x={mx} y={my + 24.5 * k} fontSize={12 * k} className="um-caption" textAnchor="middle" dominantBaseline="central">{SHORT[s]}</text>}
        </g>; })}
    </>}
    {groups.map(g => { const c = byId.get(g.ids[0])!, sel = g.ids[0] === selected;
      if (g.ids.length > 1) { const place = clusterPlace(g.ids.map(id => byId.get(id)!));
        return <g key={g.ids.join(' ')} data-ids={g.ids.join(' ')} className="um-pin um-cluster" transform={`translate(${g.x} ${g.y})`} role="button" tabIndex={0}
          aria-label={`${place} 부근 대학 ${g.ids.length}곳, 목록 열기`} onClick={() => onCluster(g.ids)} onKeyDown={press(() => onCluster(g.ids))}>
          <circle r={22 * k} className="um-hit" /><circle r={14 * k} />{num(0, 0, g.ids.length)}</g>; }
      return <g key={c.id} data-ids={c.id} className={`um-pin${sel ? ' is-selected' : ''}`} transform={`translate(${g.x} ${g.y})`} role="button" tabIndex={0}
        aria-label={`${c.name} ${c.campus}, ${c.campus_type}, ${c.founding}${sel ? ', 선택됨' : ''}`} onClick={() => onPin(c)} onKeyDown={press(() => onPin(c))}>
        <circle r={22 * k} className="um-hit" />
        {sel ? <><circle r={14 * k} className="um-ring" /><circle r={13 * k} className="um-gap" /><circle r={10 * k} className="um-dot" /></>
          : <circle r={6 * k} className="um-dot" strokeWidth={2 * k} />}</g>; })}
  </svg>
    <div className="um-zoom" role="group" aria-label="지도 확대·축소">
      <button type="button" aria-label="지도 확대" title="확대 · 마우스 휠 위로" disabled={v.w <= base.w / 12} onClick={() => zoom(1 / 1.5)}>+</button>
      <button type="button" aria-label="지도 축소" title="축소 · 마우스 휠 아래로" disabled={v.w >= base.w} onClick={() => zoom(1.5)}>−</button>
      <button type="button" className="um-zoom__reset" aria-label="지도 배율 초기화" disabled={v.w === base.w} onClick={() => update(base)}>초기화</button>
    </div>
  </>;
}
