import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useSearchParams } from 'react-router-dom';
import { useTrackCollection } from '../data/trackCollection';
import { filterTrackCollection, readTrackFilters, type CollectedTrackUnit } from '../domain/trackCollection';
import { TRACKS, trackOf } from '../domain/specialTracks';
import { planPageUrl } from '../domain/admissionPlans';
import { Modal } from '../components/Modal';
import { InterestButton } from '../components/InterestButton';
import { UniversityLogo } from '../components/UniversityLogo';
import { useCompactResults } from '../components/ResultFilters';
import { ScreenActions } from '../components/ScreenActions';
import { TrackDepartmentFilter } from '../components/TrackDepartmentFilter';
import { departmentOptions } from '../domain/trackDepartments';

const typeKey = (s: string) => s.replace(/학생부|\s/g, '');
const programsFor = (r: CollectedTrackUnit, type: string) => r.programs.filter(p => !type || typeKey(p.program.type) === type);
const resultsFor = (r: CollectedTrackUnit, type: string) => r.results.filter(p => !type || typeKey(p.admission_type) === type);
const location = (r: CollectedTrackUnit) => [r.campus, r.region].filter(Boolean).join(' · ') || '캠퍼스·지역 미확인';
const quotaText = ({ quota }: CollectedTrackUnit['programs'][number]) => quota.kind === 'pooled'
  ? `공동선발 ${quota.quota}명 (${quota.units}개 모집단위)` : typeof quota.quota === 'number' ? `${quota.quota}명` : quota.quota;
const resultLink = (r: CollectedTrackUnit, type = '', program = '') => `/admission-results?${new URLSearchParams({ view: 'university', gu: r.university, gt: type, gp: program, gd: r.unit })}`;

