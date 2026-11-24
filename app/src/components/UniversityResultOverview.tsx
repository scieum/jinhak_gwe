// 수시 입결 · 대학별 (Figma admission-results 346:267881 · 346:266645, spec 02-spec.md 2장·4장).
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { loadCollectedIndex, loadCollectedRows } from '../data/collectedResults';
import type { CollectedIndex } from '../domain/collectedResults';
import type { ResultRow } from '../domain/resultReview';
import { axisRange, TYPE_TABS, type TypeTab } from '../domain/resultBrowse';
import { gradeCut, noPlotReason, universityPlot, yearTone } from '../domain/universityResultPlot';
import { collectedUniversitySelection, matchesUniversityIdentity, currentUniversityName } from '../domain/universityIdentity';
import { fiveToNineFor } from '../domain/results';
import { useStudent, studentDb } from '../store/studentDb';
import { useSampleMode } from '../data/sample/mode';
import { sampleOverviewRows } from '../data/sample/public';
import { dataAsOf } from '../data/catalog';
import { UniversityLogo } from './UniversityLogo';
import { Icon } from './Icon';
import { SegmentedControl } from './SegmentedControl';
import { InterestButton } from './InterestButton';
import { PrepareProgram } from './PrepareProgram';
import { Modal } from './Modal';
import { CollectedResultFields } from './CollectedResultFields';
import '../styles/university-result-overview.css';

const short = (university: string) => currentUniversityName(university).replace(/대학교$/, '대');
const tick = (t: number) => String(Math.round(t * 10) / 10);
const narrow = () => typeof window !== 'undefined' && !!window.matchMedia?.('(max-width: 1023px)').matches;
type Department = ReturnType<typeof universityPlot>['departments'][number];

