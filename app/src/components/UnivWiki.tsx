import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { ReleasedUnit } from '../domain/resultReview';
import { departmentsOf, signed, similarUniversities, SIMILAR_MAX, SIMILAR_MIN, SIMILAR_RANGE, WIKI_SECTIONS, type Department, type Wiki, type WikiSectionKey } from '../domain/univWiki';

export const ANCHORS = [
  { id: 'wiki-overview', label: '개요' }, { id: 'wiki-notes', label: '특이점' }, { id: 'wiki-method', label: '반영 방법' },
  { id: 'wiki-minimum', label: '수능 최저' }, { id: 'wiki-elements', label: '전형요소' }, { id: 'wiki-similar', label: '비슷한 대학' },
] as const;

/** design.md sub-nav 변형 anchor: 누르면 그 섹션으로, 스크롤하면 위에 걸린 섹션의 탭이 선택된다. */
export function AnchorNav() {
  const [active, setActive] = useState<string>(ANCHORS[0].id);
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return; // 구형 브라우저·jsdom: 누를 때만 선택이 바뀐다
    const seen = new Map<string, boolean>();
    const io = new IntersectionObserver(es => {
      es.forEach(e => seen.set(e.target.id, e.isIntersecting));
      const top = ANCHORS.find(a => seen.get(a.id));
      if (top) setActive(top.id);
    }, { rootMargin: '-120px 0px -60% 0px' });
    ANCHORS.forEach(a => { const el = document.getElementById(a.id); if (el) io.observe(el); });
    return () => io.disconnect();
  }, []);
  return <nav className="sub-nav sub-nav--anchor" aria-label="섹션 이동">
    {ANCHORS.map(a => <a key={a.id} href={`#${a.id}`} className="sub-nav__tab" aria-current={active === a.id ? 'location' : undefined}
      onClick={() => setActive(a.id)}>{a.label}</a>)}
  </nav>;
}

function Heading({ title, reviewedAt }: { title: string; reviewedAt?: string }) {
  return <div className="section-row"><h3 className="t-heading-2">{title}</h3>
    <span className="data-status-badge">{reviewedAt ? `공식 문서 요약 · 검수일 ${reviewedAt}` : '준비 중'}</span></div>;
}

/** 검수된 섹션만 본문을 보이고, 검수 전이면 제목 + "준비 중"만(spec D4). */
export function WikiSectionView({ wiki, university, section }: { wiki: Wiki | null; university: string; section: WikiSectionKey }) {
  const title = WIKI_SECTIONS.find(s => s.key === section)!.title, s = wiki?.sections.get(university)?.[section];
  if (!s) return <div className="wiki-section"><Heading title={title} /></div>;
  return <div className="wiki-section"><Heading title={title} reviewedAt={s.reviewed_at} />
    <ul className="wiki-facts">{s.items.map((i, k) => <li key={k}>
      {i.heading && <strong className="t-title">{i.heading}</strong>}
      <p className="t-body">{i.text}</p>
      <p className="t-caption text-muted">출처: {i.source_label} · <a className="t-link" href={i.source_url} target="_blank" rel="noreferrer">원문 보기 ↗</a></p>
    </li>)}</ul></div>;
}

const deptKey = (d: Pick<Department, 'unit' | 'type'>) => `${d.unit}|${d.type}`;
const detailPath = (university: string, d: Pick<Department, 'unit' | 'type'>) => `/univ-detail?u=${encodeURIComponent(university)}&d=${encodeURIComponent(deptKey(d))}`;

function Row({ university, unit, line, cut, base }: { university: string; unit: string; line: string; cut: string; base?: boolean }) {
  return <>{base && <p className="t-caption text-muted">지금 보고 있는 학과</p>}
    <strong>{university}</strong><span className="t-body-sm text-muted">{unit} · {line}</span><span className="t-title num">{cut}</span></>;
}