/** Collected references are browsable before review, but never promoted to reviewed results. */
export function ReferenceTrackCollection() {
  const { data, retry } = useTrackCollection(), compact = useCompactResults();
  const [params, setParams] = useSearchParams(), filters = readTrackFilters(params);
  const [head, setHead] = useState<Element | null>(null);
  const chips = useRef<(HTMLButtonElement | null)[]>([]);
  const [open, setOpen] = useState<CollectedTrackUnit | null>(null);
  useEffect(() => { setHead(compact ? null : document.querySelector('.topbar__heading')); }, [compact]);
  const rows = useMemo(() => filterTrackCollection(data?.rows ?? [], filters), [data, params]);
  const regions = [...new Set((data?.rows ?? []).map(r => r.region).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ko'));
  const info = trackOf(filters.track);
  const departments = useMemo(() => departmentOptions((data?.rows ?? [])
    .filter(r => r.memberships.some(m => m.track === filters.track && (!filters.sub || m.sub === filters.sub)))
    .map(r => r.unit), filters.track), [data, filters.track, filters.sub]);
  const update = (values: Record<string, string>) => {
    const next = new URLSearchParams(params);
    if ('track' in values || 'sub' in values) next.delete('department');
    Object.entries(values).forEach(([k, v]) => v ? next.set(k, v) : next.delete(k));
    setParams(next, { replace: Object.keys(values).length === 1 && 'q' in values });
  };
  const count = (track: string) => new Set((data?.rows ?? []).filter(r => r.memberships.some(m => m.track === track)).map(r => r.university)).size;
  const badge = <span className="data-status-badge st-asof">수집 자료 · 검수 전{data?.checkedAt ? ` · 기준일 ${data.checkedAt}` : ''}</span>;
  return <section data-slug="special-tracks" aria-label="특수 계열 모아보기" className="student-screen special-tracks st-reference">
    {head && createPortal(<><h1 className="st-title">특수 계열 모아보기</h1><p className="st-lead">메디컬 · 교육 · 과기원처럼 따로 찾는 계열의 전형계획과 공개 입결을 모아봐요</p></>, head)}
    {compact || !head ? <h2 className="st-mtitle">특수 계열 모아보기</h2> : <ScreenActions>{badge}</ScreenActions>}
    {compact && badge}
    <section className="st-controls" aria-label="계열 고르기">
      <div className="st-row"><span className="t-label" id="rc-track-label">계열</span><div className="st-chips" role="radiogroup" aria-labelledby="rc-track-label">
        {TRACKS.map((t, i) => <button key={t.id} ref={el => { chips.current[i] = el; }} className="filter-chip" type="button" role="radio" aria-checked={filters.track === t.id}
          tabIndex={filters.track === t.id ? 0 : -1} aria-label={`${t.id}, ${data ? `대학·캠퍼스 ${count(t.id)}곳` : '불러오는 중'}`}
          onClick={() => update({ track: t.id, sub: '' })} onKeyDown={e => {
            const offset = ['ArrowRight', 'ArrowDown'].includes(e.key) ? 1 : ['ArrowLeft', 'ArrowUp'].includes(e.key) ? -1 : 0;
            const index = e.key === 'Home' ? 0 : e.key === 'End' ? TRACKS.length - 1 : offset ? (i + offset + TRACKS.length) % TRACKS.length : -1;
            if (index < 0) return;
            e.preventDefault(); update({ track: TRACKS[index].id, sub: '' }); chips.current[index]?.focus(); chips.current[index]?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
          }}>{t.id} <span className="num">{data ? count(t.id) : '…'}</span></button>)}
      </div></div>
      {info.subs.length > 0 && <div className="st-row"><span className="t-label">세부</span><div className="st-chips" role="group" aria-label="세부">
        {['', ...info.subs].map(s => <button key={s} type="button" className="filter-chip" aria-pressed={filters.sub === s} onClick={() => update({ sub: s })}>{s || '전체'}</button>)}
      </div></div>}
      <TrackDepartmentFilter options={departments} value={filters.department} onChange={department => update({ department })} />
      <div className="st-row st-reference-filters">
        <label>전형 유형<select className="text-input" value={filters.type} onChange={e => update({ type: e.target.value })}><option value="">전체</option><option>교과</option><option>종합</option></select></label>
        <label>지역<select className="text-input" value={filters.region} onChange={e => update({ region: e.target.value })}><option value="">전국</option>
          {filters.region && !regions.includes(filters.region) && <option>{filters.region}</option>}{regions.map(r => <option key={r}>{r}</option>)}</select></label>
        <label className="st-reference-search">대학·학과 검색<input type="search" className="text-input" placeholder="대학명 또는 학과명" value={filters.query} onChange={e => update({ q: e.target.value })} /></label>
        <button type="button" className="button-outline" onClick={() => update({ sub: '', type: '', region: '', q: '' })}>조건 초기화</button>
      </div>
    </section>
    {!data ? <p role="status">계열별 전형계획과 입결을 불러오고 있어요.</p> : <>
      {!!data.errors.length && <div role="alert" className="st-pending"><p>{data.errors.join(' · ')} 자료를 불러오지 못했어요. 불러온 자료만 표시해요.</p><button type="button" className="button-outline" onClick={retry}>다시 불러오기</button></div>}
      <div className="st-head"><div className="st-head__text"><div className="st-head__name"><h3>{filters.track}</h3><p className="text-muted">{info.desc}</p></div>
        <p className="st-head__total" role="status">대학·캠퍼스 {new Set(rows.map(r => r.university)).size}곳 · 모집단위 목록 {rows.length}개</p>
        <p className="st-head__note text-muted">{data.year ? `${data.year}학년도 전형계획 · ` : ''}입결은 학년도·전형별로 따로 표시해요 · 가나다순</p></div></div>
      <p className="st-head__note text-muted">수집 자료 · 검수 전이에요. 학과 이름과 계열표로 묶었으며, 모집 여부·소속·실기 유무는 대학 원문에서 확인해 주세요.</p>
      {!rows.length ? <div className="empty-state"><h3>조건에 맞는 자료가 없어요</h3><p>수집된 모집단위만 표시해요. 자료가 없다고 해당 학과나 전형이 없는 것은 아니에요.</p><button type="button" className="button-outline" onClick={() => update({ sub: '', type: '', region: '', q: '' })}>세부 조건 지우기</button></div>
        : <CollectionList key={params.toString()} rows={rows} type={filters.type} compact={compact} onOpen={setOpen} />}
      <details className="trace-accordion"><summary>어떻게 묶었나요?</summary><ul>
        <li>수집된 수시 전형계획과 입결의 모집단위를 학과 이름·계열표로 분류했어요. 전체 대학·학과 목록은 아니에요.</li>
        <li>대학·학과 이름이 일치하는 자료를 묶었어요. 캠퍼스를 특정할 수 없는 입결은 별도 목록으로 남겨요.</li>
        <li>공동선발은 여러 모집단위가 함께 뽑는 총원이에요. 학과별 정원으로 나누거나 합산하지 않아요.</li>
        <li>입결은 수집된 수시 70% 컷·9등급 자료예요. 전형과 학년도를 합쳐 평균을 내지 않아요.</li>
        <li>반도체 학과라는 이유만으로 계약학과로 분류하지 않아요. 예체능 묶음에 있어도 실기 전형이라고 단정하지 않아요.</li>
      </ul></details>
    </>}
    <p className="disclaimer-note st-note">대학이나 학과의 순위 · 추천이 아니에요. 대학 공식 모집요강이 최종 기준이에요.</p>
    {open && <CollectionDetail row={open} type={filters.type} onClose={() => setOpen(null)} />}
  </section>;
}

function CollectionList({ rows, type, compact, onOpen }: { rows: CollectedTrackUnit[]; type: string; compact: boolean; onOpen: (r: CollectedTrackUnit) => void }) {
  const [limit, setLimit] = useState(40), shown = rows.slice(0, limit);
  const summary = (r: CollectedTrackUnit) => `${r.plan?.year ?? ''} 전형계획 ${programsFor(r, type).length}건 · 입결 ${resultsFor(r, type).length}건`;
  return <>
    {compact ? <ul className="st-cards">{shown.map(r => <li key={r.key}><article className="univ-card st-card"><header><UniversityLogo university={r.university} /><span className="st-card__name">{r.university}</span></header>
      <button type="button" className="st-card__open" aria-label={`${r.university} ${r.unit} ${location(r)} 상세 보기`} onClick={() => onOpen(r)}><span className="st-card__unit">{r.unit}</span><span className="st-card__plan">{location(r)}</span><span className="st-card__plan">{summary(r)}</span></button>
    </article></li>)}</ul> : <div className="st-table-card"><table className="data-table st-reference-table"><caption className="sr-only">계열별 모집단위 목록</caption><thead><tr><th scope="col">대학</th><th scope="col">모집단위</th><th scope="col">캠퍼스·지역</th><th scope="col">수집 자료</th><th scope="col">상세</th></tr></thead>
      <tbody>{shown.map(r => <tr key={r.key}><td><span className="st-univ"><UniversityLogo university={r.university} />{r.university}</span></td><td>{r.unit}</td><td>{location(r)}</td><td>{summary(r)}</td><td><button type="button" className="button-outline" aria-label={`${r.university} ${r.unit} ${location(r)} 상세 보기`} onClick={() => onOpen(r)}>보기</button></td></tr>)}</tbody></table></div>}
    {limit < rows.length && <button type="button" className="button-outline" onClick={() => setLimit(n => n + 40)}>모집단위 더 보기 ({Math.min(limit, rows.length)} / {rows.length})</button>}
  </>;
}

function CollectionDetail({ row: r, type, onClose }: { row: CollectedTrackUnit; type: string; onClose: () => void }) {
  const programs = programsFor(r, type), results = [...resultsFor(r, type)].sort((a, b) => b.result_year.localeCompare(a.result_year) || a.program.localeCompare(b.program, 'ko'));
  return <Modal label={`${r.university} ${r.unit}`} onClose={onClose} wide><div className="st-detail">
    <div className="toolbar"><h3>{r.university} · {r.unit}</h3><button type="button" className="button-outline" onClick={onClose}>닫기</button></div>
    <p>{location(r)} · 수집 자료 · 검수 전</p>
    {r.ambiguousCampus && <p>입결의 캠퍼스를 확인할 수 없어 전형계획과 연결하지 않았어요.</p>}
    <section aria-label="전형계획"><h4>{r.plan?.year ? `${r.plan.year}학년도 ` : ''}전형계획</h4>
      {!programs.length && <p>이 조건의 모집단위별 전형계획은 아직 수집되지 않았어요.</p>}
      {programs.map((p, i) => { const doc = r.plan?.documents.find(d => d.id === p.program.document_id); return <article className="st-pending" key={`${p.program.name}-${i}`}>
        <div className="toolbar"><strong>{p.program.name} · {p.program.type}</strong><InterestButton compact university={r.university} program={p.program.name} department={r.unit} /></div>
        <p>모집인원: {quotaText(p)}</p><p>전형방법: {p.program.method}</p><p>수능최저: {p.program.minimum}</p><p>지원자격: {p.program.eligibility}</p>
        {doc && <a className="t-link" href={planPageUrl(doc, p.quota.pages[0] ?? p.program.pages[0])} target="_blank" rel="noreferrer">{doc.label} · 원문 {p.quota.pages.join(', ') || p.program.pages.join(', ')}쪽 ↗</a>}
      </article>; })}
    </section>
    <section aria-label="과거 입결"><h4>과거 입결 · 70% 컷 · 9등급</h4><p className="t-caption text-muted">학년도·전형이 서로 달라요. 현재 전형계획과 동일한 전형이라는 뜻은 아니에요.</p>
      {!results.length ? <p>이 조건의 70% 컷 자료는 아직 수집되지 않았어요.</p> : <div className="table-scroll"><table className="data-table"><caption className="sr-only">학년도·전형별 입결</caption><thead><tr><th scope="col">학년도</th><th scope="col">전형</th><th scope="col">유형</th><th scope="col">70% 컷</th><th scope="col">자료 보기</th></tr></thead>
        <tbody>{results.map((p, i) => <tr key={i}><td>{p.result_year}</td><td>{p.program}</td><td>{p.admission_type}</td><td className="num">{p.cut_70}</td><td><Link className="t-link" to={resultLink(r, typeKey(p.admission_type), p.program)}>입결 보기</Link></td></tr>)}</tbody></table></div>}
    </section>
    <div className="st-links"><Link to={`/univ-detail?u=${encodeURIComponent(r.university)}`}>대학 상세 보기 ›</Link><Link to={`/admissions-list?q=${encodeURIComponent(r.university)}`}>대학 전형계획 모아보기 ›</Link><Link to={resultLink(r, type)}>모집단위 입결 보기 ›</Link></div>
  </div></Modal>;
}
