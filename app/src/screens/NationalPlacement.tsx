import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { loadNationalCatalog, loadNationalYear, loadPlacementSource } from '../data/nationalPlacement';
import { defaultPlacementFilters, filterNationalRows, placementBounds, placementX, pointLanes, universityPoints, type CutField, type NationalPlacementRow, type PlacementFilters } from '../domain/nationalPlacement';
import { nextTableSort, sortTableRows, type TableSort } from '../domain/tableSort';
import type { ResultRow } from '../domain/resultReview';
import { SegmentedControl } from '../components/SegmentedControl';
import { SortableHeader } from '../components/SortableHeader';
import { Modal } from '../components/Modal';
import { useCompactResults } from '../components/ResultFilters';
import { CollectedResultFields } from '../components/CollectedResultFields';
import '../styles/national-placement.css';

type Catalog = Awaited<ReturnType<typeof loadNationalCatalog>>;
type SortKey = 'university' | 'program' | 'recruit_unit' | 'admission_type' | 'round' | 'cut_50' | 'cut_70' | 'basis';
const TABLE_COLUMNS: [SortKey, string][] = [['university', '대학·캠퍼스'], ['recruit_unit', '모집단위'], ['program', '전형'], ['admission_type', '유형'], ['round', '시기'], ['cut_50', '50% 컷'], ['cut_70', '70% 컷'], ['basis', '산출 기준']];
const UNIVERSITY_PAGE = 10, ROW_PAGE = 50;

