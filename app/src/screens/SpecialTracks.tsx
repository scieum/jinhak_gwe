// 특수 계열 모아보기(work/special-tracks/02-spec.md · 05-build.json). "특수 계열" 필터를 미리 걸어 둔 허브: 공개 숫자를 옮기고 거르기만 한다.
// 판정 · 판정 색 · 순번 · 컷 순 정렬 · 내 위치 · 실기 점수 계산 없음(D10 · D21, NEVER-1).
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { useReleasedResults } from '../data/releasedResults';
import { useSpecialTracks } from '../data/specialTracks';
import { useSampleMode } from '../data/sample/mode';
import { sampleTrackUnits } from '../data/sample/specialTracks';
import {
  cellText, defaultType, PLAN_YEAR, PRACTICAL_TRACKS, planSummary, RESULT_YEAR, subCount, TRACK_RULE, trackOf, TRACKS, trackView, universitiesIn,
  type Practical, type ResultType, type SortKey, type TrackId, type TracksData, type ViewRow,
} from '../domain/specialTracks';
import { SegmentedControl } from '../components/SegmentedControl';
import { UniversityLogo, universityLogoFile } from '../components/UniversityLogo';
import { ScreenActions } from '../components/ScreenActions';
import { InterestButton } from '../components/InterestButton';
import { Modal } from '../components/Modal';
import { Icon } from '../components/Icon';
import { useCompactResults } from '../components/ResultFilters';
import { ReferenceTrackCollection } from './ReferenceTrackCollection';
import { TrackDepartmentFilter } from '../components/TrackDepartmentFilter';
import { departmentOf, departmentOptions } from '../domain/trackDepartments';
import '../components/sortable-header.css';
import '../styles/special-tracks.css';

const SORT_LABEL: Record<SortKey, string> = { 가나다: '가나다순', 모집: '모집인원 많은 순' };
const BLANK_SR: Record<string, string> = { '—': '전형 없음', 미공개: '70% 컷 미공개' };
const other = (t: ResultType): ResultType => t === '교과' ? '종합' : '교과';
const q = encodeURIComponent;
/** 받침이 있으면 '은', 없으면 '는'. */
const eun = (w: string) => { const c = w.charCodeAt(w.length - 1) - 0xac00; return `${w}${c >= 0 && c < 11172 && c % 28 ? '은' : '는'}`; };

export function SpecialTracks() {
  const sample = useSampleMode(), data = useSpecialTracks();
  // 불러오는 동안에도 화면 자리(data-slug)를 먼저 그려요
  if (!data) return <section data-slug="special-tracks" aria-label="특수 계열 모아보기" className="student-screen special-tracks"><p role="status">계열 자료를 불러오고 있어요.</p></section>;
  return sample || data.rows.length ? <ReviewedSpecialTracks /> : <ReferenceTrackCollection />;
}

