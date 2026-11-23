import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { SegmentedControl } from '../components/SegmentedControl';
import { InterestButton } from '../components/InterestButton';
import { PrepareProgram } from '../components/PrepareProgram';
import { interestId, programPath } from '../domain/interests';
import { useReleasedResults } from '../data/releasedResults';
import { programLines, programSummaries, yearsOf } from '../domain/resultBrowse';
import { RESULT_NOTICE } from './AdmissionResults';
import { useUnivWiki } from '../data/univWiki';
import { AnchorNav, SimilarSection, WikiSectionView } from '../components/UnivWiki';
import '../styles/result-browser.css';

function PlanLink({ name }: { name: string }) {
  return <p className="notice"><Link className="t-link" to={`/admissions-list?q=${encodeURIComponent(name)}`}>2028학년도 전형계획 확인하기</Link> · 시행계획·모집요강 자료는 변경될 수 있으므로 최종 모집요강을 확인해 주세요.</p>;
}
const TABS = ['전체', '교과', '종합', '논술', '기타', '정시'] as const;

function Missing({ what }: { what: string }) {
  return <div className="empty-state"><h3 className="t-heading-3">{what}을 찾지 못했어요</h3><p>공개된 입결 자료에 있는 대학·전형만 볼 수 있어요.</p>
    <Link className="button-outline" to="/admission-results">수시 입결에서 찾기</Link></div>;
}

export function UnivDetail() {
  const units = useReleasedResults(), wiki = useUnivWiki(), [query, setQuery] = useSearchParams(), name = query.get('u') ?? '';
  const [tab, setTab] = useState<(typeof TABS)[number]>('전체');
  const pickDept = (d: string) => setQuery(q => { q.set('d', d); return q; }, { replace: true });
  if (!units) return <section className="student-screen" data-slug="univ-detail"><p role="status">공개 입결 자료를 읽고 있어요.</p></section>;
  const mine = units.filter(u => u.university === name);
  if (!mine.length) return <section className="student-screen" data-slug="univ-detail"><Missing what="대학" /></section>;
  const all = programSummaries(units, name), shown = all.filter(p => tab === '전체' || p.type === tab);
  return <section className="student-screen" data-slug="univ-detail" aria-label="대학 상세">
    <AnchorNav />
    <div id="wiki-overview" className="wiki-anchor" />
    <div className="screen-heading"><div><h2 className="t-heading-1">{name}</h2>
      <p className="t-caption text-muted">공개 입결 원문 {mine.length}건 · {[...new Set(mine.map(u => u.year))].sort().join('·')}학년도</p></div>
      <Link className="button-outline" to={`/admission-results?u=${encodeURIComponent(name)}`}>수시 입결 보기</Link></div>
    <PlanLink name={name} />
    <h3 className="t-heading-2">입결이 공개된 전형 <span className="t-caption text-muted">{all.length}개</span></h3>
    <SegmentedControl label="전형 유형" value={tab} onChange={setTab} options={TABS.map(t => ({ value: t, label: t }))} />
    {!shown.length ? <div className="empty-state"><h3 className="t-heading-3">이 유형의 공개 입결은 없어요</h3><p>다른 유형을 골라 보세요.</p></div>
      : <ul className="program-list">{shown.map(p => <li className="interest-row" key={programPath(name, p.program)}><Link className="interest-row__info" to={programPath(name, p.program)}>
        <strong>{p.program}</strong>
        <span className="t-body-sm text-muted">{p.type} · {p.year}학년도 입결 · 모집단위 {p.units}개{p.quota !== null && ` · 모집 ${p.quota}명`}</span><span aria-hidden="true">›</span></Link><Link className="button-outline" aria-label={`${name} ${p.program} 관심 학과 선택`} to={programPath(name, p.program)}>관심 학과 선택</Link></li>)}</ul>}
    <Link className="button-outline" to="/admission-results?view=interests">관심 전형 모아보기</Link>
    <section id="wiki-notes" className="wiki-anchor">
      <WikiSectionView wiki={wiki} university={name} section="notes" />
      <WikiSectionView wiki={wiki} university={name} section="changes" />
      <WikiSectionView wiki={wiki} university={name} section="programs" />
    </section>
    <section id="wiki-method" className="wiki-anchor"><WikiSectionView wiki={wiki} university={name} section="method" /></section>
    <section id="wiki-minimum" className="wiki-anchor"><WikiSectionView wiki={wiki} university={name} section="minimum" /></section>
    <section id="wiki-elements" className="wiki-anchor"><WikiSectionView wiki={wiki} university={name} section="elements" /></section>
    <section id="wiki-similar" className="wiki-anchor"><SimilarSection units={units} wiki={wiki} university={name} selected={query.get('d')} onSelect={pickDept} /></section>
    <p className="disclaimer-note">{RESULT_NOTICE}</p>
  </section>;
}

export function ProgramDetail() {
  const units = useReleasedResults(), [query] = useSearchParams(), name = query.get('u') ?? '', program = query.get('p') ?? '';
  if (!units) return <section className="student-screen" data-slug="program-detail"><p role="status">공개 입결 자료를 읽고 있어요.</p></section>;
  const lines = programLines(units, name, program);
  if (!lines.length) return <section className="student-screen" data-slug="program-detail"><Missing what="전형" /></section>;
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
