// 수시 입결 · 대학별 (Figma admission-results 346:267881 · 346:266645, spec 02-spec.md 2장·4장).
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { loadSusiIndex as loadCollectedIndex, loadSusiRows as loadCollectedRows } from '../data/susiResults';
import { susiIssues } from '../domain/susiResults';
import type { CollectedIndex } from '../domain/collectedResults';
import type { ResultRow } from '../domain/resultReview';
import { axisMinorTicks, axisRange, axisTicks, zoomRange, TYPE_TABS, typeTab, type TypeTab } from '../domain/resultBrowse';
import { gradeCut, noPlotReason, universityPlot, yearTone } from '../domain/universityResultPlot';
import { collectedUniversityCandidates, matchesUniversityIdentity, currentUniversityName } from '../domain/universityIdentity';
import { fiveToNineFor } from '../domain/results';
import { useStudent, studentDb } from '../store/studentDb';
import { useSampleMode } from '../data/sample/mode';
import { sampleOverviewRows } from '../data/sample/public';
import { dataAsOf } from '../data/catalog';
import { UniversityLogo } from './UniversityLogo';
import { Icon } from './Icon';
import { SegmentedControl } from './SegmentedControl';
import { InterestButton } from './InterestButton';
import { interestId } from '../domain/interests';
import { PrepareProgram } from './PrepareProgram';
import { Modal } from './Modal';
import { CollectedResultFields } from './CollectedResultFields';
import { ScreenActions } from './ScreenActions';
import '../styles/university-result-overview.css';

const short = (university: string) => currentUniversityName(university).replace(/대학교$/, '대');
const tick = (t: number) => String(Math.round(t * 10) / 10);
const byYear = (rows: readonly ResultRow[]) => [...rows].sort((a, b) => Number(a.result_year) - Number(b.result_year));
const narrow = () => typeof window !== 'undefined' && !!window.matchMedia?.('(max-width: 1023px)').matches;
export type Department = ReturnType<typeof universityPlot>['departments'][number];