function ReviewedSpecialTracks() {
  const released = useReleasedResults(), data = useSpecialTracks(), compact = useCompactResults(), sample = useSampleMode();
  // 샘플 모드: 이 화면 샘플 입결을 더해요(다른 화면이 보는 공개 로더는 그대로)
  const units = useMemo(() => released && sample ? [...released, ...sampleTrackUnits] : released, [released, sample]);
  const [track, setTrack] = useState<TrackId>('메디컬'), [sub, setSub] = useState<string | null>(null);
  const [department, setDepartment] = useState('');
  const pickSub = (s: string | null) => { setSub(s); setDepartment(''); };
  const [type, setType] = useState<ResultType>('교과'), [sort, setSort] = useState<SortKey>('가나다');
  const [sheet, setSheet] = useState(false), [open, setOpen] = useState<ViewRow | null>(null), [announce, setAnnounce] = useState('');
  const chips = useRef<(HTMLButtonElement | null)[]>([]);
  const [head, setHead] = useState<Element | null>(null);
  useEffect(() => { setHead(compact ? null : document.querySelector('.topbar__heading')); }, [compact]);

  const departments = departmentOptions((data?.rows ?? []).filter(r => r.track === track && (!sub || r.sub === sub)).map(r => r.unit), track);
  const filteredData = data && department ? { ...data, rows: data.rows.filter(r => r.track !== track || departmentOf(r.unit, track) === department) } : data;
  const view = filteredData && units ? trackView(filteredData, units, track, sub, type, sort) : null;
  const ready = view && view.status !== 'pending' ? view : null;
  const info = trackOf(track), typeName = `학생부${type}`;
  const chipCount = (t: TrackId) => data && universitiesIn(data, t) ? String(universitiesIn(data, t)) : '준비 중';

  const pickTrack = (t: TrackId, focus = false) => {
    setTrack(t); setSub(null); setDepartment(''); setType(defaultType(t)); setSort('가나다');
    const v = data && units ? trackView(data, units, t, null, defaultType(t), '가나다') : null;
    setAnnounce(v && v.status !== 'pending' ? `${t}, 대학 ${v.universities}곳, 모집단위 ${v.rows.length}개` : `${t}, 준비 중`);
    const i = TRACKS.findIndex(x => x.id === t);
    if (focus) chips.current[i]?.focus();
    chips.current[i]?.scrollIntoView?.({ inline: 'nearest', block: 'nearest' });
  };
  const chipKey = (e: KeyboardEvent, i: number) => {
    const d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!d) return;
    e.preventDefault(); pickTrack(TRACKS[(i + d + TRACKS.length) % TRACKS.length].id, true);
  };

  const typeSeg = <SegmentedControl label="전형 유형" value={type} onChange={setType} options={[{ value: '교과', label: '교과' }, { value: '종합', label: '종합' }]} />;
  const asof = data?.base_date ? <span className="data-status-badge st-asof">데이터 기준일 {data.base_date}</span> : null;
  const pendingBadge = ready && ready.pending > 0 && <span className="data-status-badge st-pending-count">준비 중 모집단위 {ready.pending}개 — 검수가 끝나면 채워져요</span>;
  const yearNote = `전형계획은 ${PLAN_YEAR}학년도, 입결은 공개된 ${RESULT_YEAR}학년도예요 · 그사이 모집단위 · 인원이 바뀌었을 수 있어요`;
  const basisNote = `수시 ${typeName} · 70% 컷 · 9등급 · 관리자가 검수한 입결만 · 등급은 숫자가 작을수록 상위예요`;
  return <section data-slug="special-tracks" aria-label="특수 계열 모아보기" className="student-screen special-tracks">
    {head && createPortal(<><h1 className="st-title">특수 계열 모아보기</h1><p className="st-lead">메디컬 · 교육 · 과기원처럼 따로 찾는 계열을 묶어 {PLAN_YEAR} 전형계획과 공개 입결을 한 표로 보여 드려요</p></>, head)}
    {compact ? <h2 className="st-mtitle">특수 계열 모아보기</h2> : asof && <ScreenActions>{asof}</ScreenActions>}

    <section className="st-controls" aria-label="계열 고르기">
      <div className="st-row"><span className="t-label text-muted" id="st-track-label">계열</span>
        <div className="st-chips" role="radiogroup" aria-labelledby="st-track-label">
          {TRACKS.map((t, i) => <button key={t.id} ref={el => { chips.current[i] = el; }} type="button" role="radio" className="filter-chip" aria-checked={t.id === track}
            tabIndex={t.id === track ? 0 : -1} aria-label={`${t.id}, ${chipCount(t.id) === '준비 중' ? '준비 중' : `대학 ${chipCount(t.id)}곳`}`}
            onClick={() => pickTrack(t.id)} onKeyDown={e => chipKey(e, i)}>{t.id} <span className="num">{chipCount(t.id)}</span></button>)}
        </div></div>
      {!compact && ready && <div className="st-row st-row--sub">
        {info.subs.length > 0 && <><span className="t-label text-muted">세부</span>
          <div className="st-chips" role="group" aria-label="세부">
            {[null, ...info.subs].map(s => <button key={s ?? '전체'} type="button" className="filter-chip" aria-pressed={s === sub} onClick={() => pickSub(s)}>{s ?? '전체'}</button>)}
          </div></>}
        {typeSeg}
      </div>}
      {ready && (sub || track === '교육') && <TrackDepartmentFilter options={departments} value={department} onChange={setDepartment} />}
    </section>
    <p role="status" className="sr-only">{announce}</p>

    {!data || !units ? <p role="status">특수 계열 자료와 공개 입결을 읽고 있어요.</p>
      : !ready ? <div className="st-pending"><h3 className="t-heading-3">{track}</h3><span className="data-status-badge">준비 중</span>
        <p className="t-body-sm text-muted">{track === '특수목적대' ? '사관학교 · 경찰대학 등의 자료는 아직 검수 중이에요' : '이 묶음의 자료는 아직 검수 중이에요 · 검수가 끝나면 채워져요'}</p></div>
      : <>
        <div className="st-head">
          <div className="st-head__text"><div className="st-head__name"><h3>{track}</h3><p className="text-muted">{info.desc}</p></div>
            <p className="st-head__total">대학 {ready.universities}곳 · 모집단위 {ready.rows.length}개</p>
            {compact && asof}
            <p className="st-head__note text-muted">{yearNote}{compact ? '' : ` · 입결 = ${basisNote}`}</p></div>
          {!compact && pendingBadge}
        </div>
        {compact && <div className="st-pick">
          <div className="st-pick__row">{typeSeg}
            <button type="button" className="button-pill-soft" aria-haspopup="dialog" onClick={() => setSheet(true)}>{info.subs.length ? `세부 ${sub ?? '전체'} · ` : ''}{SORT_LABEL[sort]} ▾</button></div>
          <p className="st-head__note text-muted">입결 = {RESULT_YEAR}학년도 {basisNote}</p>
          {pendingBadge}
        </div>}

        {ready.status === 'empty' ? <div className="empty-state"><Icon name="folder" />
          <h3 className="t-heading-4">{eun(track)} 공개된 {type} 전형 입결이 없어요</h3>
          <p>{ready.typeInPlan ? `검수가 끝난 ${RESULT_YEAR}학년도 ${type} 입결이 아직 없어요` : `${track} ${ready.universities}곳은 ${PLAN_YEAR}에 ${type} 전형으로 뽑지 않아요`}</p>
          <button type="button" className="button-primary" onClick={() => setType(other(type))}>{other(type)} 입결로 보기</button></div>
          : compact ? <CardList key={`${track}|${sub}|${department}|${type}|${sort}`} rows={ready.rows} track={track} type={type} onOpen={setOpen} />
          : <Table key={`${track}|${sub}|${department}|${type}|${sort}`} rows={ready.rows} track={track} type={type} sort={sort} onSort={setSort} onOpen={setOpen} />}

        <details className="trace-accordion"><summary><span>어떻게 묶었나요?</span><Icon name="chevron-down" size={20} /></summary>
          <ol>
            <li>묶음 기준 → 모집단위 → 묶음 매핑표(관리자 2명 검수{data.mapping_reviewed_at ? `, 검수일 ${data.mapping_reviewed_at}` : ''})</li>
            <li>{track}에 넣는 것 → {TRACK_RULE[track]}</li>
            <li>전형계획 → {PLAN_YEAR}학년도 시행계획 기준{data.base_date ? `(데이터 기준일 ${data.base_date})` : ''}</li>
            <li>입결 → {RESULT_YEAR}학년도 수시 {typeName} 70% 컷 · 9등급 · 관리자 2명 검수 · 같은 유형 전형이 여럿이면 모집인원이 가장 많은 전형 · 실기가 있는 전형은 빼요</li>
            <li>대상 → 후보 {ready.candidates}개 중 {ready.pending ? `검수 전 ${ready.pending}개 빼요 → ` : ''}{ready.rows.length}개{ready.status === 'empty' ? ` · ${type} 입결 0개` : ''}</li>
            <li>숫자 대신 글자로 적는 경우 → 미공개 · 다른 기준 · 신설 · 실기 전형 · —(그 유형 전형 없음)</li>
            <li>순서 → {sort === '가나다' ? '대학 이름 가나다순' : `${PLAN_YEAR} 모집인원 많은 순, 같으면 가나다순`}(위아래 순서는 서열이 아니에요)</li>
          </ol>
          <p className="st-total">대학 {ready.universities}곳 · 모집단위 {ready.rows.length}개</p>
          <p className="disclaimer-note t-caption text-muted">공개된 숫자를 옮기고 거르기만 했어요{data.base_date ? ` · 데이터 기준일 ${data.base_date}` : ''}</p>
        </details>
      </>}
    <p className="disclaimer-note st-note"><Icon name="info" size={16} /><span>공개된 {PLAN_YEAR} 전형계획과 {RESULT_YEAR}학년도 수시 입결을 계열별로 모은 표예요 · 대학이나 학과의 순위 · 추천이 아니에요 · 목록 순서는 가나다순일 뿐이에요 · 대학 공식 모집요강이 최종 기준이에요{sample ? ' · 샘플의 대학·숫자는 예시예요' : ''}{data?.base_date ? ` · 데이터 기준일 ${data.base_date}` : ''}</span></p>
    {sheet && data && <SubSheet data={data} track={track} sub={sub} sort={sort} onSub={s => { pickSub(s); setSheet(false); }} onSort={s => { setSort(s); setSheet(false); }} onClose={() => setSheet(false)} />}
    {open && <Detail v={open} track={track} type={type} onClose={() => setOpen(null)} />}
  </section>;
}