export function UniversityResultOverview({ tabs }: { tabs: ReactNode }) {
  const [query, setQuery] = useSearchParams(), sample = useSampleMode();
  const [index, setIndex] = useState<CollectedIndex | null>(null), [indexError, setIndexError] = useState('');
  const [loaded, setLoaded] = useState<{ university: string; rows: ResultRow[] } | null>(null), [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0), [indexAttempt, setIndexAttempt] = useState(0);
  const [choosing, setChoosing] = useState(false), [search, setSearch] = useState('');
  const [view, setView] = useState<'plot' | 'table'>('plot'), [year, setYear] = useState('');
  const [picked, setPicked] = useState<{ department: string; year: number } | null>(null), [hover, setHover] = useState<ResultRow | null>(null);
  const [opened, setOpened] = useState<ResultRow | null>(null), [detail, setDetail] = useState(false), [page, setPage] = useState(0);
  const names = sample ? [...new Set(sampleOverviewRows.map(r => r.university))] : index?.universities.map(e => e.university) ?? [];
  const university = collectedUniversitySelection(query.get('gu') ?? '', names) ?? names[0] ?? '';
  const tab = TYPE_TABS.includes(query.get('gt') as TypeTab) ? query.get('gt') as TypeTab : '교과';
  const rows = loaded?.university === university ? loaded.rows : null;
  const model = useMemo(() => universityPlot(rows ?? [], tab, query.get('gp') ?? ''), [rows, tab, query]);
  const shownYears = year ? [Number(year)] : model.years;
  const departments = model.departments.map(d => ({ ...d, points: d.points.filter(r => shownYears.includes(Number(r.result_year))) }));
  const plotted = departments.filter(d => d.points.length), others = departments.filter(d => !d.rows.some(r => gradeCut(r, model.cut) !== null));
  const visible = plotted.slice(page * 12, (page + 1) * 12);
  const student = useStudent();
  const conversion = useMemo(() => student?.data?.grades.length ? fiveToNineFor(student.data.grades, '전 교과') : null, [student]);
  const mine = conversion?.min != null && conversion.max != null ? { lo: Math.floor(conversion.min * 10) / 10, hi: Math.ceil(conversion.max * 10) / 10 } : null;
  const range = axisRange([...plotted.flatMap(d => d.points.map(r => gradeCut(r, model.cut)!)), ...(mine ? [mine.lo, mine.hi] : [])]);
  const ticks = Array.from({ length: Math.round((range.max - range.min) / 0.5) + 1 }, (_, i) => range.min + i * 0.5);
  const x = (value: number) => `${(value - range.min) / (range.max - range.min) * 100}%`;
  const interests = useLiveQuery(() => studentDb.interests.toArray().then(list => list.sort((a, b) => a.created_at.localeCompare(b.created_at))).catch(() => []), []) ?? [];
  // 고른 학과: 누른 점 → 이 전형에서 하트로 담은 학과 → 목록 가운데 학과(시작점일 뿐 추천이 아니에요).
  const saved = plotted.find(d => interests.some(i => i.university === university && i.program === model.selected && i.department === d.name));
  const fallback = saved ?? plotted[Math.floor(plotted.length / 2)];
  const selected: Department | undefined = (picked && departments.find(d => d.name === picked.department)) || fallback;
  const latestOf = (d?: Department) => d && [...d.points].sort((a, b) => Number(b.result_year) - Number(a.result_year))[0];
  const selectedPoint = picked && selected?.name === picked.department ? selected.points.find(r => Number(r.result_year) === picked.year) ?? latestOf(selected) : latestOf(selected);
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
  const pick = (d: Department, row?: ResultRow) => { setPicked({ department: d.name, year: Number((row ?? latestOf(d) ?? d.rows[0])?.result_year) }); if (narrow()) setDetail(true); };
  const basisNote = [...new Set(others.map(d => d.rows[0]?.basis || '다른 기준'))].join(' · ');
  const detailPanel = selected && <SelectedDetail university={university} program={model.selected} department={selected} years={model.years} cut={model.cut} onSource={setOpened} />;
  const lead = `${currentUniversityName(university)} ${model.selected || tab} 최근 3년 ${model.cutLabel}이에요.`;

  return <section className="ar" aria-label="대학별 최근 3년 입결">
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
            {model.programs.length > 1 && <label className="ar-program"><span className="sr-only">전형 선택</span><select aria-label="전형 선택" value={model.selected} onChange={e => update({ gp: e.target.value })}>{model.programs.map(p => <option key={p} value={p}>{p || '전형 미기재'}</option>)}</select></label>}
            {!departments.length ? <div className="empty-state"><h4 className="t-heading-4">조건에 맞는 학과가 없어요</h4><p>다른 전형 유형을 골라 보세요.</p></div> : view === 'table' ? <ResultTable departments={departments} years={model.years} cut={model.cut} selected={selected?.name} onPick={d => pick(d)} /> : !plotted.length ? <div className="empty-state"><h4 className="t-heading-4">그래프로 그릴 {model.cutLabel}이 없어요</h4><p>{noPlotReason(model.rows)} 발표한 값은 표에서 그대로 볼 수 있어요.</p><button className="button-primary" onClick={() => setView('table')}>표로 보기</button></div> : <>
              <div className="ar-head">
                <p className="ar-lead">{lead}<span className="ar-desktop"> 점에 올리면 값이, 누르면 오른쪽에 자세한 값이 보여요.</span><span className="ar-mobile"> 점 하나가 한 해의 컷이에요.</span></p>
                <div className="ar-legend">{[...model.years].reverse().map(y => <span key={y}><svg aria-hidden="true" viewBox="0 0 11 11" className={`result-plot ar-dot ${yearTone(model.rows, y)}`}><circle cx="5.5" cy="5.5" r="5" /></svg>{y}학년도</span>)}{mine && <span><i className="ar-swatch" />내 환산 범위</span>}</div>
              </div>
              <Link className="ar-basis-link" to="/five-to-nine?view=mine">5 to 9에서 근거 보기 ›</Link>
              <div className="result-plot ar-plot" role="list" aria-label={`학과별 최근 3년 ${model.cutLabel}`} onMouseLeave={() => setHover(null)}>
                {mine && <div className="ar-plot__bubble-row" aria-hidden="true"><div><span className="ar-plot__bubble" style={{ left: x((mine.lo + mine.hi) / 2) }}>내 환산 범위 약 {mine.lo.toFixed(1)}~{mine.hi.toFixed(1)}</span></div></div>}
                <div className="ar-plot__body">
                  <div className="ar-plot__layer" aria-hidden="true">
                    {ticks.map(t => <i className="ar-plot__grid" key={t} style={{ left: x(t) }} />)}
                    {mine && <><i className="ar-plot__band" style={{ left: x(mine.lo), width: `calc(${x(mine.hi)} - ${x(mine.lo)})` }} /><i className="ar-plot__mine" style={{ left: x((mine.lo + mine.hi) / 2) }} /></>}
                    {selectedPoint && <i className={`ar-plot__guide${picked ? '' : ' is-default'}`} style={{ left: x(gradeCut(selectedPoint, model.cut)!) }} />}
                  </div>
                  {visible.map(d => {
                    const points = [...d.points].sort((a, b) => gradeCut(a, model.cut)! - gradeCut(b, model.cut)!);
                    return <div className="ar-plot__row" role="listitem" key={d.name}>
                      <button type="button" className="ar-plot__name" onClick={() => pick(d)}>{d.name || '모집단위 미기재'}</button>
                      <div className="ar-plot__track">
                        {points.slice(1).map((r, i) => <i key={i} className="ar-plot__link" style={{ left: x(gradeCut(points[i], model.cut)!), width: `calc(${x(gradeCut(r, model.cut)!)} - ${x(gradeCut(points[i], model.cut)!)})` }} />)}
                        {[...points].sort((a, b) => Number(a.result_year) - Number(b.result_year)).map((r, i) => <button key={i} type="button" className={`ar-plot__point ${yearTone(model.rows, Number(r.result_year))}${r === selectedPoint ? ` is-selected${picked ? '' : ' is-default'}` : ''}`} style={{ left: x(gradeCut(r, model.cut)!) }}
                          onMouseEnter={() => setHover(r)} onFocus={() => setHover(r)} onBlur={() => setHover(null)} onClick={() => pick(d, r)}
                          aria-label={`${d.name} ${r.result_year}학년도 ${model.cutLabel} ${r[model.cut]}`} aria-pressed={r === selectedPoint}><svg aria-hidden="true" viewBox="0 0 17 17"><circle className="ring" cx="8.5" cy="8.5" r="7.5" /><circle cx="8.5" cy="8.5" r="5.5" /></svg></button>)}
                        {tip && points.includes(tip) && <div className={`ar-plot__tip${hover ? '' : picked ? '' : ' is-default'}`} style={gradeCut(tip, model.cut)! > (range.min + range.max) / 2 + (range.max - range.min) * 0.2 ? { right: `calc(100% - ${x(gradeCut(tip, model.cut)!)} + 12px)` } : { left: `calc(${x(gradeCut(tip, model.cut)!)} + 12px)` }}>
                          <strong>{d.name} · {tip.result_year} · {model.cutLabel} {tip[model.cut]}</strong><span>{[tip.program, tip.basis || '산출 기준 미기재'].join(' · ')}</span></div>}
                      </div>
                    </div>;
                  })}
                  <div className="ar-plot__axis" aria-hidden="true"><div>{ticks.map(t => <span key={t} style={{ left: x(t) }}>{tick(t)}</span>)}</div></div>
                </div>
              </div>
              {plotted.length > 12 && <nav className="toolbar" aria-label="학과 그래프 페이지"><button className="button-outline" disabled={!page} onClick={() => setPage(p => p - 1)}>이전 학과</button><span>{page + 1} / {Math.ceil(plotted.length / 12)}</span><button className="button-outline" disabled={(page + 1) * 12 >= plotted.length} onClick={() => setPage(p => p + 1)}>다음 학과</button></nav>}
              {others.length > 0 && <button type="button" className="ar-others" onClick={() => setView('table')}>다른 기준({basisNote})으로 공개된 학과 {others.length}개는 표에서 볼 수 있어요 ›</button>}
            </>}
            {model.years.length > 0 && <p className="ar-source">출처: 각 대학 공식 수시 입시결과 · {model.years[0]}~{model.years[2]}학년도 · {model.cutLabel} · 데이터 기준일 {dataAsOf}</p>}
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
    <p className="disclaimer-note ar-note"><Icon name="info" size={16} /><span>각 대학이 공식 발표한 수시 입결을 모은 참고 자료예요 · 대학마다 컷 산출 기준이 달라 대학끼리 같은 축에서 바로 비교하기 어려워요 · 내 환산 범위는 5 to 9 추정값이에요 · 대학 공식 자료가 최종 기준이에요{sample ? ' · 샘플의 대학·숫자는 예시예요' : ' · 검수 전 자료는 성적 판정에 쓰지 않아요'} · 데이터 기준일 {dataAsOf}</span></p>
    {choosing && <Modal label="그래프 대학 바꾸기" onClose={() => setChoosing(false)}><div className="section-row"><h3 className="t-heading-3">대학 바꾸기</h3><button className="button-outline" onClick={() => setChoosing(false)}>닫기</button></div><label>대학 검색<input type="search" value={search} onChange={e => setSearch(e.target.value)} /></label><p role="status">{names.filter(n => matchesUniversityIdentity(n, search)).length}개 대학·캠퍼스</p><div className="university-options">{names.filter(n => matchesUniversityIdentity(n, search)).map(n => <button className="button-outline" key={n} aria-pressed={university === n} onClick={() => { update({ gu: n, gp: null, gt: null }); setChoosing(false); }}>{currentUniversityName(n)}</button>)}</div></Modal>}
    {detail && detailPanel && <Modal label="고른 학과 상세" onClose={() => setDetail(false)}><div className="section-row"><span /><button className="button-outline" onClick={() => setDetail(false)}>닫기</button></div>{detailPanel}</Modal>}
    {opened && <Modal wide label="입결 원문 상세" onClose={() => setOpened(null)}><div className="section-row"><h3 className="t-heading-3">{opened.recruit_unit} · {opened.result_year}학년도</h3><button className="button-outline" onClick={() => setOpened(null)}>닫기</button></div>{!sample && <span className="data-status-badge">검수 전 참고자료</span>}<CollectedResultFields row={opened} /></Modal>}
  </section>;
}

