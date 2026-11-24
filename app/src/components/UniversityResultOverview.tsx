import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { loadCollectedIndex, loadCollectedRows } from '../data/collectedResults';
import type { CollectedIndex } from '../domain/collectedResults';
import type { ResultRow } from '../domain/resultReview';
import { axisRange, TYPE_TABS, type TypeTab } from '../domain/resultBrowse';
import { gradeCut, noPlotReason, universityPlot, yearTone } from '../domain/universityResultPlot';
import { collectedProgramPath } from '../domain/interests';
import { collectedUniversitySelection, matchesUniversityIdentity, currentUniversityName } from '../domain/universityIdentity';
import { fiveToNineFor } from '../domain/results';
import { useStudent } from '../store/studentDb';
import { UniversityLogo } from './UniversityLogo';
import { Icon } from './Icon';
import { SegmentedControl } from './SegmentedControl';
import { InterestButton } from './InterestButton';
import { Modal } from './Modal';
import { CollectedResultFields } from './CollectedResultFields';
import '../styles/university-result-overview.css';

export function UniversityResultOverview() {
  const [query, setQuery] = useSearchParams();
  const [index, setIndex] = useState<CollectedIndex | null>(null), [indexError, setIndexError] = useState('');
  const [loaded, setLoaded] = useState<{ university: string; rows: ResultRow[] } | null>(null), [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0), [indexAttempt, setIndexAttempt] = useState(0);
  const [choosing, setChoosing] = useState(false), [search, setSearch] = useState(''), [departmentSearch, setDepartmentSearch] = useState('');
  const [opened, setOpened] = useState<ResultRow | null>(null), [conditions, setConditions] = useState(false), [page, setPage] = useState(0);
  const requested = query.get('gu') ?? '';
  const university = collectedUniversitySelection(requested, index?.universities.map(e => e.university) ?? []) ?? index?.universities[0]?.university ?? '';
  const tab = TYPE_TABS.includes(query.get('gt') as TypeTab) ? query.get('gt') as TypeTab : '교과';
  const rows = loaded?.university === university ? loaded.rows : null;
  const model = useMemo(() => universityPlot(rows ?? [], tab, query.get('gp') ?? ''), [rows, tab, query]);
  const departments = model.departments.filter(d => d.name.includes(departmentSearch.trim()));
  const plottable = model.departments.some(d => d.points.length);
  const visible = departments.slice(page * 10, (page + 1) * 10);
  const range = axisRange(departments.flatMap(d => d.points.map(r => gradeCut(r, model.cut)!)));
  const plotRef = useRef<HTMLDivElement>(null);
  const [trackWidth, setTrackWidth] = useState(260); // smallest supported track until measured
  // Labels need ~28px each; narrow (mobile) tracks fall back to whole-grade ticks.
  const step = trackWidth / ((range.max - range.min) * 2) < 28 ? 1 : 0.5;
  const ticks = Array.from({ length: Math.floor((range.max - range.min) / step) + 1 }, (_, i) => range.min + i * step);
  useEffect(() => {
    if (typeof ResizeObserver === 'undefined') return;
    const track = () =>plotRef.current?.querySelector('.university-history-track')?.clientWidth;
    const observer = new ResizeObserver(() => setTrackWidth(Math.max(260, track() ?? 260)));
    if (plotRef.current) observer.observe(plotRef.current);
    return () => observer.disconnect();
  }, [rows]);
  const x = (value: number) => `${(value - range.min) / (range.max - range.min) * 100}%`;
  const update = (values: Record<string, string | null>) => {
    const next = new URLSearchParams(query); next.set('view', 'university');
    for (const [key, value] of Object.entries(values)) { if (value === null) next.delete(key); else next.set(key, value); }
    setPage(0); setDepartmentSearch(''); setOpened(null); setQuery(next);
  };
  useEffect(() => {
    let live = true; setIndexError('');
    loadCollectedIndex().then(value => { if (live) setIndex(value); }).catch(e => { if (live) setIndexError(e instanceof Error ? e.message : '대학 목록을 읽지 못했어요.'); });
    return () => { live = false; };
  }, [indexAttempt]);
  useEffect(() => {
    let live = true; setLoaded(null); setError(''); setPage(0); setOpened(null);
    const entry = index?.universities.find(e => e.university === university);
    if (entry) loadCollectedRows(entry).then(value => { if (live) setLoaded({ university, rows: value }); })
      .catch(e => { if (live) setError(e instanceof Error ? e.message : '대학 자료를 읽지 못했어요.'); });
    return () => { live = false; };
  }, [index, university, attempt]);

  if (indexError) return <div role="alert" className="result-panel"><p>{indexError}</p><button className="button-outline" onClick={() => setIndexAttempt(n => n + 1)}>목록 다시 불러오기</button></div>;
  if (!index) return <p role="status">대학별 입결 목록을 읽고 있어요.</p>;
  return <section className="university-overview" aria-label="대학별 최근 3년 입결">
    <header className="university-overview-heading">
      <div className="university-overview-title"><UniversityLogo university={university} /><h3 className="t-heading-2">{currentUniversityName(university)}</h3><button className="button-outline" onClick={() => { setSearch(''); setChoosing(true); }}>바꾸기</button></div>
    </header>
    <div className="university-overview-filters">
      <SegmentedControl label="대학별 전형 유형" value={tab} onChange={value => update({ gt: value, gp: null })} options={TYPE_TABS.map(value => ({ value, label: value }))} />
      <div className="university-overview-fields"><label>전형 선택<select aria-label="전형 선택" value={model.selected} disabled={!rows || !model.programs.length} onChange={e => update({ gp: e.target.value })}>{!model.programs.length && <option value="">해당 전형 없음</option>}{model.programs.map(p => <option key={p} value={p}>{p || '전형 미기재'}</option>)}</select></label>
        <label>학과 검색<span className="search-field"><Icon name="search" size={20} /><input type="search" placeholder="모집단위 이름으로 찾기" value={departmentSearch} onChange={e => { setDepartmentSearch(e.target.value); setPage(0); }} /></span></label></div>
    </div>
    <div className="university-overview-content"><section className="university-history" aria-label="학과별 입결 그래프">
      {error ? <div role="alert"><p>{error}</p><button className="button-outline" onClick={() => setAttempt(n => n + 1)}>대학 자료 다시 불러오기</button></div> : !rows ? <p role="status">{university} 자료를 읽고 있어요.</p> : <>
        <div className="university-history-heading"><h4 className="t-heading-4">{model.selected || tab}{plottable && ` · 최근 3년 ${model.cutLabel}`}</h4><span className="data-status-badge">검수 전 참고자료</span></div>
        {plottable && <>
        <p className="t-caption text-muted">● 대학 발표 {model.cutLabel}{model.cut === 'cut_50' ? '(이 전형은 70% 컷을 발표하지 않았어요)' : ''} · 점 하나는 개별 학생이 아닌 학과·연도별 통계예요. 9등급제 교과등급이며, 점을 누르면 원문과 산출 기준을 볼 수 있어요.</p>
        <div className="university-history-legend">{model.years.map(year => <span key={year}><svg aria-hidden="true" className={`history-dot ${yearTone(model.rows, year)}`} viewBox="0 0 8 8"><circle cx="4" cy="4" r="4" /></svg>{year}학년도{!model.rows.some(r => Number(r.result_year) === year) && ' · 자료 없음'}</span>)}</div>
        <p className="t-caption text-muted">진할수록 최근 연도예요{(() => { const shown = Math.max(0, ...model.rows.map(r => Number(r.result_year)).filter(Number.isFinite)); return shown && shown < model.latest ? ` · ${model.latest}학년도 자료가 없어 ${shown}학년도가 가장 진한 점이에요` : ''; })()}.</p>
        </>}
        <p className="t-caption text-muted">개별 불합격 사례는 아직 수집되지 않았어요. 불합격자가 없다는 뜻은 아니에요.</p>
        {!departments.length ? <div className="empty-state"><h4 className="t-heading-4">조건에 맞는 학과가 없어요</h4><p>다른 전형 유형이나 학과 이름으로 찾아보세요.</p></div>
        : !plottable ? <div className="empty-state"><h4 className="t-heading-4">그래프로 그릴 컷이 없어요</h4><p>{noPlotReason(model.rows)} 원문 값은 아래 표에서 그대로 볼 수 있어요.</p></div> : <>
          <div className="university-history-plot" ref={plotRef} role="list" aria-label={`학과별 최근 3년 ${model.cutLabel}`}>
            {visible.map(d => {
              // Keep years on one line, as in the design. Only points whose 16px hit targets overlap move down.
              const laneEnds: number[] = [];
              const gap = (range.max - range.min) * 16 / trackWidth;
              const points = [...d.points].sort((a, b) => gradeCut(a, model.cut)! - gradeCut(b, model.cut)!).map(row => {
                const value = gradeCut(row, model.cut)!;
                let slot = laneEnds.findIndex(end => value - end >= gap);
                if (slot < 0) slot = laneEnds.length;
                laneEnds[slot] = value;
                return { row, slot };
              });
              const height = Math.max(36, laneEnds.length * 18 + 8);
              return <div className="university-history-row" role="listitem" key={d.name}>
                <div className="university-history-department">{model.selected.trim() && d.name.trim() && <InterestButton university={university} program={model.selected} department={d.name} compact />}<Link to={collectedProgramPath(university, model.selected, d.name)}>{d.name || '모집단위 미기재'}</Link></div>
                <div className="university-history-track" style={{ height }}>{ticks.map(t => <i className="university-history-grid" key={t} style={{ left: x(t) }} />)}
                  {points.map(({ row, slot }, i) => <button key={i} className={`university-history-point ${yearTone(model.rows, Number(row.result_year))}`} style={{ left: x(gradeCut(row, model.cut)!), top: height / 2 + (slot - (laneEnds.length - 1) / 2) * 18 }} onClick={() => setOpened(row)} aria-label={`${d.name} ${row.result_year}학년도 ${model.cutLabel} ${row[model.cut]} 원문·상세`} title={`${row.result_year} · ${row[model.cut]} · ${row.basis || '산출 기준 미기재'}`}><svg aria-hidden="true" viewBox="0 0 8 8"><circle cx="4" cy="4" r="4" /></svg></button>)}
                  {!points.length && <span className="university-history-missing t-caption text-muted">그래프에 표시할 {model.cutLabel} 없음</span>}
                </div>
              </div>;
            })}
            <div className="university-history-axis" aria-hidden="true"><span>교과등급</span><div>{ticks.map(t => <span key={t} style={{ left: x(t) }}>{t.toFixed(1)}</span>)}</div></div>
          </div>
          {departments.length > 10 && <nav className="toolbar" aria-label="학과 그래프 페이지"><button className="button-outline" disabled={!page} onClick={() => setPage(p => p - 1)}>이전 학과</button><span>{page + 1} / {Math.ceil(departments.length / 10)}</span><button className="button-outline" disabled={(page + 1) * 10 >= departments.length} onClick={() => setPage(p => p + 1)}>다음 학과</button></nav>}
        </>}
        {plottable && <p className="t-caption text-muted">{model.excluded}행은 {model.cutLabel} 미공개 또는 지표·등급제 확인이 필요해 그래프에서 제외했어요. 같은 학과·연도의 원문이 여러 개면 점을 모두 표시해요. 세로 위치는 점을 구분하기 위한 것으로 성적 차이를 뜻하지 않아요.</p>}
        {model.programs.length > 0 && <Link className="t-link" to={collectedProgramPath(university, model.selected)}>이 전형의 전체 자료를 표로 보기 →</Link>}
      </>}
    </section><ComparisonPanel years={model.years} rows={model.rows} cutLabel={plottable ? model.cutLabel : '그래프용 컷 없음'} onDetails={() => setConditions(true)} /></div>
    <p className="university-overview-footnote t-caption text-muted">대학별·연도별 산출 기준이 달라요. 검수 전 자료는 성적 판정에 사용하지 않으며, 대학 공식 자료가 최종 기준이에요.</p>
    {choosing && <Modal label="그래프 대학 바꾸기" onClose={() => setChoosing(false)}><div className="section-row"><h3 className="t-heading-3">대학 바꾸기</h3><button className="button-outline" onClick={() => setChoosing(false)}>닫기</button></div><label>대학 검색<input type="search" value={search} onChange={e => setSearch(e.target.value)} /></label><p role="status">{index.universities.filter(e => matchesUniversityIdentity(e.university, search)).length}개 대학·캠퍼스</p><div className="university-options">{index.universities.filter(e => matchesUniversityIdentity(e.university, search)).map(e => <button className="button-outline" key={e.university} aria-pressed={university === e.university} onClick={() => { update({ gu: e.university, gp: null, gt: null }); setChoosing(false); }}>{currentUniversityName(e.university)}</button>)}</div></Modal>}
    {opened && <Modal wide label="그래프 입결 원문 상세" onClose={() => setOpened(null)}><div className="section-row"><h3 className="t-heading-3">{opened.recruit_unit} · {opened.result_year}학년도</h3><button className="button-outline" onClick={() => setOpened(null)}>닫기</button></div><CollectedResultFields row={opened} /></Modal>}
    {conditions && <Modal wide label="비교 조건 자세히" onClose={() => setConditions(false)}><div className="section-row"><h3 className="t-heading-3">비교 조건 확인 필요</h3><button className="button-outline" onClick={() => setConditions(false)}>닫기</button></div><p>입결은 {model.years.join('·')}학년도 대학 발표 자료이며, 내 성적의 5 to 9 환산 범위와 학년도·반영 교과·산식이 같다고 확인되지 않았어요. 점수 차이와 판정을 표시하지 않아요.</p><p>현재 전형에 기록된 원문 산출 기준이에요. 과거 연도의 학과·전형 이름이 달라진 경우 자동으로 합치지 않아요.</p><ul>{[...new Set(model.rows.map(r => `${r.result_year}학년도 · ${r.metric || '지표 미기재'} · ${r.grade_system || '미기재'}등급제 · ${r.basis || '산출 기준 미기재'}`))].map(text => <li key={text}>{text}</li>)}</ul><Link className="button-outline" to="/five-to-nine">내 성적 환산 근거 보기</Link></Modal>}
  </section>;
}