function ResultValue({ v, type }: { v: ViewRow; type: ResultType }) {
  const t = cellText(v.cell);
  return 'cut' in v.cell ? <span className="st-card__value num">{t}</span>
    : <span className="st-blank text-muted" aria-label={BLANK_SR[t] ? (t === '—' ? `${type} ${BLANK_SR[t]}` : BLANK_SR[t]) : undefined}>{t}</span>;
}
// 모집단위 목록(표·카드)에는 학과 이름만 두고(2026-11-26 사용자 결정, 체육과 같음) 실기 안내는 상세 창에서만 보여요
const practicalOnly = (v: ViewRow, track?: TrackId) => track !== '체육' && 'text' in v.cell && v.cell.text === '실기 전형'
  && <p className="t-caption text-muted">실기 점수 비중이 커서 교과 컷을 따로 보이지 않아요 · 전형 상세에서 봐요</p>;
const othersNote = (v: ViewRow) => v.others.length > 0 && <p className="t-caption text-muted">· {v.others.join(' · ')} 묶음에도 있어요</p>;
const interestProgram = (v: ViewRow, type: ResultType) => (v.cell.row?.program || v.row.plan.find(p => p.type === type)?.name || v.row.plan[0].name);

/** univ-logo, 로고 파일이 없으면 univ-monogram(첫 글자) */
const Logo = ({ university }: { university: string }) => universityLogoFile(university) ? <UniversityLogo university={university} /> : <span className="st-mono" aria-hidden="true" data-ch={university.slice(0, 1)} />;

