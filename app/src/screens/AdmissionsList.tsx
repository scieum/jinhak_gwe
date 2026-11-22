import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { loadAdmissionPlans } from '../data/admissionPlans';
import { UniversityLogo } from '../components/UniversityLogo';
import { matchesPlan, planPageUrl, type AdmissionPlan, type PlanCatalog, type PlanDocument } from '../domain/admissionPlans';
import '../styles/admission-plans.css';

function SourceLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <a className="t-link" href={href} target="_blank" rel="noreferrer">{children} ↗</a>;
}
function Document({ doc }: { doc: PlanDocument }) {
  return <article className="univ-card">
    <h4 className="t-heading-3">{doc.label}</h4>
    <p className="t-caption text-muted">{doc.provider === 'adiga' ? '대입정보포털 어디가' : '대학 입학처'} · {doc.format.toUpperCase()} · 자료 확인 {doc.checked_at}</p>
    <div className="toolbar"><SourceLink href={doc.download_url}>원문 열기 ({doc.format.toUpperCase()})</SourceLink><SourceLink href={doc.source_url}>공식 게시 페이지</SourceLink></div>
    {doc.filename && <p className="plan-filename">ZIP 안의 파일: {doc.filename}</p>}
    {doc.note && <p>{doc.note}</p>}
    {doc.year_check === 'portal' && <p className="notice">공식 포털의 2028학년도 항목에 연결된 파일이에요. 파일 본문의 학년도는 직접 확인해 주세요.</p>}
    {!!doc.topics.length && <details><summary>항목별 원문 쪽수 찾기</summary>
      <p className="t-caption text-muted">단어가 등장하는 PDF 페이지 번호예요. 책자에 인쇄된 쪽수와 다를 수 있고, 해당 전형의 적용 여부는 원문에서 확인해야 해요. 뷰어에 따라 첫 쪽으로 열릴 수 있어요.</p>
      <dl className="plan-topics">{doc.topics.map(t => <div key={t.label}><dt>{t.label}</dt><dd>{t.pages.map(p => <SourceLink key={p} href={planPageUrl(doc, p)}>{p}쪽</SourceLink>)}</dd></div>)}</dl>
    </details>}
  </article>;
}
function PlanDetail({ plan, onClose }: { plan: AdmissionPlan; onClose: () => void }) {
  const detail = useRef<HTMLElement>(null);
  useEffect(() => { detail.current?.focus({ preventScroll: true }); detail.current?.scrollIntoView?.({ block: 'start' }); }, [plan.id]);
  return <section ref={detail} tabIndex={-1} className="plan-detail" aria-label={`${plan.university} ${plan.campus} 전형계획 상세`}>
    <div className="section-row"><div className="plan-university"><UniversityLogo planId={plan.id} /><h3 className="t-heading-2">{plan.university} · {plan.campus}</h3></div><button className="button-outline" onClick={onClose}>상세 닫기</button></div>
    <p>{plan.region} · {plan.year}학년도 · 검수 전 참고자료</p>
    {!!plan.notices.length && <div><h4 className="t-heading-3">입학처 공지</h4><ul className="plan-notices">{plan.notices.map((n, i) => <li key={n.url + i}><SourceLink href={n.url}>{n.change_notice ? '[변경 공지] ' : ''}{n.title}</SourceLink></li>)}</ul></div>}
    <h4 className="t-heading-3">시행계획 원문</h4>
    <p className="t-body-sm text-muted">입학처 변경 공지와 최종 모집요강을 함께 확인해 주세요. 수집 이후 수정본이 게시될 수 있어요.</p>
    {plan.documents.map(doc => <Document key={doc.id} doc={doc} />)}
    <h4 className="t-heading-3">주요 전형 요약</h4>
    {!plan.programs.length ? <p className="notice">전형별 요약은 아직 없어요. 위 공식 원문에서 모집인원·지원자격·전형방법·수능최저를 확인해 주세요.</p>
      : <><p className="notice">원문에서 확인한 일부 전형만 정리했어요. 전체 전형과 모집단위별 예외는 원문을 확인해 주세요. 검수 전 요약은 성적 판정에 사용하지 않아요.</p>
        {plan.programs.map(p => { const doc = plan.documents.find(d => d.id === p.document_id)!;
          return <article className="univ-card" key={p.name}><h5 className="t-heading-3">{p.name}</h5><p>{p.round} · {p.type} · 모집 {p.quota}</p>
            {p.scope && <p className="t-caption text-muted">요약 범위: {p.scope}</p>}
            <dl className="plan-facts">{([['eligibility', '지원자격'], ['method', '전형방법'], ['minimum', '수능최저'], ['interview', '면접']] as const).map(([key, label]) => <div className="plan-fact-row" key={key}><dt>{label}</dt><dd>{p[key] || '면접 여부는 원문 확인 필요'}{p.field_pages?.[key] && <span className="plan-field-sources">{p.field_pages[key].map(page => <SourceLink key={page} href={planPageUrl(doc, page)}>{label} 근거 PDF {page}쪽</SourceLink>)}</span>}</dd></div>)}</dl>
            <div className="toolbar">근거: {p.pages.map(page => <SourceLink key={page} href={planPageUrl(doc, page)}>PDF {page}쪽</SourceLink>)}</div>
          </article>;
        })}</>}
  </section>;
}