const cell = (r: ResultRow | undefined, key: 'cut_70' | 'cut_50' | 'competition_rate' | 'quota' | 'fill_rate') => {
  const v = r?.[key]?.trim();
  return !v ? '—' : key === 'competition_rate' ? `${v}:1` : key === 'fill_rate' ? `${v}%` : v;
};

function SelectedDetail({ university, program, department, years, cut, onSource }: { university: string; program: string; department: Department; years: number[]; cut: 'cut_70' | 'cut_50'; onSource: (row: ResultRow) => void }) {
  const desc = [...years].reverse(), byYear = (y: number) => department.rows.find(r => Number(r.result_year) === y);
  const latest = byYear(desc[0]) ?? department.rows[0];
  const basis = department.rows.some(r => gradeCut(r, cut) !== null) ? `기준 ${cut === 'cut_50' ? '50% 컷' : '70% 컷'}` : `기준 ${latest?.basis || '다른 기준'}`;
  const lines: [string, Parameters<typeof cell>[1]][] = [['70% 컷', 'cut_70'], ['50% 컷', 'cut_50'], ['경쟁률', 'competition_rate'], ['모집', 'quota'], ['충원율', 'fill_rate']];
  return <div className="ar-detail">
    <p className="ar-muted ar-caption">고른 학과</p>
    <div className="ar-detail__head"><UniversityLogo university={university} /><h4>{currentUniversityName(university)} {department.name}</h4>{program && <InterestButton university={university} program={program} department={department.name} compact />}</div>
    <p className="ar-muted">{[program, basis, latest?.basis && !basis.endsWith(latest.basis) ? latest.basis : ''].filter(Boolean).join(' · ')}</p>
    <table className="data-table ar-detail__table"><thead><tr><th scope="col">구분</th>{desc.map(y => <th scope="col" key={y}>{y}</th>)}</tr></thead>
      <tbody>{lines.map(([label, key]) => <tr key={key}><th scope="row">{label}</th>{desc.map((y, i) => <td key={y} className={i ? undefined : 'is-latest'}>{cell(byYear(y), key)}</td>)}</tr>)}</tbody></table>
    <div className="ar-detail__links">{latest && <button type="button" onClick={() => onSource(latest)}>원문 보기 ›</button>}<Link to="/doelgak">될각에서 내 판정 보기 ›</Link></div>
    {program && <PrepareProgram university={university} program={program} department={department.name} referenceYear={String(desc[0] ?? '')} />}
  </div>;
}