function Card({ v, type, onOpen }: { v: ViewRow; type: ResultType; onOpen: () => void }) {
  const r = v.row, cut = cellText(v.cell);
  const label = `${r.university} ${r.unit}, ${PLAN_YEAR} 모집 ${v.total}명 ${planSummary(r)}, ${RESULT_YEAR}학년도 ${type} 70% 컷 ${'cut' in v.cell ? cut : BLANK_SR[cut] ?? cut}${v.cell.row?.competition_rate ? `, 경쟁률 ${v.cell.row.competition_rate} 대 1` : ''}, 상세 보기`;
  return <article className="univ-card st-card">
    <header><Logo university={r.university} /><span className="st-card__name">{r.university}</span>
      <InterestButton compact university={r.university} program={interestProgram(v, type)} department={r.unit} /></header>
    <button type="button" className="st-card__open" aria-label={label} onClick={onOpen}>
      <span className="st-card__unit">{r.unit}</span>
      {r.tag && <span className="data-status-badge data-status-badge--fact">{r.tag}</span>}
      {othersNote(v)}
      <span className="st-card__plan">{PLAN_YEAR} · {planSummary(r)} · 모집 {v.total}</span>
      <span className="st-card__kv"><span className="st-card__pairs"><span><span className="st-card__label">{type} 70% 컷</span><ResultValue v={v} type={type} /></span>
        {v.cell.row && <span><span className="st-card__label">경쟁률</span><span className="st-card__value num">{v.cell.row.competition_rate ? `${v.cell.row.competition_rate}:1` : '—'}</span></span>}</span>
        <Icon name="chevron-right" size={20} /></span>
    </button>
  </article>;
}