const DEFAULT_UNIVERSITY = '강원대학교(춘천)', DEFAULT_PROGRAM = '지역교과전형'; // 기본 전형(자료에 없으면 원래 규칙대로)
export function UniversityResultOverview({ tabs }: { tabs: ReactNode }) {
  const [query, setQuery] = useSearchParams(), sampleMode = useSampleMode();
  const sample = sampleMode && import.meta.env.VITE_SUSI_DESIGN_FIXTURE === 'true';
  const [index, setIndex] = useState<CollectedIndex | null>(null), [indexError, setIndexError] = useState('');
  const generated = index?.generated_at ? new Date(index.generated_at) : null;
  const dateLabel = sample ? `데이터 기준일 ${dataAsOf}` : `자료 정리일 ${generated && Number.isFinite(generated.getTime()) ? new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' }).format(generated) : '확인 중'}`;
  const [loaded, setLoaded] = useState<{ university: string; rows: ResultRow[] } | null>(null), [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0), [indexAttempt, setIndexAttempt] = useState(0);
  const [choosing, setChoosing] = useState(false), [search, setSearch] = useState('');
  const [view, setView] = useState<'plot' | 'table'>('plot'), [year, setYear] = useState('');
  const [picked, setPicked] = useState<{ department: string; year: number; row?: ResultRow } | null>(null), [hover, setHover] = useState<ResultRow | null>(null);
  const [choosingYear, setChoosingYear] = useState<{ department: string; rows: ResultRow[] } | null>(null); // 겹친 점의 학년도 고르기
  const [opened, setOpened] = useState<ResultRow | null>(null), [detail, setDetail] = useState(false), [page, setPage] = useState(0);
  const names = sample ? [...new Set(sampleOverviewRows.map(r => r.university))] : index?.universities.map(e => e.university) ?? [];
  // 2026-11-25 사용자 요청: 처음 보이는 대학은 직접 정한 강원대학교(춘천)(자료에 없으면 첫 대학).
  // ?gu=대학&gd=학과(전형계획 학과 검색 등에서 넘어옴): 캠퍼스가 여럿이면 차례로 열어 보고 그 학과가 있는 캠퍼스에서 멈춰요(2026-11-26)
  const gu = query.get('gu') ?? '', namesKey = names.join('|');
  // 화면이 주소를 다시 써도 같은 대학이면 후보 목록 · 진행 위치를 유지해요(다시 처음부터 돌면 캠퍼스 사이를 오가요)
  const candidates = useMemo(() => collectedUniversityCandidates(gu, names), [gu, namesKey]);
  const [alt, setAlt] = useState(0);
  useEffect(() => { setAlt(0); }, [gu, namesKey]);
  const university = candidates[alt] ?? candidates[0] ?? (names.includes(DEFAULT_UNIVERSITY) ? DEFAULT_UNIVERSITY : names[0]) ?? '';
  const tab = TYPE_TABS.includes(query.get('gt') as TypeTab) ? query.get('gt') as TypeTab : '교과';
  const rows = loaded?.university === university ? loaded.rows : null;

  // ?gd=학과로 왔고 전형(gp)을 안 정했으면 그 학과가 든 전형을 먼저 열어요
  const gd = query.get('gd'), gdRow = gd ? rows?.find(r => r.recruit_unit === gd && r.round === '수시' && (tab === '전체' || typeTab(r) === tab) && (gradeCut(r) !== null || gradeCut(r, 'cut_50') !== null)) : undefined; // 그래프에 찍을 컷이 있는 행만
  const model = useMemo(() => universityPlot(rows ?? [], tab, query.get('gp') ?? gdRow?.program ?? (university === DEFAULT_UNIVERSITY && tab === '교과' ? DEFAULT_PROGRAM : '')), [rows, tab, query, gdRow]);
  const shownYears = year ? [Number(year)] : model.years;
  const departments = model.departments.map(d => ({ ...d, points: d.points.filter(r => shownYears.includes(Number(r.result_year))) }));
  const plotted = departments.filter(d => d.points.length), others = departments.filter(d => !d.rows.some(r => gradeCut(r, model.cut) !== null));
  const visible = plotted.slice(page * 12, (page + 1) * 12);
  const student = useStudent();
  const conversion = useMemo(() => student?.data?.grades.length ? fiveToNineFor(student.data.grades, '전 교과') : null, [student]);
  const mine = conversion?.min != null && conversion.max != null ? { lo: Math.floor(conversion.min * 10) / 10, hi: Math.ceil(conversion.max * 10) / 10 } : null;
  const auto = axisRange([...plotted.flatMap(d => d.points.map(r => gradeCut(r, model.cut)!)), ...(mine ? [mine.lo, mine.hi] : [])]);
  const [zoom, setZoom] = useState<{ key: string; min: number; max: number } | null>(null), zoomKey = `${university}|${model.selected}|${year}|${model.cut}`;
  const range = zoom?.key === zoomKey ? zoom : auto, zoomed = range !== auto;
  const ticks = axisTicks(range), minorTicks = axisMinorTicks(range);
  const clamp = (v: number) => Math.min(range.max, Math.max(range.min, v)), inRange = (v: number) => v >= range.min - 1e-9 && v <= range.max + 1e-9;
  const x = (value: number) => `${(clamp(value) - range.min) / (range.max - range.min) * 100}%`;
  // 2026-11-25 사용자 요청: 그래프 위에서 휠을 굴리거나 좌우로 끌면 범위를 확대·축소해요(커서 자리 고정). 더블클릭 · "범위 원래대로"로 되돌려요.
  const plotBody = useRef<HTMLDivElement>(null), rangeRef = useRef(range);
  rangeRef.current = range;
  // 2026-11-27 사용자 요청: 그래프 아래 가로 스크롤 막대. 막대 전체 = 1~9등급, 손잡이 = 지금 보이는 범위. 움직이면 같은 폭으로 옮겨요.
  const pan = useRef<HTMLDivElement>(null), panning = useRef(false), PAN_MIN = 1, PAN_SPAN = 8;
  useEffect(() => {
    const el = pan.current;
    if (!el) return;
    const left = (range.min - PAN_MIN) / PAN_SPAN * el.scrollWidth;
    if (Math.abs(el.scrollLeft - left) > 1) { panning.current = true; el.scrollLeft = left; }
  }, [range.min, range.max]);
  const onPan = () => {
    const el = pan.current;
    if (!el) return;
    if (panning.current) { panning.current = false; return; } // 위 effect가 맞춘 스크롤은 다시 범위로 돌리지 않아요
    const w = range.max - range.min, min = Math.min(PAN_MIN + PAN_SPAN - w, Math.max(PAN_MIN, PAN_MIN + el.scrollLeft / el.scrollWidth * PAN_SPAN));
    setZoom({ key: zoomKey, min: Math.round(min * 1000) / 1000, max: Math.round((min + w) * 1000) / 1000 });
  };
  useEffect(() => {
    const el = plotBody.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      const layer = el.querySelector('.ar-plot__layer')!.getBoundingClientRect();
      if (e.clientX < layer.left || e.clientX > layer.right || !e.deltaY) return;
      e.preventDefault();
      const r = rangeRef.current, center = r.min + (e.clientX - layer.left) / layer.width * (r.max - r.min);
      setZoom({ key: zoomKey, ...zoomRange(r, center, e.deltaY > 0 ? 1.2 : 1 / 1.2) });
    };
    // 드래그(2026-11-25 사용자 선택): 누른 자리를 고정점으로 오른쪽으로 끌면 확대, 왼쪽은 축소. 4px 안 움직임은 점 누르기로 둬요.
    let drag: { x: number; center: number; from: { min: number; max: number }; moved: boolean } | null = null;
    const onDown = (e: MouseEvent) => {
      const layer = el.querySelector('.ar-plot__layer')!.getBoundingClientRect();
      if (e.button !== 0 || e.clientX < layer.left || e.clientX > layer.right) return;
      const r = rangeRef.current;
      drag = { x: e.clientX, center: r.min + (e.clientX - layer.left) / layer.width * (r.max - r.min), from: r, moved: false };
    };
    const onMove = (e: MouseEvent) => {
      if (!drag) return;
      const dx = e.clientX - drag.x;
      if (!drag.moved && Math.abs(dx) < 4) return;
      drag.moved = true; e.preventDefault(); el.classList.add('is-dragging');
      setZoom({ key: zoomKey, ...zoomRange(drag.from, drag.center, Math.exp(-dx / 200)) });
    };
    const onUp = () => { if (drag?.moved) { const stop = (ev: Event) => { ev.stopPropagation(); ev.preventDefault(); }; el.addEventListener('click', stop, { capture: true, once: true }); setTimeout(() => el.removeEventListener('click', stop, { capture: true }), 0); }
      drag = null; el.classList.remove('is-dragging'); };
    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { el.removeEventListener('wheel', onWheel); el.removeEventListener('mousedown', onDown); window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [zoomKey, view, plotted.length]);
  const interests = useLiveQuery(() => studentDb.interests.toArray().then(list => list.sort((a, b) => a.created_at.localeCompare(b.created_at))).catch(() => []), []) ?? [];
  // 고른 학과: 누른 점 → 이 전형에서 하트로 담은 학과 → 목록 가운데 학과(시작점일 뿐 추천이 아니에요).
  const saved = plotted.find(d => interests.some(i => i.university === university && i.program === model.selected && i.department === d.name));
  // ?gd=학과: 다른 화면(학과별 구간 칸)에서 넘어오면 그 학과를 먼저 골라 둬요.
  const linked = departments.find(d => d.name === query.get('gd')) ?? departments.find(d => d.rows.some(r => r.recruit_unit === query.get('gd'))); // 해마다 이름이 달라 묶인 학과도 찾아요
  // 고른 탭(전형 유형)에 그 학과가 없거나 자료를 못 읽은 캠퍼스는 건너뛰어요
  useEffect(() => {
    if (gd && (rows || error) && !gdRow && alt + 1 < candidates.length) setAlt(alt + 1);
  }, [rows, error, gd, gdRow, alt, candidates]);
  const fallback = linked ?? saved ?? plotted[Math.floor(plotted.length / 2)];
  const selected: Department | undefined = (picked && departments.find(d => d.name === picked.department)) || fallback;
  const latestOf = (d?: Department) => d && [...d.points].sort((a, b) => Number(b.result_year) - Number(a.result_year))[0];
  const selectedPoint = picked && selected?.name === picked.department ? picked.row ?? selected.points.find(r => Number(r.result_year) === picked.year) ?? latestOf(selected) : latestOf(selected);
  const tip = hover ?? selectedPoint;
  const update = (values: Record<string, string | null>) => {
    const next = new URLSearchParams(query); next.set('view', 'university');
    for (const [key, value] of Object.entries(values)) { if (value === null) next.delete(key); else next.set(key, value); }
    setPage(0); setPicked(null); setYear(''); setQuery(next);
  };
  useEffect(() => {
    if (sample) return;
    let live = true; setIndexError('');
    loadCollectedIndex().then(value => { if (live) setIndex(value); }).catch(e => { if (live) setIndexError(e instanceof Error ? e.message : '대학 목록을 읽지 못했어요.'); });
    return () => { live = false; };
  }, [indexAttempt, sample]);
  useEffect(() => {
    let live = true; setLoaded(null); setError(''); setPage(0); setPicked(null);
    if (sample) { setLoaded({ university, rows: sampleOverviewRows.filter(r => r.university === university) }); return; }
    const entry = index?.universities.find(e => e.university === university);
    if (entry) loadCollectedRows(entry).then(value => { if (live) setLoaded({ university, rows: value }); })
      .catch(e => { if (live) setError(e instanceof Error ? e.message : '대학 자료를 읽지 못했어요.'); });
    return () => { live = false; };
  }, [index, university, attempt, sample]);

  if (indexError) return <div role="alert" className="result-panel"><p>{indexError}</p><button className="button-outline" onClick={() => setIndexAttempt(n => n + 1)}>목록 다시 불러오기</button></div>;
  if (!sample && !index) return <p role="status">대학별 입결 목록을 읽고 있어요.</p>;
  const pick = (d: Department, row?: ResultRow) => { setPicked({ department: d.name, year: Number((row ?? latestOf(d) ?? d.rows[0])?.result_year), row }); if (narrow()) setDetail(true); };
  const basisNote = [...new Set(others.map(d => d.rows[0]?.basis || '다른 기준'))].join(' · ');
  const detailPanel = selected && <SelectedDetail university={university} program={model.selected} department={selected} years={model.years} cut={model.cut} preferred={selectedPoint} onSource={setOpened} />;
  const lead = `${currentUniversityName(university)} ${model.selected || tab} 최근 3년 ${model.cutLabel}이에요.`;

  return <section className="ar" aria-label="대학별 최근 3년 입결">
    <ScreenActions><span className="data-status-badge ar-asof">{dateLabel}</span></ScreenActions>
    <div className="ar-columns">
      <div className="ar-center">
        <div className="ar-top">
          {tabs}
          <div className="ar-univ">
            <UniversityLogo university={university} /><h3>{currentUniversityName(university)}</h3>
            <button type="button" className="ar-univ__change" aria-label="대학 바꾸기" onClick={() => { setSearch(''); setChoosing(true); }}>바꾸기<span className="ar-desktop"> ▾</span><span className="ar-mobile"> ›</span></button>
            {rows && <p className="ar-univ__meta">학과 {new Set(rows.map(r => r.recruit_unit)).size}개</p>}
          </div>
        </div>
        <div className="ar-controls">
          <div className="ar-type"><SegmentedControl label="전형 유형" value={tab} onChange={value => update({ gt: value, gp: null })} options={TYPE_TABS.map(value => ({ value, label: value }))} /></div>
          <div className="ar-view"><SegmentedControl label="좌표와 표" value={view} onChange={setView} options={[{ value: 'plot', label: '좌표' }, { value: 'table', label: '표' }]} /></div>
          <div className="ar-chips">
            {/* shortcut: 학과별 계열 자료가 아직 없어 '계열 전체'만 있어요. 계열표가 입결에 붙으면 인문·자연·의약·예체능을 더해요. */}
            <label className="filter-chip"><span aria-hidden="true">계열 전체</span><select aria-label="계열"><option>계열 전체</option></select><Icon name="chevron-down" size={16} /></label>
            <label className="filter-chip"><span aria-hidden="true">{year ? `${year}학년도` : '최근 3년'}</span><select aria-label="학년도" value={year} onChange={e => { setYear(e.target.value); setPicked(null); }}><option value="">최근 3년</option>{[...model.years].reverse().map(y => <option key={y} value={y}>{y}학년도</option>)}</select><Icon name="chevron-down" size={16} /></label>
          </div>
        </div>
        <section className="ar-card" aria-label="학과별 입결">
          {error ? <div role="alert" className="ar-error"><p><Icon name="triangle-alert" size={20} />{error}</p><button className="button-outline" onClick={() => setAttempt(n => n + 1)}>대학 자료 다시 불러오기</button></div>
          : !rows ? <p role="status" className="ar-lead">{currentUniversityName(university)} 자료를 읽고 있어요.</p> : <>
            {model.programs.length > 1 && <label className="ar-program"><span className="sr-only">전형 선택</span><select className="text-input" aria-label="전형 선택" value={model.selected} onChange={e => update({ gp: e.target.value })}>{model.programs.map(p => <option key={p} value={p}>{p || '전형 미기재'}</option>)}</select><Icon name="chevron-down" size={20} /></label>}
            {!sample && model.rows.some(r => susiIssues(r).length) && <p className="notice">원문 대조가 필요한 {model.rows.filter(r => susiIssues(r).length).length}행은 표·원문 상세에서 확인할 수 있어요.</p>}
            {!departments.length ? <div className="empty-state"><h4 className="t-heading-4">조건에 맞는 학과가 없어요</h4><p>다른 전형 유형을 골라 보세요.</p></div> : view === 'table' ? <ResultTable key={`${university}|${model.selected}`} university={university} program={model.selected} departments={departments} years={shownYears} cut={model.cut} selected={selected?.name} onPick={d => pick(d)} /> : !plotted.length ? <div className="empty-state"><h4 className="t-heading-4">그래프로 그릴 {model.cutLabel}이 없어요</h4><p>{noPlotReason(model.rows)} 발표한 값은 표에서 그대로 볼 수 있어요.</p><button className="button-primary" onClick={() => setView('table')}>표로 보기</button></div> : <>
              <div className="ar-head">
                <p className="ar-lead">{lead}<span className="ar-desktop"> 점에 올리면 값이, 누르면 오른쪽에 자세한 값이 보여요.</span><span className="ar-mobile"> 점 하나가 한 해의 컷이에요.</span></p>
                <div className="ar-legend">{[...model.years].reverse().map(y => <span key={y}><svg aria-hidden="true" viewBox="0 0 11 11" className={`result-plot ar-dot ${yearTone(model.rows, y)}`}><circle cx="5.5" cy="5.5" r="5" /></svg>{y}학년도</span>)}{mine && <span><i className="ar-swatch" />내 환산 범위</span>}</div>
              </div>
              <div className="ar-basis-link">{zoomed && <button type="button" className="ar-zoom-reset" onClick={() => setZoom(null)}>범위 원래대로</button>}<Link to="/five-to-nine?view=mine">5 to 9에서 근거 보기 ›</Link></div>
              <div className="result-plot ar-plot" role="list" aria-label={`학과별 최근 3년 ${model.cutLabel}`} onMouseLeave={() => setHover(null)}>
                {mine && inRange((mine.lo + mine.hi) / 2) && <div className="ar-plot__bubble-row" aria-hidden="true"><div><span className="ar-plot__bubble" style={{ left: x((mine.lo + mine.hi) / 2) }}>내 환산 범위 약 {mine.lo.toFixed(1)}~{mine.hi.toFixed(1)}</span></div></div>}
                <div className="ar-plot__body" ref={plotBody} onDoubleClick={() => setZoom(null)}>
                  <div className="ar-plot__layer" aria-hidden="true">
                    {minorTicks.map(t => <i className="ar-plot__grid ar-plot__grid--minor" key={`m${t}`} style={{ left: x(t) }} />)}{ticks.map(t => <i className="ar-plot__grid" key={t} style={{ left: x(t) }} />)}
                    {mine && <><i className="ar-plot__band" style={{ left: x(mine.lo), width: `calc(${x(mine.hi)} - ${x(mine.lo)})` }} />{inRange((mine.lo + mine.hi) / 2) && <i className="ar-plot__mine" style={{ left: x((mine.lo + mine.hi) / 2) }} />}</>}
                    {selectedPoint && inRange(gradeCut(selectedPoint, model.cut)!) && <i className={`ar-plot__guide${picked ? '' : ' is-default'}`} style={{ left: x(gradeCut(selectedPoint, model.cut)!) }} />}
                  </div>
                  {visible.map(d => {
                    const points = [...d.points].sort((a, b) => gradeCut(a, model.cut)! - gradeCut(b, model.cut)!);
                    return <div className="ar-plot__row" role="listitem" key={d.name}>
                      <button type="button" className="ar-plot__name" onClick={() => pick(d)}>{d.name || '모집단위 미기재'}</button>
                      <div className="ar-plot__track">
                        {points.slice(1).map((r, i) => <i key={i} className="ar-plot__link" style={{ left: x(gradeCut(points[i], model.cut)!), width: `calc(${x(gradeCut(r, model.cut)!)} - ${x(gradeCut(points[i], model.cut)!)})` }} />)}
                        {byYear(points).map((r, i) => inRange(gradeCut(r, model.cut)!) && <button key={i} type="button" data-k={i} className={`ar-plot__point ${yearTone(model.rows, Number(r.result_year))}${r === selectedPoint ? ` is-selected${picked ? '' : ' is-default'}` : ''}`} style={{ left: x(gradeCut(r, model.cut)!) }}
                          onMouseEnter={() => setHover(r)} onFocus={() => setHover(r)} onBlur={() => setHover(null)}
                          onClick={e => {
                            // 2026-11-26 사용자 요청: 점을 고르면 그 해 원문 상세를 바로 열어요. 점이 겹치면(모바일에서 흔해요) 엉뚱한 해가 열리지 않게 학년도를 먼저 골라요.
                            const me = e.currentTarget.getBoundingClientRect(), center = me.left + me.width / 2, sorted = byYear(points);
                            const near = [...e.currentTarget.parentElement!.querySelectorAll<HTMLElement>('.ar-plot__point')]
                              .filter(b => { const o = b.getBoundingClientRect(); return Math.abs(o.left + o.width / 2 - center) < me.width; }).map(b => sorted[Number(b.dataset.k)]);
                            if (near.length > 1) { setChoosingYear({ department: d.name, rows: near }); return; }
                            setPicked({ department: d.name, year: Number(r.result_year), row: r }); setOpened(r);
                          }}
                          aria-label={`${d.name} ${r.result_year}학년도 ${model.cutLabel} ${r[model.cut]}`} aria-pressed={r === selectedPoint}><svg aria-hidden="true" viewBox="0 0 17 17"><circle className="ring" cx="8.5" cy="8.5" r="7.5" /><circle cx="8.5" cy="8.5" r="5.5" /></svg></button>)}
                        {tip && points.includes(tip) && inRange(gradeCut(tip, model.cut)!) && <div className={`ar-plot__tip${hover ? '' : picked ? '' : ' is-default'}`} style={gradeCut(tip, model.cut)! >= (range.min + range.max) / 2 + (range.max - range.min) * 0.2 - 1e-9 ? { right: `calc(100% - ${x(gradeCut(tip, model.cut)!)} + 12px)` } : { left: `calc(${x(gradeCut(tip, model.cut)!)} + 12px)` }}>
                          <strong>{d.name} · {tip.result_year} · {model.cutLabel} {tip[model.cut]}</strong><span>{[tip.program, tip.basis || '산출 기준 미기재'].join(' · ')}</span></div>}
                      </div>
                    </div>;
                  })}
                  <div className="ar-plot__axis" aria-hidden="true"><div>{ticks.map(t => <span key={t} style={{ left: x(t) }}>{tick(t)}</span>)}</div></div>
                  {range.max - range.min < PAN_SPAN - 1e-9 && <div className="ar-plot__pan-row"><div className="ar-plot__pan" ref={pan} onScroll={onPan} tabIndex={0} role="group"
                    aria-label={`보이는 등급 범위 ${range.min.toFixed(1)}~${range.max.toFixed(1)}, 좌우로 옮겨 보기`}><i style={{ width: `${PAN_SPAN / (range.max - range.min) * 100}%` }} /></div></div>}
                </div>
              </div>
              {plotted.length > 12 && <nav className="toolbar" aria-label="학과 그래프 페이지"><button className="button-outline" disabled={!page} onClick={() => setPage(p => p - 1)}>이전 학과</button><span>{page + 1} / {Math.ceil(plotted.length / 12)}</span><button className="button-outline" disabled={(page + 1) * 12 >= plotted.length} onClick={() => setPage(p => p + 1)}>다음 학과</button></nav>}
              {others.length > 0 && <button type="button" className="ar-others" onClick={() => setView('table')}>다른 기준({basisNote})으로 공개된 학과 {others.length}개는 표에서 볼 수 있어요 ›</button>}
            </>}
            {model.years.length > 0 && <p className="ar-source">출처: 각 대학 공식 수시 입시결과 · {model.years[0]}~{model.years[2]}학년도 · {model.cutLabel} · {dateLabel}{!sample && <> · <Link className="t-link" to={`/admission-results?view=collected&scope=susi&cu=${encodeURIComponent(university)}`}>수시 원문 전체 보기</Link></>}</p>}
          </>}
        </section>
      </div>
      <aside className="ar-side" aria-label="고른 학과와 내 비교">
        <section className="ar-panel" aria-label="고른 학과">{detailPanel ?? <p className="ar-muted">점을 누르면 학과의 연도별 값이 보여요.</p>}</section>
        <section className="ar-panel ar-compare" aria-label="내 비교 요약">
          <h4>내 비교 {interests.length}개</h4>
          {interests.length ? <ul>{interests.slice(0, 3).map(i => <li key={i.id}><UniversityLogo university={i.university} /><span>{short(i.university)} {i.department || i.program}</span></li>)}</ul> : <p className="ar-muted">하트로 담은 학과가 여기 모여요</p>}
          <Link to="/admission-results?view=interests">내 비교로 보기 ›</Link>
        </section>
      </aside>
    </div>
    <Link className="ar-doelgak ar-mobile" to="/doelgak">내 성적으로 판정을 보려면 될각에서 확인해 주세요 ›</Link>
    <p className="disclaimer-note ar-note"><Icon name="info" size={16} /><span>각 대학이 공식 발표한 수시 입결을 모은 참고 자료예요 · 대학마다 컷 산출 기준이 달라 대학끼리 같은 축에서 바로 비교하기 어려워요 · 내 환산 범위는 5 to 9 추정값이에요 · 대학 공식 자료가 최종 기준이에요{sample ? ' · 샘플의 대학·숫자는 예시예요' : ' · 검수 전 자료는 성적 판정에 쓰지 않아요'} · {dateLabel}</span></p>
    {choosing && <Modal label="그래프 대학 바꾸기" onClose={() => setChoosing(false)}><div className="section-row"><h3 className="t-heading-3">대학 바꾸기</h3><button className="button-outline" onClick={() => setChoosing(false)}>닫기</button></div><label>대학 검색<input type="search" value={search} onChange={e => setSearch(e.target.value)} /></label><p role="status">{names.filter(n => matchesUniversityIdentity(n, search)).length}개 대학·캠퍼스</p><div className="university-options">{names.filter(n => matchesUniversityIdentity(n, search)).map(n => <button className="button-outline" key={n} aria-pressed={university === n} onClick={() => { update({ gu: n, gp: null, gt: null }); setChoosing(false); }}>{currentUniversityName(n)}</button>)}</div></Modal>}
    {choosingYear && <Modal label="학년도 고르기" onClose={() => setChoosingYear(null)}><div className="section-row"><h3 className="t-heading-3">{choosingYear.department || '모집단위 미기재'} · 학년도 고르기</h3><button className="button-outline" onClick={() => setChoosingYear(null)}>닫기</button></div>
      <p className="t-caption text-muted">점이 겹쳐 있어요. 원문을 볼 학년도를 골라 주세요.</p>
      <div className="ar-year-choices">{choosingYear.rows.map((r, i) => <button key={i} type="button" className="button-outline" onClick={() => { setPicked({ department: choosingYear.department, year: Number(r.result_year), row: r }); setChoosingYear(null); setOpened(r); }}>{r.result_year}학년도 · {model.cutLabel} {r[model.cut]}</button>)}</div></Modal>}
    {detail && detailPanel && <Modal label="고른 학과 상세" onClose={() => setDetail(false)}><div className="section-row"><span /><button className="button-outline" onClick={() => setDetail(false)}>닫기</button></div>{detailPanel}</Modal>}
    {opened && <Modal wide label="입결 원문 상세" onClose={() => setOpened(null)}><div className="section-row"><h3 className="t-heading-3">{opened.recruit_unit} · {opened.result_year}학년도</h3><button className="button-outline" onClick={() => setOpened(null)}>닫기</button></div>{!sample && <span className="data-status-badge">검수 전 참고자료</span>}<CollectedResultFields row={opened} /></Modal>}
  </section>;
}

const cell = (r: ResultRow | undefined, key: 'cut_70' | 'cut_50' | 'competition_rate' | 'quota' | 'fill_rate') => {
  const v = r?.[key]?.trim();
  return !v ? '—' : key === 'competition_rate' ? (v.includes(':') ? v : `${v}:1`) : key === 'fill_rate' ? (v.endsWith('%') ? v : `${v}%`) : v; // 원문에 단위가 이미 있으면 그대로
};
// 같은 학년에 출처가 여럿이면 값이 있는 것만 모아요(출처·기준 설명은 '출처별 값'에서).
const cells = (rows: ResultRow[], key: Parameters<typeof cell>[1]) =>
  [...new Set(rows.map(r => cell(r, key)).filter(v => v !== '—'))].join(' / ') || '—';

export function SelectedDetail({ university, program, department, years, cut, preferred, onSource }: { university: string; program: string; department: Department; years: number[]; cut: 'cut_70' | 'cut_50'; preferred?: ResultRow; onSource: (row: ResultRow) => void }) {
  const desc = [...years].reverse(), byYear = (y: number) => department.rows.filter(r => Number(r.result_year) === y);
  const latest = preferred ?? byYear(desc[0])[0] ?? department.rows[0];
  const multiple = years.some(y => byYear(y).length > 1);
  const basis = department.rows.some(r => gradeCut(r, cut) !== null) ? `기준 ${cut === 'cut_50' ? '50% 컷' : '70% 컷'}` : `기준 ${latest?.basis || '다른 기준'}`;
  const lines: [string, Parameters<typeof cell>[1]][] = [['70% 컷', 'cut_70'], ['50% 컷', 'cut_50'], ['경쟁률', 'competition_rate'], ['모집', 'quota'], ['충원율', 'fill_rate']];
  return <div className="ar-detail">
    <p className="ar-muted ar-caption">고른 학과</p>
    <div className="ar-detail__head"><h4 aria-label={`${currentUniversityName(university)} ${department.name}`}><span className="ar-detail__univ"><UniversityLogo university={university} />{currentUniversityName(university)}</span>{department.name}</h4>{program && <InterestButton university={university} program={program} department={department.name} compact />}</div>
    <p className="ar-muted">{[program, basis, latest?.basis && !basis.endsWith(latest.basis) ? latest.basis : ''].filter(Boolean).join(' · ')}</p>
    <table className="data-table ar-detail__table"><thead><tr><th scope="col">구분</th>{desc.map(y => <th scope="col" key={y}>{y}</th>)}</tr></thead>
      <tbody>{lines.map(([label, key]) => <tr key={key}><th scope="row">{label}</th>{desc.map((y, i) => <td key={y} className={i ? undefined : 'is-latest'}>{cells(byYear(y), key)}</td>)}</tr>)}</tbody></table>
    {multiple && <details><summary>출처별 값 {department.rows.length}건 확인</summary><p className="t-caption text-muted">같은 학년의 출처·지표별 값을 각각 확인해 주세요.</p>{department.rows.map((r, i) => <p key={i}><button type="button" className="text-button" onClick={() => onSource(r)}>{r.result_year} · {r.metric || '지표 미기재'} · {r[cut] || r.cut_other || '컷 미기재'} · 원문 {i + 1}</button>{susiIssues(r).length > 0 && <span className="data-status-badge">확인 필요</span>}</p>)}</details>}
    <div className="ar-detail__links">{latest && <button type="button" onClick={() => onSource(latest)}>원문 보기 ›</button>}<Link to="/doelgak">될각에서 내 판정 보기 ›</Link></div>
    {program && <PrepareProgram university={university} program={program} department={department.name} referenceYear={String(desc[0] ?? '')} />}
  </div>;
}

function ResultTable({ university, program, departments: all, years, cut, selected, onPick }: { university: string; program: string; departments: Department[]; years: number[]; cut: 'cut_70' | 'cut_50'; selected?: string; onPick: (d: Department) => void }) {
  const latest = years[years.length - 1];
  const [q, setQ] = useState(''), key = q.replace(/\s+/g, '');
  const departments = key ? all.filter(d => d.name.replace(/\s+/g, '').includes(key)) : all;
  return <>
    <label className="ar-search"><Icon name="search" size={20} /><input className="text-input" type="search" aria-label="학과 검색" placeholder="학과 이름으로 찾기" value={q} onChange={e => setQ(e.target.value)} /></label>
    {!departments.length ? <div className="empty-state"><h4 className="t-heading-4">‘{q.trim()}’ 학과가 없어요</h4><p>이 전형에 공개된 학과 {all.length}개 중에서 찾았어요.</p><button type="button" className="button-pill-soft" onClick={() => setQ('')}>검색 지우기</button></div>
    : <div className="table-scroll"><table className="data-table ar-table"><thead><tr><th scope="col">학과</th>{years.map(y => <th scope="col" key={y}>{y}</th>)}<th scope="col">50% 컷</th><th scope="col">경쟁률</th><th scope="col">모집</th><th scope="col">충원율</th><th scope="col">기준</th><th scope="col"><span className="sr-only">관심</span></th></tr></thead>
    <tbody>{departments.map(d => {
      const allAt = (y: number) => d.rows.filter(r => Number(r.result_year) === y), last = allAt(latest);
      const values = (key: Parameters<typeof cell>[1]) => cells(last, key);
      return <tr key={d.name} aria-selected={d.name === selected} onClick={() => onPick(d)}><th scope="row"><button type="button" onClick={() => onPick(d)}>{d.name || '모집단위 미기재'}</button></th>
        {years.map(y => { const items = allAt(y), mixed = new Set(items.map(r => `${r.metric}|${r.basis}`)).size > 1; return <td key={y}>{[...new Set(items.map(r => `${r[cut] || r.cut_other || '—'}${mixed ? ` (${r.metric || '지표 미기재'} · ${r.basis || '기준 미기재'})` : ''}`))].join(' / ') || '—'}{items.some(r => susiIssues(r).length) && <span className="data-status-badge">확인 필요</span>}</td>; })}
        <td>{values('cut_50')}</td><td>{values('competition_rate')}</td><td>{values('quota')}</td><td>{values('fill_rate')}</td>
        <td>{d.rows.some(r => gradeCut(r, cut) !== null) ? `${cut === 'cut_50' ? '50%' : '70%'} 컷 · ${last[0]?.basis || '산출 기준 미기재'}` : `${last[0]?.basis || d.rows[0]?.basis || '다른 기준'} (좌표에 없음)`}</td>
        {/* 하트는 행 고르기와 따로예요(누르면 담기만) */}
        <td className="ar-table__heart" onClick={e => e.stopPropagation()}>{program && d.name ? <InterestButton key={interestId(university, program, d.name)} university={university} program={program} department={d.name} compact /> : null}</td></tr>;
    })}</tbody></table></div>}</>;
}
