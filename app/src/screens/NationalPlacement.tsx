import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { loadNationalCatalog, loadNationalYear, loadPlacementSource } from '../data/nationalPlacement';
import { dataAsOf } from '../data/catalog';
import { defaultPlacementFilters, filterNationalRows, gradeCoordinate, matchesUniversity, placementBounds, statisticValue, statisticDetail, STATISTIC_LABELS, typeBucket, universityPoints, type CutField, type NationalPlacementRow, type PlacementFilters } from '../domain/nationalPlacement';
import { currentUniversityName } from '../domain/universityIdentity';
import { nextTableSort, sortTableRows, type TableSort } from '../domain/tableSort';
import type { ResultRow } from '../domain/resultReview';
import { SegmentedControl } from '../components/SegmentedControl';
import { SortableHeader } from '../components/SortableHeader';
import { Modal } from '../components/Modal';
import { Icon } from '../components/Icon';
import { ScreenActions } from '../components/ScreenActions';
import { universityLogoFile } from '../components/UniversityLogo';
import { useCompactResults } from '../components/ResultFilters';
import { CollectedResultFields } from '../components/CollectedResultFields';
import { PlacementCoverage } from '../components/PlacementCoverage';
import '../styles/national-placement.css';

type Catalog = Awaited<ReturnType<typeof loadNationalCatalog>>;
type SortKey = 'university' | 'program' | 'recruit_unit' | 'admission_type' | 'round' | CutField | 'basis';
const UNIVERSITY_PAGE = 10, ROW_PAGE = 50;
// 시안(530:85565 · 532:86654) 등급 범위 입력은 "1.0 ~ 9.0"
const DEFAULTS: PlacementFilters = { ...defaultPlacementFilters, min: '1.0', max: '9.0' };
const CUT_CHIPS: CutField[] = ['cut_50', 'cut_70', 'cut_75', 'cut_80', 'cut_85', 'cut_90', 'cut_100'];
const MEAN_CHIPS: [CutField, string][] = [['mean', '평균'], ['mean_university', '대학 반영·환산 평균'], ['mean_all', '전과목 평균'], ['mean_top9', '상위 9과목 평균'], ['mean_main', '국영수사과 평균']];
const TYPE_TABS = ['교과', '종합', '논술', '기타', '전체'];
const grade = (value: string) => { const n = gradeCoordinate(value); return n === null ? value : String(Number(n.toFixed(2))); };