/** 시안: 목록 · 표는 앞 8개 높이로 보여 주고 나머지는 그 안에서 스크롤해요. 처음엔 8개만 그리고(나머지 자리는 빈 높이)
 *  안에서 스크롤 · 포커스하거나 "모두 보기"를 누르면 나머지를 그려요. */
const FIRST = 8;
function useFirstRows(rows: ViewRow[]) {
  const [all, setAll] = useState(rows.length <= FIRST);
  const more = () => setAll(true);
  return { shown: all ? rows : rows.slice(0, FIRST), rest: all ? 0 : rows.length - FIRST, more,
    moreButton: !all && <button type="button" className="sr-only" onClick={more}>나머지 {rows.length - FIRST}개 모두 보기</button> };
}

function CardList({ rows, track, type, onOpen }: { rows: ViewRow[]; track: TrackId; type: ResultType; onOpen: (v: ViewRow) => void }) {
  const { shown, rest, more, moreButton } = useFirstRows(rows);
  return <><ul className="st-cards" tabIndex={0} aria-label={`${track} 모집단위 ${rows.length}개, 넘겨서 더 보기`} onScroll={more} onFocus={more}>
    {shown.map(v => <li key={`${v.row.university}|${v.row.unit}`}><Card v={v} type={type} onOpen={() => onOpen(v)} /></li>)}
    {rest > 0 && <li aria-hidden="true" style={{ height: rest * 171 - 12 }} />}</ul>{moreButton}</>;
}

function Table({ rows, track, type, sort, onSort, onOpen }: { rows: ViewRow[]; track: TrackId; type: ResultType; sort: SortKey; onSort: (s: SortKey) => void; onOpen: (v: ViewRow) => void }) {
  const { shown, rest, more, moreButton } = useFirstRows(rows);
  const sortHead = (key: SortKey, label: string, className?: string) => <th scope="col" className={className} aria-sort={sort === key ? (key === '가나다' ? 'ascending' : 'descending') : 'none'}>
    <button type="button" className="sort-header-button" onClick={() => onSort(key)} aria-label={`${label}, ${SORT_LABEL[key]}으로 정렬`}>{label}<Icon name="arrow-up-down" size={16} /></button></th>;
  // 시안: 표 카드는 머리 + 8행 높이, 나머지 행은 카드 안에서 스크롤(머리 고정)
  return <div className="st-table-card" tabIndex={0} aria-label={`${track} 모집단위 표, 넘겨서 더 보기`} onScroll={more} onFocus={more}><table className="data-table st-table">
    <caption className="sr-only">{track} 모집단위 · {PLAN_YEAR} 전형계획과 {RESULT_YEAR}학년도 {type} 입결</caption>
    <colgroup><col style={{ width: 212 }} /><col style={{ width: 180 }} /><col style={{ width: 216 }} /><col style={{ width: 80 }} /><col style={{ width: 110 }} /><col style={{ width: 96 }} /><col style={{ width: 80 }} /><col style={{ width: 54 }} /><col style={{ width: 52 }} /></colgroup>
    <thead><tr>{sortHead('가나다', '대학')}<th scope="col">모집단위</th><th scope="col">{PLAN_YEAR} 전형</th>{sortHead('모집', '모집', 'num')}
      <th scope="col" className="num">{RESULT_YEAR} {type} 70% 컷</th><th scope="col" className="num">경쟁률</th><th scope="col" className="num">충원율</th><th scope="col">기준</th><th scope="col"><span className="sr-only">상세</span></th></tr></thead>
    <tbody>{shown.map(v => { const r = v.row, row = v.cell.row; return <tr key={`${r.university}|${r.unit}`}>
      <td><span className="st-univ"><Logo university={r.university} />{r.university}</span></td>
      <td>{r.unit}{r.tag && <><br /><span className="data-status-badge data-status-badge--fact">{r.tag}</span></>}{othersNote(v)}</td>
      <td>{planSummary(r)}</td><td className="num">{v.total}</td>
      <td className="num"><ResultValue v={v} type={type} /></td>
      <td className="num">{row?.competition_rate ? `${row.competition_rate}:1` : <span className="text-muted">—</span>}</td>
      <td className="num">{row ? (row.fill_rate ? `${row.fill_rate}%` : <span className="text-muted">미공개</span>) : <span className="text-muted">—</span>}</td>
      <td>{row?.basis ? <span className="st-basis" tabIndex={0} title={`70% 컷 · ${row.basis}`} aria-label={`기준: 70% 컷 · ${row.basis}`}><Icon name="info" size={20} /></span> : <span className="text-muted">—</span>}</td>
      <td><button type="button" className="st-row-open" aria-label={`${r.university} ${r.unit} 상세 보기`} onClick={() => onOpen(v)}><Icon name="chevron-right" size={20} /></button></td>
    </tr>; })}</tbody>
  </table>{rest > 0 && <div aria-hidden="true" style={{ height: rest * 49 }} />}{moreButton}</div>;
}