const PAGE_SIZE = 24;
export function AdmissionsList() {
  const [params, setParams] = useSearchParams(), query = params.get('q') ?? '', selectedId = params.get('plan') ?? '';
  const [catalog, setCatalog] = useState<PlanCatalog | null>(null), [error, setError] = useState(''), [attempt, setAttempt] = useState(0);
  const [region, setRegion] = useState(''), [summaryOnly, setSummaryOnly] = useState(false), [page, setPage] = useState(0);
  useEffect(() => { let active = true; setError('');
    loadAdmissionPlans().then(value => { if (active) setCatalog(value); }).catch(() => { if (active) setError('전형계획 자료를 불러오지 못했어요. 다시 시도해 주세요.'); });
    return () => { active = false; };
  }, [attempt]);
  useEffect(() => { setPage(0); }, [query, region, summaryOnly]);
  function update(key: string, value: string) { const next = new URLSearchParams(params); if (value) next.set(key, value); else next.delete(key); setParams(next, { replace: key === 'q' }); }
  const filtered = catalog?.entries.filter(p => matchesPlan(p, query) && (!region || p.region === region) && (!summaryOnly || p.programs.length)) ?? [];
  const current = Math.min(page, Math.max(0, Math.ceil(filtered.length / PAGE_SIZE) - 1));
  const selected = catalog?.entries.find(p => p.id === selectedId);
  return <section className="student-screen" data-slug="admissions-list" aria-label="전형계획">
    <div className="screen-heading"><div><h2 className="t-heading-1">2028학년도 전형계획</h2><p className="t-caption text-muted">대학별 공식 시행계획과 입학처 공지를 찾아보세요.</p></div></div>
    {error ? <div role="alert"><p>{error}</p><button className="button-outline" onClick={() => setAttempt(n => n + 1)}>자료 다시 불러오기</button></div>
      : !catalog ? <p role="status">전형계획을 불러오고 있어요.</p> : <>
        <section className="filter-panel" aria-label="전형계획 조회 조건">
        <div className="section-row"><p className="t-caption text-muted">{new Set(catalog.entries.map(p => p.university)).size}개 대학 · {catalog.entries.length}개 캠퍼스 항목 · 목록 확인 {catalog.checked_at}</p><span className="data-status-badge">검수 전 참고자료</span></div>
        <div className="form-grid"><label>대학·캠퍼스·전형 검색<input type="search" value={query} placeholder="예: 강원대, 춘천, 지역인재" onChange={e => update('q', e.target.value)} /></label>
          <label>지역<select value={region} onChange={e => setRegion(e.target.value)}><option value="">전체 지역</option>{[...new Set(catalog.entries.map(p => p.region))].sort().map(r => <option key={r}>{r}</option>)}</select></label></div>
        <label className="checkbox-label"><input type="checkbox" checked={summaryOnly} onChange={e => setSummaryOnly(e.target.checked)} />일부 전형 요약이 있는 대학만</label>
        <p className="t-caption text-muted">시행계획은 최종 모집요강과 달라질 수 있어요. 지원 전 대학 입학처의 변경 공지·최종 모집요강을 확인해 주세요. 이 자료는 성적 판정에 사용하지 않아요.</p></section>
        {selected ? <PlanDetail key={selected.id} plan={selected} onClose={() => update('plan', '')} /> : selectedId && <p role="alert">선택한 전형계획을 찾지 못했어요. 아래 목록에서 다시 선택해 주세요.</p>}
        <section className="result-panel plan-results" aria-label="전형계획 조회 결과"><header className="section-row plan-results-heading"><h3 className="t-heading-2">대학 목록 <span className="plan-result-count">{filtered.length}건</span></h3><button className="button-outline" onClick={() => { update('q', ''); setRegion(''); setSummaryOnly(false); }}>검색 조건 초기화</button></header>
        {!filtered.length ? <p className="empty-state">조건에 맞는 전형계획이 없어요. 대학명으로 검색하거나 지역 조건을 바꿔 보세요.</p> : <>
          <div className="plan-grid">{filtered.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE).map(p => <article className="univ-card plan-card" key={p.id}>
            <div className="plan-university"><UniversityLogo planId={p.id} /><div className="plan-card-heading"><h4 className="t-heading-3">{p.university}</h4><p className="t-body-sm text-muted">{p.campus} · {p.region}</p></div></div>
            <div className="plan-card-footer"><p className="t-caption text-muted">{p.programs.length ? `일부 전형 요약 ${p.programs.length}건` : '공식 원문 제공'} · {[...new Set(p.documents.map(d => d.format.toUpperCase()))].join(' / ')}</p>
            <button className="text-button" aria-expanded={selectedId === p.id} aria-label={`${p.university} ${p.campus} 전형계획 보기`} onClick={() => update('plan', p.id)}>전형계획 보기 <span aria-hidden="true">→</span></button></div>
          </article>)}</div>
          <nav className="toolbar" aria-label="전형계획 페이지"><button className="button-outline" disabled={!current} onClick={() => setPage(current - 1)}>이전</button><span>{current + 1} / {Math.ceil(filtered.length / PAGE_SIZE)} 페이지</span><button className="button-outline" disabled={(current + 1) * PAGE_SIZE >= filtered.length} onClick={() => setPage(current + 1)}>다음</button></nav>
        </>}</section>
      </>}
  </section>;
}