function ResultTable({ departments, years, cut, selected, onPick }: { departments: Department[]; years: number[]; cut: 'cut_70' | 'cut_50'; selected?: string; onPick: (d: Department) => void }) {
  const latest = years[years.length - 1];
  return <div className="table-scroll"><table className="data-table ar-table"><thead><tr><th scope="col">학과</th>{years.map(y => <th scope="col" key={y}>{y}</th>)}<th scope="col">50% 컷</th><th scope="col">경쟁률</th><th scope="col">모집</th><th scope="col">충원율</th><th scope="col">기준</th></tr></thead>
    <tbody>{departments.map(d => {
      const at = (y: number) => d.rows.find(r => Number(r.result_year) === y), last = at(latest);
      return <tr key={d.name} aria-selected={d.name === selected} onClick={() => onPick(d)}><th scope="row"><button type="button" onClick={() => onPick(d)}>{d.name || '모집단위 미기재'}</button></th>
        {years.map(y => { const r = at(y); return <td key={y}>{r ? r[cut] || r.cut_other || '—' : '—'}</td>; })}
        <td>{cell(last, 'cut_50')}</td><td>{cell(last, 'competition_rate')}</td><td>{cell(last, 'quota')}</td><td>{cell(last, 'fill_rate')}</td>
        <td>{d.rows.some(r => gradeCut(r, cut) !== null) ? `${cut === 'cut_50' ? '50%' : '70%'} 컷 · ${last?.basis || '산출 기준 미기재'}` : `${last?.basis || d.rows[0]?.basis || '다른 기준'} (좌표에 없음)`}</td></tr>;
    })}</tbody></table></div>;
}