function SubSheet({ data, track, sub, sort, onSub, onSort, onClose }: { data: TracksData; track: TrackId; sub: string | null; sort: SortKey; onSub: (s: string | null) => void; onSort: (s: SortKey) => void; onClose: () => void }) {
  const subs = trackOf(track).subs as readonly string[];
  return <Modal label={`${track} ${subs.length ? '세부 · ' : ''}정렬`} onClose={onClose}>
    <div className="section-row"><h3 className="t-heading-3">{track} {subs.length ? '세부 · ' : ''}정렬</h3><button type="button" className="button-outline" onClick={onClose} aria-label="닫기"><Icon name="x" size={20} /></button></div>
    {subs.length > 0 && <section className="st-sheet" aria-label="세부"><h4 className="t-label text-muted">세부</h4>
      {[null, ...subs].map(s => { const n = s ? subCount(data, track, s) : data.rows.filter(r => r.track === track).length;
        return <button key={s ?? '전체'} type="button" className="st-sheet__row" aria-pressed={s === sub} onClick={() => onSub(s)}><span>{s ?? '전체'}</span>
          {n ? <span className="t-caption text-muted">모집단위 {n}개</span> : <span className="data-status-badge">준비 중</span>}</button>; })}</section>}
    <section className="st-sheet" aria-label="정렬"><h4 className="t-label text-muted">정렬</h4>
      <SegmentedControl label="정렬" value={sort} onChange={onSort} options={[{ value: '가나다', label: '가나다순' }, { value: '모집', label: '모집인원 많은 순' }]} /></section>
  </Modal>;
}