/** 입결이 비슷한 대학(spec D6~D11). 순위·추천·판정 색 없이 컷 차이만 보인다. */
export function SimilarSection({ units, wiki, university, selected, onSelect }:
  { units: readonly ReleasedUnit[]; wiki: Wiki | null; university: string; selected: string | null; onSelect: (key: string) => void }) {
  const depts = departmentsOf(units, university), base = depts.find(d => deptKey(d) === selected) ?? depts.find(d => d.cut !== null) ?? depts[0];
  const head = <div className="section-row"><h3 className="t-heading-2">입결이 비슷한 대학</h3>
    {depts.length > 0 && <label className="t-body-sm">학과 <select value={base ? deptKey(base) : ''} onChange={e => onSelect(e.target.value)}>
      {depts.map(d => <option key={deptKey(d)} value={deptKey(d)}>{d.unit} · {d.type}</option>)}</select></label>}</div>;
  if (!base || !wiki) return <>{head}<span className="data-status-badge">준비 중</span></>;
  const r = similarUniversities(units, wiki.fields, university, base);
  if (r.status === 'pending') return <>{head}<span className="data-status-badge">준비 중</span><p className="t-caption text-muted">{r.reason}</p></>;
  const steps: ReactNode[] = [
    `기준: ${university} ${base.unit} ${base.type} 70% 컷 ${r.base.cut.toFixed(1)} (${r.base.year}학년도 · 9등급)`,
    `범위: ${(r.base.cut - SIMILAR_RANGE).toFixed(1)} ~ ${(r.base.cut + SIMILAR_RANGE).toFixed(1)} (차이 ±${SIMILAR_RANGE})`,
    `조건: 같은 전형 유형(${base.type}) · 같은 계열 또는 관련 계열 · 다른 대학`,
    '관리자가 검수해 공개한 입결과 계열표만 써요',
    ...r.outside.map(o => `범위 밖이라 뺐어요: ${o.university} ${o.unit} ${o.cut.toFixed(1)} (${signed(o.diff)})`),
    r.status === 'ok' ? `차이가 작은 순으로 최대 ${SIMILAR_MAX}개 → ${r.rows.length}개` : `범위 안 ${r.rows.length}개 — ${SIMILAR_MIN}개보다 적어서 목록을 만들지 않아요`,
  ];
  return <>{head}
    <p className="t-body">{university} {base.unit} {base.type} 70% 컷 {r.base.cut.toFixed(1)}과 차이 ±{SIMILAR_RANGE} 이내인 같은 계열 · 관련 계열 학과예요</p>
    <p className="t-caption text-muted">관리자가 검수한 입결만 비교해요 · {r.base.year}학년도 · 9등급 기준 · 같은 대학 학과는 빼요</p>
    <p className="t-caption text-muted">등급은 숫자가 작을수록 상위예요</p>
    <ul className="program-list similar-list">
      <li className="interest-row similar-row--base"><div className="interest-row__info"><Row base university={university} unit={base.unit} line={base.type} cut={`70% 컷 ${r.base.cut.toFixed(1)} · 차이 —`} /></div></li>
      {r.status === 'ok' && r.rows.map(x => <li className="interest-row" key={`${x.university}|${x.unit}`}>
        <Link className="interest-row__info" to={detailPath(x.university, { unit: x.unit, type: base.type })}>
          <Row university={x.university} unit={x.unit} line={`${base.type} · ${x.relation}`} cut={`70% 컷 ${x.cut.toFixed(1)} · 차이 ${signed(x.diff)}`} /><span aria-hidden="true">›</span></Link></li>)}
    </ul>
    {r.status === 'short' && <div className="empty-state"><h3 className="t-heading-3">비교할 입결이 아직 부족해요</h3><p>다른 학과를 골라 보세요.</p></div>}
    <details className="trace-accordion"><summary>어떻게 골랐나요?</summary><ol>{steps.map((s, k) => <li key={k} className="t-body-sm">{s}</li>)}</ol></details>
    <p className="disclaimer-note">공개 입결 숫자가 가깝다는 뜻이에요 · 대학 공식 자료가 최종 기준이에요</p>
  </>;
}