export function NationalPlacement() {
  const compact = useCompactResults();
  const [catalog, setCatalog] = useState<Catalog | null>(null), [year, setYear] = useState('');
  const [rows, setRows] = useState<NationalPlacementRow[] | null>(null), [error, setError] = useState(''), [indexError, setIndexError] = useState('');
  const [attempt, setAttempt] = useState(0), [indexAttempt, setIndexAttempt] = useState(0);
  const [filters, setFilters] = useState<PlacementFilters>({ ...defaultPlacementFilters });
  const [view, setView] = useState<'plot' | 'table'>('plot'), [page, setPage] = useState(0);
  const [sort, setSort] = useState<TableSort<SortKey>>(null), [selected, setSelected] = useState<NationalPlacementRow[] | null>(null);
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
  const sorted = useMemo(() => sortTableRows(filtered, sort, (r, key) => r[key], key => key === 'cut_50' || key === 'cut_70'), [filtered, sort]);
  const pages = Math.max(1, Math.ceil((view === 'plot' ? groups.length : filtered.length) / (view === 'plot' ? UNIVERSITY_PAGE : ROW_PAGE)));
  const current = Math.min(page, pages - 1), bounds = placementBounds(filters);
  const patch = (next: Partial<PlacementFilters>) => { setFilters(f => ({ ...f, ...next })); setPage(0); setSelected(null); };
  const reset = () => { setFilters({ ...defaultPlacementFilters }); setSort(null); setPage(0); };
  const choice = (field: 'round' | 'admission_type') => [...new Set((rows ?? []).map(r => r[field]).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ko'));
  return <section className="student-screen national-placement" data-slug="national-placement" aria-label="전국 대학 배치표">
    <header className="screen-heading"><div><h2 className="t-heading-1">전국 대학 배치표</h2><p className="text-muted">대학이 발표한 지난 입결의 위치를 살펴보세요.</p></div><Link className="button-outline" to="/admission-results">대학별 입결 보기</Link></header>
    {indexError ? <div role="alert" className="empty-state"><p>{indexError}</p><button className="button-outline" onClick={() => setIndexAttempt(n => n + 1)}>목록 다시 불러오기</button></div>
      : !catalog ? <p role="status">전국 배치표 목록을 읽고 있어요.</p> : <>
        <section className="filter-panel" aria-label="배치표 조회 조건">
          <div className="section-row"><span className="data-status-badge">검수 전 참고자료 · 9등급제</span><p className="t-caption text-muted">수집 {catalog.index.collection_universities}개 대학·캠퍼스 중 좌표가 있는 자료만 표시</p></div>
          <div className="national-query-grid">
            <label>대학 검색<input type="search" value={filters.university} onChange={e => patch({ university: e.target.value })} placeholder="예: 강원, 경북" /></label>
            <label>학과·전형 검색<input type="search" value={filters.query} onChange={e => patch({ query: e.target.value })} placeholder="예: 간호, 교과" /></label>

            <button className="button-outline" onClick={reset}>조건 초기화</button>
          </div>
          <details className="national-advanced" open={!compact}><summary>상세 조건 · {year}학년도 · {filters.round} · {filters.cut === 'cut_70' ? '70%' : '50%'} 컷</summary>
          <div className="national-filter-grid">
            <label>입결 학년도<select value={year} onChange={e => { setYear(e.target.value); setPage(0); }}>{catalog.index.years.map(y => <option key={y.year} value={y.year}>{y.year}학년도</option>)}</select></label>
            <label>모집시기<select value={filters.round} onChange={e => patch({ round: e.target.value })}><option>전체</option>{[...new Set(['수시', ...choice('round')])].map(r => <option key={r}>{r}</option>)}</select></label>
            <label>전형 유형<select value={filters.type} onChange={e => patch({ type: e.target.value })}><option>전체</option>{[...new Set([...choice('admission_type'), ...(filters.type === '전체' ? [] : [filters.type])])].map(t => <option key={t}>{t}</option>)}</select></label>
            <label>입결 지표<select value={filters.metric} onChange={e => patch({ metric: e.target.value })}><option>교과등급</option><option>수능등급</option></select></label>
            <label>컷 기준<select value={filters.cut} onChange={e => patch({ cut: e.target.value as CutField })}><option value="cut_70">70% 컷</option><option value="cut_50">50% 컷</option></select></label>
            <div className="national-range"><label>등급 범위 시작<input type="number" min="1" max="9" step="0.1" value={filters.min} onChange={e => patch({ min: e.target.value })} /></label><span aria-hidden="true">~</span><label>등급 범위 끝<input type="number" min="1" max="9" step="0.1" value={filters.max} onChange={e => patch({ max: e.target.value })} /></label></div>
          </div>
          </details>
          {!bounds && <p className="error-note" role="alert">등급 범위는 1~9 사이에서 시작 값이 끝 값보다 작거나 같게 입력해 주세요.</p>}
          <p className="t-caption text-muted">대학마다 반영 교과와 산출 기준이 달라요. 성적 판정·지원 가능성 계산에는 사용하지 않으며, 원문 대조와 이용 조건 확인 전 자료예요.</p>
        </section>
        <section className="result-panel" aria-label="전국 배치표 조회 결과" aria-busy={!rows && !error}>
          <div className="section-row"><div><h3 className="t-heading-2">{year}학년도 · {filters.metric} {filters.cut === 'cut_70' ? '70%' : '50%'} 컷</h3>{rows && <p className="t-body-sm" role="status">{groups.length}개 대학·캠퍼스 · 원문 {filtered.length.toLocaleString()}행</p>}</div>
            <SegmentedControl label="배치표 보기" value={view} onChange={value => { setView(value); setPage(0); }} options={[{ value: 'plot', label: '좌표 배치표' }, { value: 'table', label: '전체 목록' }]} /></div>
          {error ? <div role="alert"><p>{error}</p><button className="button-outline" onClick={() => setAttempt(n => n + 1)}>자료 다시 불러오기</button></div>
            : !rows ? <p role="status">{year}학년도 배치표를 읽고 있어요.</p>
              : !filtered.length ? <div className="empty-state"><h4 className="t-heading-3">조건에 맞는 입결 좌표가 없어요</h4><p>대학·학과 검색이나 학년도·지표·컷 기준을 바꿔 보세요. 9등급제와 선택한 컷 수치가 명시된 자료만 표시해요.</p></div> : <>
                {view === 'plot' ? <>
                  <p className="t-caption text-muted">가로 위치 = 발표 등급 · 왼쪽일수록 낮은 등급 숫자. 겹치는 점은 위아래로 나눴고 세로 위치에는 의미가 없어요. 점을 누르면 해당 원문을 확인할 수 있어요.</p>
                  <NationalPlot key={JSON.stringify([year, current, filters])} groups={groups.slice(current * UNIVERSITY_PAGE, (current + 1) * UNIVERSITY_PAGE)} cut={filters.cut} onSelect={setSelected} />
                  <p className="t-caption text-muted">대학은 가나다순이에요. 같은 대학의 같은 값은 한 점으로 묶어요. 점 안의 숫자는 연결된 원문 행 수예요.</p>
                </> : <div className="table-scroll"><table className="data-table national-table"><caption className="sr-only">전국 대학 수집 입결 목록</caption><thead><tr>{TABLE_COLUMNS.map(([key, label]) => <SortableHeader key={key} column={key} label={label} sort={sort} onSort={key => { setSort(s => nextTableSort(s, key)); setPage(0); }} />)}<th scope="col">상세</th></tr></thead>
                  <tbody>{sorted.slice(current * ROW_PAGE, (current + 1) * ROW_PAGE).map(r => <tr key={r.id}>{TABLE_COLUMNS.map(([key]) => <td key={key}>{r[key] || '—'}</td>)}<td><button className="text-button" onClick={() => setSelected([r])} aria-label={`${r.university} ${r.program} ${r.recruit_unit} 원문 상세`}>원문·상세</button></td></tr>)}</tbody></table></div>}
                <nav className="toolbar national-pagination" aria-label="배치표 페이지"><button className="button-outline" disabled={!current} onClick={() => setPage(p => p - 1)}>이전</button><span>{current + 1} / {pages} 페이지 · {view === 'plot' ? `${UNIVERSITY_PAGE}개 대학씩` : `${ROW_PAGE}행씩`}</span><button className="button-outline" disabled={current + 1 >= pages} onClick={() => setPage(p => p + 1)}>다음</button></nav>
              </>}
          <p className="t-caption text-muted">전국 수집본 전체가 표시되는 것은 아니에요. 등급제 미기재·점수 지표·범위 밖 값·선택한 컷이 없는 행은 제외해요. 같은 지표라도 산출 기준은 원문에서 확인해 주세요.</p>
        </section>
      </>}
    {selected && catalog && <NationalSource key={selected[0].id} records={selected} collection={catalog.collection} onClose={() => setSelected(null)} />}
  </section>;
}

function NationalPlot({ groups, cut, onSelect }: { groups: ReturnType<typeof universityPoints>; cut: CutField; onSelect: (rows: NationalPlacementRow[]) => void }) {
  const axis = useRef<HTMLDivElement>(null), [trackWidth, setTrackWidth] = useState(720);
  useLayoutEffect(() => {
    const element = axis.current;
    if (!element) return;
    const measure = () => setTrackWidth(Math.max(720, element.getBoundingClientRect().width));
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return <div className="national-plot-scroll" tabIndex={0} aria-label="대학별 입결 좌표, 가로·세로 스크롤 가능">
    <div className="national-plot">
      <div className="national-axis"><strong>대학·캠퍼스</strong><div ref={axis}>{Array.from({ length: 9 }, (_, i) => <span key={i} style={{ left: placementX(i + 1, trackWidth) }}>{i + 1}</span>)}<span className="sr-only">등급</span></div></div>
      {groups.map(group => { const points = pointLanes(group.points, trackWidth), height = Math.max(64, (Math.max(...points.map(p => p.lane)) + 1) * 28 + 16);
        return <div className="national-university-row" key={group.university}>
          <div className="national-university-label"><strong>{group.university}</strong><span className="t-caption text-muted">{group.points.reduce((n, p) => n + p.records.length, 0)}행</span></div>
          <div className="national-tracks" style={{ height }}>
            {Array.from({ length: 9 }, (_, i) => <i key={i} className="national-gridline" style={{ left: placementX(i + 1, trackWidth) }} aria-hidden="true" />)}
            {points.map(point => <button type="button" key={point.value} className="national-point" style={{ left: point.x, top: 8 + point.lane * 28 }} onClick={() => onSelect(point.records)}
              title={`${group.university} · ${point.value}등급 · ${point.records.length}행`}
              aria-label={`${group.university} ${cut === 'cut_70' ? '70%' : '50%'} 컷 ${point.value}등급, 원문 ${point.records.length}행 상세`}><span aria-hidden="true">{point.records.length > 1 ? point.records.length : '●'}</span></button>)}
          </div>
        </div>;
      })}
    </div>
  </div>;
}

function NationalSource({ records, collection, onClose }: { records: NationalPlacementRow[]; collection: Catalog['collection']; onClose: () => void }) {
  const [chosen, setChosen] = useState<NationalPlacementRow | null>(records.length === 1 ? records[0] : null);
  const [row, setRow] = useState<ResultRow | null>(null), [error, setError] = useState(''), [attempt, setAttempt] = useState(0), [page, setPage] = useState(0);
  useEffect(() => {
    let active = true; setRow(null); setError('');
    if (chosen) loadPlacementSource(chosen, collection).then(value => { if (active) setRow(value); }).catch(e => { if (active) setError(e instanceof Error ? e.message : '원문 자료를 불러오지 못했어요.'); });
    return () => { active = false; };
  }, [chosen, collection, attempt]);
  return <Modal wide label="배치표 입결 원문 상세" onClose={onClose}>
    <div className="section-row"><h3 className="t-heading-3">{records[0].university} · {records[0].year}학년도</h3><button className="button-outline" onClick={onClose}>닫기</button></div>
    {chosen ? <>{records.length > 1 && <button className="button-outline" onClick={() => setChosen(null)}>같은 위치의 {records.length}행 보기</button>}
      {error ? <div role="alert"><p>{error}</p><button className="button-outline" onClick={() => setAttempt(n => n + 1)}>원문 다시 불러오기</button></div> : row ? <CollectedResultFields row={row} /> : <p role="status">원문 자료를 읽고 있어요.</p>}</>
      : <><p>같은 위치의 원문 {records.length}행이에요. 확인할 전형·모집단위를 선택해 주세요.</p><div className="national-source-options">{records.slice(page * 20, (page + 1) * 20).map(r => <button className="button-outline" key={r.id} onClick={() => setChosen(r)}><span>{r.recruit_unit} · {r.program} · {r.round}</span><span className="t-caption text-muted">{r.basis || '산출 기준 미기재'}</span></button>)}</div>
        {records.length > 20 && <nav className="toolbar" aria-label="같은 좌표 원문 페이지"><button className="button-outline" disabled={!page} onClick={() => setPage(p => p - 1)}>이전</button><span>{page + 1} / {Math.ceil(records.length / 20)}</span><button className="button-outline" disabled={(page + 1) * 20 >= records.length} onClick={() => setPage(p => p + 1)}>다음</button></nav>}</>}
  </Modal>;
}