function Detail({ v, track, type, onClose }: { v: ViewRow; track: TrackId; type: ResultType; onClose: () => void }) {
  const r = v.row, row = v.cell.row, practical = PRACTICAL_TRACKS.includes(track);
  const kv = (k: string, val: string) => <div className="st-kv" key={k}><span className="t-body-sm text-muted">{k}</span><span className="num">{val}</span></div>;
  return <Modal label={`${r.university} ${r.unit}`} onClose={onClose} wide={practical && v.practical.length > 0}>
    <div className="section-row"><h3 className="t-heading-4 st-detail-title"><UniversityLogo university={r.university} />{r.university} {r.unit}</h3>
      <button type="button" className="button-outline" onClick={onClose} aria-label="닫기"><Icon name="x" size={20} /></button></div>
    <div className={practical && v.practical.length ? 'st-detail st-detail--wide' : 'st-detail'}>
      <div className="st-detail__main">
        <section aria-label={`${PLAN_YEAR} 전형계획`}><h4 className="t-label text-muted">{PLAN_YEAR} 전형계획 · 시행계획 기준</h4>
          {r.plan.map(p => kv(p.name, `${p.quota}명${p.minimum === null ? '' : p.minimum ? ' · 수능최저 있음' : ' · 수능최저 없음'}`))}
          {r.apply_period && kv('원서 접수', r.apply_period)}</section>
        <section aria-label={`${RESULT_YEAR}학년도 ${type} 입결`}><h4 className="t-label text-muted">{RESULT_YEAR}학년도 {type} 입결{row ? ` · ${row.program}` : ''}</h4>
          {kv('70% 컷', cellText(v.cell))}
          {row && <>{kv('경쟁률', row.competition_rate ? `${row.competition_rate}:1` : '—')}{kv('충원율', row.fill_rate ? `${row.fill_rate}%` : '미공개')}
            {row.quota && kv('모집', row.quota)}{kv('기준', row.basis ? `70% 컷 · ${row.basis}` : '—')}</>}
          {practicalOnly(v)}</section>
        <nav className="st-links" aria-label="자세히 보기">
          <Link to={`/admissions-list?q=${q(r.university)}`}>전형 상세 보기 ›</Link>
          <Link to={`/admission-results?u=${q(r.university)}`}>입결 자세히 보기 ›</Link>
          <Link to={`/univ-detail?u=${q(r.university)}`}>대학 상세 보기 ›</Link>
        </nav>
      </div>
      {practical && <PracticalSection list={v.practical} />}
    </div>
  </Modal>;
}

function PracticalSection({ list }: { list: Practical[] }) {
  const [openRows, setOpenRows] = useState<Set<string>>(new Set());
  const toggle = (k: string) => setOpenRows(s => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  const orNone = (s: string) => s.trim() || '원문에 없어요';
  return <section className="st-practical" aria-labelledby="st-practical-title"><h4 className="t-heading-4" id="st-practical-title">실기 과목 · 채점 기준</h4>
    {!list.length ? <><span className="data-status-badge">준비 중</span><p className="t-body-sm text-muted">모집요강을 옮겨 검수하고 있어요</p></>
      : list.map(p => <div key={p.program} className="st-practical__item">
        <span className="data-status-badge">모집요강 원문 옮김 · 검수일 {p.reviewed_at}</span>
        <p className="t-caption text-muted">{p.year} {p.program} {p.quota}명 · {p.ratio}(원문 그대로)</p>
        <table className="data-table st-subjects"><thead><tr><th scope="col">과목</th><th scope="col">측정 방법</th><th scope="col">배점</th><th scope="col"><span className="sr-only">채점 기준</span></th></tr></thead>
          <tbody>{p.subjects.flatMap(s => { const k = `${p.program}|${s.name}`, on = openRows.has(k); return [
            <tr key={k}><th scope="row">{s.name}</th><td>{orNone(s.measure)}</td><td className="num">{orNone(s.points)}</td>
              <td><button type="button" className="st-expand" aria-expanded={on} aria-label={`${s.name} 채점 기준, ${on ? '펼쳐짐' : '접힘'}`} onClick={() => toggle(k)}>{on ? '▴' : '▾'}</button></td></tr>,
            on && <tr key={`${k}-c`} className="st-criteria"><td colSpan={4}>
              {'text' in s.criteria ? <p className="t-body-sm">{s.criteria.text}</p>
                : <table className="data-table" aria-label={`${s.name} 채점 기준`}><thead><tr>{s.criteria.columns.map(c => <th key={c} scope="col">{c}</th>)}</tr></thead>
                  <tbody>{s.criteria.rows.map((row, i) => <tr key={i}>{row.map((x, j) => <td key={j} className="num">{orNone(x)}</td>)}</tr>)}</tbody></table>}
              {s.note && <p className="t-caption text-muted">{s.note}</p>}</td></tr>]; })}</tbody></table>
        <p className="t-caption text-muted">{p.source_label} {p.source_page} · <a href={p.source_url} target="_blank" rel="noreferrer">원문 보기 ↗</a></p>
      </div>)}
    {list.length > 0 && <p className="disclaimer-note t-caption text-muted">ⓘ 모집요강 원문을 옮긴 표예요 · 기록을 넣어 점수를 계산해 주지 않아요 · 대학 공식 모집요강이 최종 기준이에요</p>}
  </section>;
}