function ComparisonPanel({ years, rows, cutLabel, onDetails }: { years: number[]; rows: ResultRow[]; cutLabel: string; onDetails: () => void }) {
  const student = useStudent();
  const conversion = useMemo(() => student?.data?.grades.length ? fiveToNineFor(student.data.grades, '전 교과') : null, [student]);
  const ready = conversion?.min != null && conversion.max != null;
  return <aside className="university-comparison" aria-label="비교 기준"><h4 className="t-heading-4">비교 기준을 먼저 확인해요</h4>
    <section><div className="section-row"><strong>내 성적</strong><span className="num">{ready ? `${(Math.floor(conversion.min! * 10) / 10).toFixed(1)}~${(Math.ceil(conversion.max! * 10) / 10).toFixed(1)}` : '—'}</span></div>
      <p className="t-caption text-muted">{!student ? '성적을 읽고 있어요.' : student.error || (!student.data?.grades.length ? '아직 입력한 성적이 없어요.' : ready ? '5 to 9 · 전 교과 추정 환산등급' : '환산에 필요한 성적을 확인해 주세요.')}</p><Link className="t-link t-body-sm" to={student?.data?.grades.length ? '/five-to-nine?view=mine' : '/grade-input'}>{student?.data?.grades.length ? '내 성적 환산 보기' : '성적 입력하기'}</Link></section>
    <section><div className="section-row"><strong>입결 기준</strong><span>{cutLabel}</span></div><p className="t-caption text-muted">{years.length ? `${years[0]}~${years[2]}학년도` : '학년도 확인 중'} · 9등급제 교과등급</p><p className="t-caption text-muted">{rows.length ? '반영 교과와 산식은 원문별로 확인해 주세요.' : '선택한 조건의 수집 자료가 없어요.'}</p></section>
    <div className="university-comparison-notice"><strong>ⓘ 비교 조건 확인 필요</strong><p className="t-body-sm">학년도·등급제·반영 교과·산식 확인과 입결 검수가 필요해요. 점수 차이와 판정은 표시하지 않아요.</p></div>
    <button className="button-outline" onClick={onDetails}>비교 조건 자세히</button><p className="t-caption text-muted">공식 발표 입결만 모았어요. 원문 대조와 이용 조건 검수 전 참고자료예요.</p>
  </aside>;
}