export function NationalPlacement() {
  const compact = useCompactResults();
  const [catalog, setCatalog] = useState<Catalog | null>(null), [year, setYear] = useState('');
  const [rows, setRows] = useState<NationalPlacementRow[] | null>(null), [error, setError] = useState(''), [indexError, setIndexError] = useState('');
  const [attempt, setAttempt] = useState(0), [indexAttempt, setIndexAttempt] = useState(0);
  const [filters, setFilters] = useState<PlacementFilters>({ ...DEFAULTS });
  const [view, setView] = useState<'plot' | 'table' | 'coverage'>('plot'), [page, setPage] = useState(0);
  const [sort, setSort] = useState<TableSort<SortKey>>(null), [selected, setSelected] = useState<NationalPlacementRow[] | null>(null);
  const [detailOpen, setDetailOpen] = useState(true), [sheet, setSheet] = useState(false);
  const [head, setHead] = useState<Element | null>(null);
  useEffect(() => { setHead(compact ? null : document.querySelector('.topbar__heading')); }, [compact]);
  useEffect(() => {
    let active = true; setIndexError('');
    loadNationalCatalog().then(value => { if (active) { setCatalog(value); setYear([...value.index.years].sort((a, b) => b.year.localeCompare(a.year))[0].year); } })
      .catch(() => { if (active) setIndexError('배치표 목록을 불러오지 못했어요. 다시 시도해 주세요.'); });
    return () => { active = false; };
  }, [indexAttempt]);
  useEffect(() => {
    let active = true; setRows(null); setError(''); setPage(0); setSelected(null);
    const entry = catalog?.index.years.find(y => y.year === year);
    if (catalog && entry) loadNationalYear(entry, catalog.collection).then(value => { if (active) setRows(value); })
      .catch(e => { if (active) setError(e instanceof Error ? e.message : '배치표를 불러오지 못했어요.'); });
    return () => { active = false; };
  }, [catalog, year, attempt]);
  const filtered = useMemo(() => filterNationalRows(rows ?? [], filters), [rows, filters]);
  const groups = useMemo(() => universityPoints(filtered, filters.cut), [filtered, filters.cut]);
  const searching = !!(filters.university.trim() || filters.query.trim());
  const alternatives = useMemo(() => {
    const visible = new Set(filtered.map(r => r.university));
    return (Object.keys(STATISTIC_LABELS) as CutField[]).filter(cut => cut !== filters.cut).map(cut => ({ cut,
      names: [...new Set(filterNationalRows(rows ?? [], { ...filters, cut }).map(r => r.university))].filter(name => !visible.has(name)) })).filter(item => item.names.length);
  }, [rows, filtered, filters]);
  const collectedMatches = useMemo(() => filters.university.trim()
    ? catalog?.collection.universities.filter(e => matchesUniversity(e.university, filters.university)) ?? [] : [], [catalog, filters.university]);
  const tableValue = (row: NationalPlacementRow, key: SortKey) => key in STATISTIC_LABELS ? statisticValue(row, key as CutField) : key === 'basis' ? statisticDetail(row, filters.cut) : row[key as 'university'];
  const sorted = sortTableRows(filtered, sort, tableValue, key => key in STATISTIC_LABELS);
  const tableColumns: [SortKey, string][] = [['university', '대학·캠퍼스'], ['recruit_unit', '모집단위'], ['program', '전형'], ['admission_type', '유형'], ['round', '시기'], [filters.cut, STATISTIC_LABELS[filters.cut]], ['basis', '산출 기준·대상']];
  const pages = Math.max(1, Math.ceil((view === 'plot' ? groups.length : filtered.length) / (view === 'plot' ? UNIVERSITY_PAGE : ROW_PAGE)));
  const current = Math.min(page, pages - 1), bounds = placementBounds(filters);
  const patch = (next: Partial<PlacementFilters>) => { setFilters(f => ({ ...f, ...next })); setPage(0); setSelected(null); };
  const reset = () => { setFilters({ ...DEFAULTS }); setSort(null); setPage(0); };
  const chooseCut = (cut: CutField) => { patch({ cut }); setSort(null); };
  const chooseYear = (value: string) => { setYear(value); setPage(0); };
  const years = catalog ? [...catalog.index.years].sort((a, b) => a.year.localeCompare(b.year)).map(y => y.year) : [];
  const range = `등급 ${grade(filters.min)}~${grade(filters.max)}`;
  const cutLabel = STATISTIC_LABELS[filters.cut];
  const pending = catalog ? catalog.collection.universities.length - groups.length : 0;
  const collectedCount = catalog?.collection.universities.length ?? 0;
  const universitySearch = <label className="text-input np-search"><Icon name="search" size={20} /><input type="search" aria-label="대학 검색" value={filters.university} onChange={e => patch({ university: e.target.value })} placeholder="대학 검색 (예: 강원, 경북)" /></label>;
  const querySearch = <label className="text-input np-search"><Icon name="search" size={20} /><input type="search" aria-label="학과·전형 검색" value={filters.query} onChange={e => patch({ query: e.target.value })} placeholder="학과·전형 검색 (예: 간호, 교과)" /></label>;
  const detail = <div className="np-detail">
    <div className="np-detail__line">
      <div className="np-field"><span className="np-label">입결 학년도</span><SegmentedControl label="입결 학년도" value={year} onChange={chooseYear} options={years.map(y => ({ value: y, label: y }))} /></div>
      <div className="np-field"><span className="np-label">모집시기</span><SegmentedControl label="모집시기" value={filters.round} onChange={round => patch({ round })} options={[{ value: '수시', label: '수시' }, { value: '정시', label: '정시' }]} /></div>
      <div className="np-field"><span className="np-label">입결 지표</span><SegmentedControl label="입결 지표" value={filters.metric} onChange={metric => patch({ metric })} options={[{ value: '교과등급', label: '교과등급' }, { value: '수능등급', label: '수능등급' }]} /></div>
    </div>
    <div className="np-field np-field--cuts" role="group" aria-label="컷·통계 기준"><span className="np-label" aria-hidden="true">컷·통계 기준</span><div className="np-chips">
      <div><span className="np-chip-group">컷</span>{CUT_CHIPS.map(cut => <button key={cut} type="button" className="filter-chip" aria-pressed={filters.cut === cut} onClick={() => chooseCut(cut)}>{STATISTIC_LABELS[cut]}</button>)}</div>
      <div><span className="np-chip-group">평균</span>{MEAN_CHIPS.map(([cut, label]) => <button key={cut} type="button" className="filter-chip" aria-pressed={filters.cut === cut} onClick={() => chooseCut(cut)}>{label}</button>)}</div>
    </div></div>
    <div className="np-field"><span className="np-label">등급 범위</span><div className="np-range">
      <label className="text-input np-grade"><input type="number" min="1" max="9" step="0.1" aria-label="등급 범위 시작" value={filters.min} onChange={e => patch({ min: e.target.value })} /></label><span aria-hidden="true">~</span>
      <label className="text-input np-grade"><input type="number" min="1" max="9" step="0.1" aria-label="등급 범위 끝" value={filters.max} onChange={e => patch({ max: e.target.value })} /></label>
      <span className="np-hint">1~9 사이, 0.1 단위</span></div></div>
  </div>;
  const viewTabs = catalog && <SegmentedControl label="배치표 보기" value={view} onChange={value => { setView(value); setPage(0); }} options={[{ value: 'plot', label: compact ? '좌표' : '좌표 배치표' }, { value: 'table', label: compact ? '목록' : '전체 목록' }, { value: 'coverage', label: `수집 대학 ${collectedCount}` }]} />;
  const chipSelect = (label: string, text: string, on: boolean, value: string, onChange: (v: string) => void, options: [string, string][]) =>
    <label className="filter-chip" data-on={on || undefined}><span aria-hidden="true">{text} <span className="np-caret">▾</span></span><select aria-label={label} value={value} onChange={e => onChange(e.target.value)}>{options.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select></label>;
  return <section className="student-screen national-placement" data-slug="national-placement" aria-label="전국 대학 배치표">
    {head && createPortal(<><h1 className="np-title">전국 대학 배치표</h1><p className="np-lead">대학이 발표한 지난 입결의 위치를 살펴봐요</p></>, head)}
    {compact ? <div className="np-head"><h2>전국 대학 배치표</h2><p className="np-lead">대학이 발표한 지난 입결의 위치를 살펴봐요</p>
      <div className="np-head__row"><span className="data-status-badge np-asof">데이터 기준일 {dataAsOf}</span><Link className="np-link" to="/admission-results">대학별 입결 보기 ›</Link></div></div>
      : <ScreenActions><span className="data-status-badge np-asof">데이터 기준일 {dataAsOf}</span><Link className="button-outline" to="/admission-results">대학별 입결 보기</Link></ScreenActions>}
    {indexError ? <div role="alert" className="empty-state"><p>{indexError}</p><button className="button-outline" onClick={() => setIndexAttempt(n => n + 1)}>목록 다시 불러오기</button></div>
      : !catalog ? <p role="status">전국 배치표 목록을 읽고 있어요.</p> : <>
        {compact ? <>
          {universitySearch}
          <div className="np-chiprow" aria-label="배치표 조회 조건">
            <button type="button" className="filter-chip" onClick={() => setSheet(true)}><Icon name="sliders-horizontal" size={16} />전체 조건</button>
            {chipSelect('입결 학년도', `${year}학년도`, year !== years[years.length - 1], year, chooseYear, years.map(y => [y, `${y}학년도`]))}
            {chipSelect('모집시기', filters.round, filters.round !== DEFAULTS.round, filters.round, round => patch({ round }), [['수시', '수시'], ['정시', '정시']])}
            {chipSelect('입결 지표', filters.metric, filters.metric !== DEFAULTS.metric, filters.metric, metric => patch({ metric }), [['교과등급', '교과등급'], ['수능등급', '수능등급']])}
            {chipSelect('컷·통계 기준', cutLabel, filters.cut !== DEFAULTS.cut, filters.cut, v => chooseCut(v as CutField), (Object.entries(STATISTIC_LABELS) as [string, string][]))}
            <button type="button" className="filter-chip" data-on={filters.min !== DEFAULTS.min || filters.max !== DEFAULTS.max || undefined} onClick={() => setSheet(true)}>{range} <span className="np-caret" aria-hidden="true">▾</span></button>
            <button type="button" className="filter-chip" data-on={!!filters.query.trim() || undefined} onClick={() => setSheet(true)}>{filters.query.trim() ? `학과·전형: ${filters.query.trim()}` : '학과·전형'} <span className="np-caret" aria-hidden="true">▾</span></button>
          </div>
          {viewTabs}
          {sheet && <Modal label="조회 조건" onClose={() => setSheet(false)}><div className="section-row"><h3 className="t-heading-3">조회 조건</h3><button className="button-outline" onClick={() => setSheet(false)}>닫기</button></div>
            {querySearch}{detail}<div className="toolbar"><button className="button-outline" onClick={reset}>조건 초기화</button><button className="button-primary" onClick={() => setSheet(false)}>대학 {groups.length}곳 보기</button></div></Modal>}
        </> : <section className="np-card np-conditions" aria-label="배치표 조회 조건">
          <div className="np-search-row">{universitySearch}{querySearch}<button className="button-outline" onClick={reset}>조건 초기화</button></div>
          <div className="np-toggle"><button type="button" aria-expanded={detailOpen} onClick={() => setDetailOpen(o => !o)}>상세 조건 {detailOpen ? '▴' : '▾'}</button><span>{year}학년도 · {filters.round} · {filters.metric} · {cutLabel} · {range}</span></div>
          {detailOpen && detail}
        </section>}
        {!bounds && <p className="error-note" role="alert">등급 범위는 1~9 사이에서 시작 값이 끝 값보다 작거나 같게 입력해 주세요.</p>}
        <section className="np-card np-result" aria-label="전국 배치표 조회 결과" aria-busy={!rows && !error}>
          <div className="np-result__head"><div><h3>{year}학년도 · {filters.metric} {cutLabel}</h3>{rows && <p role="status">대학 {groups.length}곳 · 원문 {filtered.length.toLocaleString()}행</p>}</div>{!compact && viewTabs}</div>
          {view !== 'coverage' && <SegmentedControl label="전형 유형" value={filters.type} onChange={type => patch({ type })} options={TYPE_TABS.map(t => ({ value: t, label: t }))} />}
          {view !== 'coverage' && <div className="np-status">
            <div className="np-mine"><span className="np-label">내 위치</span><span className="data-status-badge">준비 중</span><p>검수된 환산 규칙이 생기면 배치표 위에 내 위치를 보여 드려요</p></div>
            <div className="np-pending"><span className="data-status-badge">준비 중</span><p>수집 대학 중 {pending}곳은 좌표를 찍지 않았어요</p><button type="button" className="np-link" onClick={() => { setView('coverage'); setPage(0); }}>수집 대학에서 원문 보기 ›</button></div>
          </div>}
          {view !== 'coverage' && rows && !error && alternatives.length > 0 && (searching || !filtered.length) && <div className="national-coverage-note" role="note">
            <p>지금 보이지 않는 대학도 다른 통계로 볼 수 있어요.</p>
            <div className="national-statistic-actions">{alternatives.map(item => <button key={item.cut} className="filter-chip" onClick={() => chooseCut(item.cut)} aria-label={`${STATISTIC_LABELS[item.cut]}으로 보기`}>{STATISTIC_LABELS[item.cut]} · 추가 {item.names.length}곳</button>)}</div>
          </div>}
          {view !== 'coverage' && rows && !error && collectedMatches.length > 0 && <details className="national-coverage-note" open={!filtered.length}>
            <summary>검색한 대학의 수집 자료 {collectedMatches.length}곳 · 좌표가 없어도 원문 보기</summary>
            <ul>{collectedMatches.map(entry => <li key={entry.university}><Link to={`/admission-results?view=collected&cu=${encodeURIComponent(entry.university)}`}>{entry.university} 수집 자료</Link><span className="t-caption text-muted"> · {entry.years.join('·')}학년도</span></li>)}</ul>
          </details>}
          {error ? <div role="alert"><p>{error}</p><button className="button-outline" onClick={() => setAttempt(n => n + 1)}>자료 다시 불러오기</button></div>
            : !rows ? <p role="status">{year}학년도 배치표를 읽고 있어요.</p>
              : view === 'coverage' ? <PlacementCoverage key={JSON.stringify([year, filters])} collection={catalog.collection} rows={rows} filters={filters} year={year} onChoose={(university, cut) => { patch({ university, cut, min: DEFAULTS.min, max: DEFAULTS.max }); setSort(null); setView('plot'); }} />
                : !filtered.length ? <div className="empty-state"><h4 className="t-heading-3">조건에 맞는 입결 좌표가 없어요</h4><p>대학·학과 검색이나 학년도·지표·컷 기준을 바꿔 보세요. 9등급제와 선택한 컷 수치가 명시된 자료만 표시해요.</p></div> : <>
                  {view === 'plot' ? <>
                    <p className="np-caption">가로 = 발표 등급 · 1이 왼쪽 · 세로 위치는 대학 가나다순</p>
                    <NationalPlot key={JSON.stringify([year, current, filters])} groups={groups.slice(current * UNIVERSITY_PAGE, (current + 1) * UNIVERSITY_PAGE)} cut={filters.cut} onSelect={setSelected} />
                  </> : <div className="table-scroll"><table className="data-table national-table"><caption className="sr-only">전국 대학 수집 입결 목록</caption><thead><tr>{tableColumns.map(([key, label]) => <SortableHeader key={key} column={key} label={label} sort={sort} onSort={key => { setSort(s => nextTableSort(s, key)); setPage(0); }} />)}<th scope="col">상세</th></tr></thead>
                    <tbody>{sorted.slice(current * ROW_PAGE, (current + 1) * ROW_PAGE).map(r => <tr key={r.id}>{tableColumns.map(([key]) => <td key={key}>{tableValue(r, key) || '—'}</td>)}<td><button className="text-button" onClick={() => setSelected([r])} aria-label={`${r.university} ${r.program} ${r.recruit_unit} 원문 상세`}>원문·상세</button></td></tr>)}</tbody></table></div>}
                  <nav className="np-pagination" aria-label="배치표 페이지"><button className="button-outline" disabled={!current} onClick={() => setPage(p => p - 1)}>이전</button><span>{current + 1} / {pages}</span><button className="button-outline" disabled={current + 1 >= pages} onClick={() => setPage(p => p + 1)}>다음</button></nav>
                </>}
        </section>
        <details className="trace-accordion np-trace"><summary>어떻게 찍었나요?<Icon name="chevron-down" size={20} /></summary><ol>
          <li>점은 대학이 발표한 9등급제 단일 수치를 그대로 찍었어요. 가로 위치 = 발표 등급이고, 겹치는 점만 위아래로 나눴어요.</li>
          <li>통계마다 대상과 산출 기준이 달라요. 평균을 컷으로 바꾸거나 서로 다른 컷을 같은 값으로 묶지 않아요.</li>
          <li>같은 대학 · 같은 값 · 같은 전형 유형은 점 하나로 묶고, 옆 숫자가 원문 행 수예요. 점을 누르면 원문을 볼 수 있어요.</li>
          <li>원문 대조와 이용 조건 확인 전 참고자료예요. 좌표가 없는 대학도 ‘수집 대학’에서 제외 사유와 원문을 볼 수 있어요.</li>
          <li>수집 여부와 좌표 표시 여부는 달라요. 다른 학년도 · 다른 통계는 조건을 바꿔 봐요.</li>
          {rows && <li><strong>이번 화면: 대학 {groups.length}곳 · 원문 {filtered.length.toLocaleString()}행 · 좌표 없음 {pending}곳</strong></li>}
        </ol></details>
        <p className="disclaimer-note np-note"><Icon name="info" size={16} /><span>대학이 발표한 지난 입결을 옮긴 자료예요 · 대학마다 반영 교과와 산출 기준이 달라요 · 성적 판정과 계산에 쓰지 않아요 · 대학 공식 자료가 최종 기준이에요 · 데이터 기준일 {dataAsOf} · 원문 대조 전 참고자료예요</span></p>
      </>}
    {selected && catalog && <NationalSource key={selected[0].id} records={selected} cut={filters.cut} collection={catalog.collection} onClose={() => setSelected(null)} />}
  </section>;
}

// 원형 표식은 SVG로 그려요(base.css 모서리 0 규칙). 교과 ● · 종합 ○ · 논술 ■ · 기타 □
function Mark({ type }: { type: string }) {
  const fill = type === '교과' || type === '논술' ? 'np-mark--fill' : '';
  return <svg className={`np-mark ${fill}`} viewBox="0 0 11 11" aria-hidden="true">{type === '교과' || type === '종합' ? <circle cx="5.5" cy="5.5" r="5" /> : <rect x="0.5" y="0.5" width="10" height="10" />}</svg>;
}
const DOT = 11;
/** 같은 값이라도 전형 유형(점 모양)이 다르면 따로 찍고, 겹치는 점만 아래 줄로 내려요. 가로 위치는 항상 정확한 값. */
function plotPoints(points: ReturnType<typeof universityPoints>[number]['points'], width: number) {
  const split = points.flatMap(point => {
    const byType = new Map<string, NationalPlacementRow[]>();
    for (const r of point.records) byType.set(typeBucket(r.admission_type), [...byType.get(typeBucket(r.admission_type)) ?? [], r]);
    return [...byType].map(([bucket, records]) => ({ value: point.value, bucket, records }));
  });
  const ends: number[] = [];
  return split.map(point => {
    const x = (point.value - 1) / 8 * width, need = DOT + (point.records.length > 1 ? 10 : 2);
    let lane = ends.findIndex(end => x - end >= need);
    if (lane === -1) lane = ends.length;
    ends[lane] = x;
    return { ...point, x, lane };
  });
}

function NationalPlot({ groups, cut, onSelect }: { groups: ReturnType<typeof universityPoints>; cut: CutField; onSelect: (rows: NationalPlacementRow[]) => void }) {
  const axis = useRef<HTMLDivElement>(null), [width, setWidth] = useState(848);
  useLayoutEffect(() => {
    const element = axis.current;
    if (!element) return;
    const measure = () => setWidth(element.getBoundingClientRect().width || 848);
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const grid = Array.from({ length: 17 }, (_, i) => <i key={i} className="np-gridline" style={{ left: `${i / 16 * 100}%` }} aria-hidden="true" />);
  return <div className="result-plot np-plot">
    <div className="np-legend" aria-hidden="true">{['교과', '종합', '논술', '기타'].map(t => <span key={t}><Mark type={t} />{t}</span>)}</div>
    <div className="np-rows">
      {groups.map(group => { const points = plotPoints(group.points, width), lanes = Math.max(...points.map(p => p.lane)) + 1, logo = universityLogoFile(group.university), name = currentUniversityName(group.university);
        return <div className="np-row" key={group.university} style={{ '--np-lanes': lanes - 1 } as CSSProperties}>
          <div className="np-row__head">{logo ? <img className="np-logo" src={`${import.meta.env.BASE_URL}assets/universities/${logo}`} alt="" width={20} height={20} loading="lazy" /> : <span className="np-monogram" aria-hidden="true">{name.slice(0, 1)}</span>}<span>{name}</span></div>
          <div className="np-row__cell">{grid}
            {points.map(point => <button type="button" key={`${point.value}-${point.bucket}`} className="np-dot" style={{ left: point.x, '--np-lane': point.lane } as CSSProperties} onClick={() => onSelect(point.records)}
              title={`${group.university} · ${point.bucket} · ${point.value}등급 · ${point.records.length}행`}
              aria-label={`${group.university} ${STATISTIC_LABELS[cut]} ${point.value}등급, ${point.bucket}, 원문 ${point.records.length}행 상세`}><Mark type={point.bucket} />{point.records.length > 1 && <span className="np-count" aria-hidden="true">{point.records.length}</span>}</button>)}
          </div>
        </div>;
      })}
      <div className="np-row np-axis" aria-hidden="true"><div /><div className="np-row__cell" ref={axis}>{grid}{Array.from({ length: 9 }, (_, i) => <span key={i} style={{ left: `${i / 8 * 100}%` }}>{i + 1}</span>)}</div></div>
    </div>
  </div>;
}

function NationalSource({ records, cut, collection, onClose }: { records: NationalPlacementRow[]; cut: CutField; collection: Catalog['collection']; onClose: () => void }) {
  const [chosen, setChosen] = useState<NationalPlacementRow | null>(records.length === 1 ? records[0] : null);
  const [row, setRow] = useState<ResultRow | null>(null), [error, setError] = useState(''), [attempt, setAttempt] = useState(0), [page, setPage] = useState(0);
  useEffect(() => {
    let active = true; setRow(null); setError('');
    if (chosen) loadPlacementSource(chosen, collection).then(value => { if (active) setRow(value); }).catch(e => { if (active) setError(e instanceof Error ? e.message : '원문 자료를 불러오지 못했어요.'); });
    return () => { active = false; };
  }, [chosen, collection, attempt]);
  return <Modal wide label="배치표 입결 원문 상세" onClose={onClose}>
    <div className="section-row"><h3 className="t-heading-3">{records[0].university} · {records[0].year}학년도</h3><button className="button-outline" onClick={onClose}>닫기</button></div>
    {chosen ? <><div className="national-coverage-note"><strong>{STATISTIC_LABELS[cut]} · {statisticValue(chosen, cut)}등급</strong><p>{statisticDetail(chosen, cut)}</p></div>{records.length > 1 && <button className="button-outline" onClick={() => setChosen(null)}>같은 위치의 {records.length}행 보기</button>}
      {error ? <div role="alert"><p>{error}</p><button className="button-outline" onClick={() => setAttempt(n => n + 1)}>원문 다시 불러오기</button></div> : row ? <CollectedResultFields row={row} /> : <p role="status">원문 자료를 읽고 있어요.</p>}</>
      : <><p>같은 위치의 원문 {records.length}행이에요. 확인할 전형·모집단위를 선택해 주세요.</p><div className="national-source-options">{records.slice(page * 20, (page + 1) * 20).map(r => <button className="button-outline" key={r.id} onClick={() => setChosen(r)}><span>{r.recruit_unit} · {r.program} · {r.round}</span><span className="t-caption text-muted">{r.basis || '산출 기준 미기재'}</span></button>)}</div>
        {records.length > 20 && <nav className="toolbar" aria-label="같은 좌표 원문 페이지"><button className="button-outline" disabled={!page} onClick={() => setPage(p => p - 1)}>이전</button><span>{page + 1} / {Math.ceil(records.length / 20)}</span><button className="button-outline" disabled={(page + 1) * 20 >= records.length} onClick={() => setPage(p => p + 1)}>다음</button></nav>}</>}
  </Modal>;
}
