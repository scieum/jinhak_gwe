import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { loadAdmissionPlans } from '../data/admissionPlans';
import { samplePlanCatalog } from '../data/sample/admissionPlans';
import { isSampleMode, useSampleMode } from '../data/sample/mode';
import { UniversityLogo } from '../components/UniversityLogo';
import { PromoBanner } from '../components/PromoBanner';
import { Icon } from '../components/Icon';
import { Modal } from '../components/Modal';
import { SegmentedControl } from '../components/SegmentedControl';
import { ScreenActions } from '../components/ScreenActions';
import { matchesPlan, planPageUrl, type AdmissionPlan, type PlanCatalog, type PlanDocument, type PlanProgram } from '../domain/admissionPlans';
import { interestId } from '../domain/interests';
import { studentDb } from '../store/studentDb';
import '../styles/interests.css';
import '../styles/admission-plans.css';

// 전년 모집인원(quota_prev)은 자료에 있을 때만 ▲/▼ + 차이값(사용자 결정 2026-11-24). 없거나 숫자로 못 읽으면 null → 숫자만.
// shortcut: quota_prev는 PlanProgram 타입 밖 선택 필드로 읽어요, 자료 수집에 전년 값이 들어오면 타입에 올려요
const count = (v?: string) => { const m = v?.replace(/,/g, '').match(/^\s*(\d+)\s*명?\s*$/); return m ? Number(m[1]) : null; };
export function quotaDelta(quota: string, prev?: string) {
  const now = count(quota), before = count(prev);
  return now === null || before === null ? null : now - before;
}
function Quota({ program, prefix = '모집 ' }: { program: PlanProgram & { quota_prev?: string }; prefix?: string }) {
  const delta = quotaDelta(program.quota, program.quota_prev);
  if (delta === null) return <>{count(program.quota) === null ? program.quota : <>{prefix}<span className="num">{program.quota}</span></>}</>;
  return <>{prefix}<strong className="num">{program.quota}</strong>{delta !== 0 && <span className={`num ${delta > 0 ? 'delta-up' : 'delta-down'}`}> {delta > 0 ? '▲' : '▼'}{Math.abs(delta)}<span className="sr-only"> 전년보다 {Math.abs(delta)}명 {delta > 0 ? '늘었어요' : '줄었어요'}</span></span>}</>;
}

function SourceLink({ href, children }: { href: string; children: ReactNode }) {
  return <a className="t-link" href={href} target="_blank" rel="noreferrer">{children} ↗</a>;
}
function Document({ doc }: { doc: PlanDocument }) {
  return <article className="plan-document">
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
// 전형 상세(program-detail)는 공개 입결 화면이라 시행계획 원문이 없어요. 원문·근거 쪽수는 이 펼침에서 계속 보여 줘요.
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
          return <article className="plan-document" key={p.name}><h5 className="t-heading-3">{p.name}</h5><p>{p.round} · {p.type} · <Quota program={p} /></p>
            {p.scope && <p className="t-caption text-muted">요약 범위: {p.scope}</p>}
            <dl className="plan-facts">{([['eligibility', '지원자격'], ['method', '전형방법'], ['minimum', '수능최저'], ['interview', '면접']] as const).map(([key, label]) => <div className="plan-fact-row" key={key}><dt>{label}</dt><dd>{p[key] || '면접 여부는 원문 확인 필요'}{p.field_pages?.[key] && <span className="plan-field-sources">{p.field_pages[key].map(page => <SourceLink key={page} href={planPageUrl(doc, page)}>{label} 근거 PDF {page}쪽</SourceLink>)}</span>}</dd></div>)}</dl>
            <div className="toolbar">근거: {p.pages.map(page => <SourceLink key={page} href={planPageUrl(doc, page)}>PDF {page}쪽</SourceLink>)}</div>
          </article>;
        })}</>}
  </section>;
}

// ── 목록 행: 전형 1행(work/admissions-list/02-spec.md 0장). 요약이 없는 캠퍼스는 원문 행 하나로 남겨 목록에서 빠지지 않게 해요.
const REGIONS: [string, string[]][] = [['강원', ['강원']], ['수도권', ['서울', '경기', '인천']], ['충청권', ['충북', '충남', '대전', '세종']],
  ['영남권', ['부산', '대구', '울산', '경북', '경남']], ['호남권', ['광주', '전북', '전남', '전남광주']], ['제주', ['제주']]];
const TYPES = ['교과', '종합', '논술', '실기', '정시'];
const FILTERS = {
  region: ['강원', '수도권', '충청권', '영남권', '호남권', '제주'],
  founding: ['국립', '공립', '사립', '그 밖'],
  campus: ['본캠퍼스', '분캠퍼스'],
  field: ['인문', '사회', '자연', '공학', '의약', '예체능'],
  cond: ['수능최저 있음', '수능최저 없음', '면접 있음', '재학생만'],
};
type FilterKey = keyof typeof FILTERS;
type Filters = Record<FilterKey, string[]>;
const NO_FILTERS: Filters = { region: [], founding: [], campus: [], field: [], cond: [] };
const SORTS = ['가나다순', '모집인원 많은 순', '지역순', '최근 변경순'] as const;
type Sort = typeof SORTS[number];
interface Row {
  key: string; plan: AdmissionPlan; program?: PlanProgram; group: string; type?: string; unit: string; quota: number | null; date: string;
  minimum?: '있음' | '없음' | '해당 없음'; interview?: '있음' | '없음';
}
const groupOf = (region: string) => REGIONS.find(([, list]) => list.includes(region))?.[0] ?? '그 밖';
function toRows(catalog: PlanCatalog): Row[] {
  return catalog.entries.flatMap((plan): Row[] => {
    const group = groupOf(plan.region), latest = plan.documents.map(d => d.checked_at).sort().pop() ?? catalog.checked_at;
    if (!plan.programs.length) return [{ key: plan.id, plan, group, unit: '—', quota: null, date: latest }];
    return plan.programs.map(program => ({
      key: `${plan.id}|${program.name}`, plan, program, group, type: program.round === '정시' ? '정시' : program.type,
      unit: (program as PlanProgram & { unit?: string }).unit ?? (/전형 전체|전체 모집/.test(program.scope ?? '') ? '전 모집단위' : '원문 확인'), quota: count(program.quota),
      date: plan.documents.find(d => d.id === program.document_id)?.checked_at ?? latest,
      // 사실 글자만(판정 아님): 원문 요약이 "미적용"으로 시작하면 없음, 정시는 해당 없음, 근거 없이 "원문 확인 필요"면 비워 둠, 그 밖에 기준이 적혀 있으면 있음
      minimum: program.round === '정시' ? '해당 없음' : /^(수능최저\s*)?미적용/.test(program.minimum) ? '없음' : program.minimum === '원문 확인 필요' ? undefined : '있음',
      interview: /^있음/.test(program.interview ?? '') ? '있음' : /^(면접\s*)?없음/.test(program.interview ?? '') ? '없음' : undefined,
    } satisfies Row));
  });
}
// shortcut: 설립(국립·공립·사립)·계열·재학생 자격은 행 자료가 없어 고르면 0건이에요, 시행계획 자료에 값이 들어오면 여기서 비교해요
const facet = (row: Row, key: FilterKey, value: string) => key === 'region' ? row.group === value
  : key === 'campus' ? (row.plan.campus === '본교' ? '본캠퍼스' : '분캠퍼스') === value
  : key === 'cond' ? (value === '수능최저 있음' ? row.minimum === '있음' : value === '수능최저 없음' ? row.minimum === '없음' : value === '면접 있음' ? row.interview === '있음' : false)
  : false;
const passes = (row: Row, f: Filters) => (Object.keys(f) as FilterKey[]).every(k => !f[k].length || (k === 'cond' ? f[k].every(v => facet(row, k, v)) : f[k].some(v => facet(row, k, v))));
const filterCount = (f: Filters) => Object.values(f).reduce((n, v) => n + v.length, 0);
const ko = (a: string, b: string) => a.localeCompare(b, 'ko');
const byName = (a: Row, b: Row) => ko(a.plan.university, b.plan.university) || ko(a.plan.campus, b.plan.campus) || (a.program ? 0 : 1) - (b.program ? 0 : 1); // 같은 캠퍼스 안은 자료 순서(수시 → 정시, 시안 순서)
const ORDER = REGIONS.map(([name]) => name);
const sorters: Record<Sort, (a: Row, b: Row) => number> = {
  가나다순: byName,
  '모집인원 많은 순': (a, b) => (b.quota ?? -1) - (a.quota ?? -1) || byName(a, b),
  지역순: (a, b) => (ORDER.indexOf(a.group) + 1 || 99) - (ORDER.indexOf(b.group) + 1 || 99) || byName(a, b),
  '최근 변경순': (a, b) => ko(b.date, a.date) || byName(a, b),
};
const facts = (row: Row) => row.program ? `${row.minimum === '해당 없음' ? '정시' : `수능최저 ${row.minimum ?? '원문 확인'}`} · 면접 ${row.interview ?? '원문 확인'}` : '공식 원문 제공';
const shortDate = (d: string) => d.slice(5).replace('-', '.');

const PAGE_SIZE = 10;
export function AdmissionsList() {
  const [params, setParams] = useSearchParams(), query = params.get('q') ?? '', selectedId = params.get('plan') ?? '';
  const [catalog, setCatalog] = useState<PlanCatalog | null>(null), [error, setError] = useState(false), [attempt, setAttempt] = useState(0);
  const [type, setType] = useState(''), [draftType, setDraftType] = useState(''), [filters, setFilters] = useState<Filters>(NO_FILTERS), [draft, setDraft] = useState<Filters>(NO_FILTERS);
  const [sort, setSort] = useState<Sort>('가나다순'), [view, setView] = useState<'list' | 'table'>('table'), [interestOnly, setInterestOnly] = useState(false);
  const [page, setPage] = useState(0), [sheet, setSheet] = useState<'' | 'filter' | 'sort'>(''), [dropdown, setDropdown] = useState(false);
  const [confirm, setConfirm] = useState<Row | null>(null), [toast, setToast] = useState<{ text: string; sub?: string } | null>(null), [saveError, setSaveError] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null), sample = useSampleMode();
  useEffect(() => { let active = true; setError(false);
    // 샘플 모드: 공개 자료 대신 시안 데모 전형 12행(02-spec.md 1장). 샘플을 지우면 실제 시행계획 자료.
    (isSampleMode() ? Promise.resolve(samplePlanCatalog) : loadAdmissionPlans()).then(value => { if (active) setCatalog(value); }).catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [attempt, sample]);
  useEffect(() => { setPage(0); }, [query, type, filters, sort, interestOnly]);
  useEffect(() => { if (!toast) return; const t = window.setTimeout(() => setToast(null), 3000); return () => window.clearTimeout(t); }, [toast]);
  const interests = useLiveQuery(async () => { try { return new Set((await studentDb.interests.toArray()).map(i => interestId(i.university, i.program))); } catch { return null; } }, []);
  const rows = useMemo(() => catalog ? toRows(catalog) : [], [catalog]);
  function update(key: string, value: string) { const next = new URLSearchParams(params); if (value) next.set(key, value); else next.delete(key); setParams(next, { replace: key === 'q' }); }
  const idOf = (r: Row) => r.program ? interestId(r.plan.university, r.program.name) : '';
  const saved = (r: Row) => !!r.program && !!interests?.has(idOf(r));
  const base = (f: Filters) => rows.filter(r => matchesPlan(r.plan, query) && passes(r, f) && (!interestOnly || saved(r)));
  const beforeType = base(filters), filtered = beforeType.filter(r => !type || r.type === type).sort(sorters[sort]);
  const typeCount = (t: string) => beforeType.filter(r => r.program && (!t || r.type === t)).length;
  const programCount = filtered.filter(r => r.program).length, campusOnly = filtered.length - programCount;
  const interestCount = rows.filter(saved).length, interestLabel = (prefix: string) => interests === null ? prefix : `${prefix} ${interestCount}`;
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)), current = Math.min(page, pages - 1), shown = filtered.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE);
  const selected = catalog?.entries.find(p => p.id === selectedId);
  const anyFilter = !!type || filterCount(filters) > 0;
  const chosen = [...filters.region, ...filters.founding, ...filters.campus, ...(type ? [type] : []), ...filters.field, ...filters.cond];
  const reset = () => { setType(''); setFilters(NO_FILTERS); setDraft(NO_FILTERS); };

  async function toggle(row: Row, sure = false) {
    if (!row.program || interests === undefined) return;
    if (interests === null) { setSaveError(true); return; }
    const on = saved(row);
    if (on && interestOnly && !sure) { setConfirm(row); return; }
    // 전형 한 줄 = 학과 없는 전형 단위: 다른 화면에서 학과까지 담은 관심도 같은 전형이면 채워 보이고, 빼면 그 전형 관심을 모두 빼요(2026-11-25).
    try {
      if (on) { const u = row.plan.university, p = row.program.name; await studentDb.interests.bulkDelete((await studentDb.interests.toArray()).filter(i => i.university === u && i.program === p).map(i => i.id)); }
      else await studentDb.setInterest(row.plan.university, row.program.name, true);
      setSaveError(false);
      setToast(on ? { text: '관심 전형에서 뺐어요' } : { text: '관심 전형에 담았어요', sub: '이 기기에만 저장돼요' });
    } catch { setSaveError(true); }
  }
  const heart = (row: Row) => row.program && <button type="button" className="interest-heart al-heart" aria-pressed={saved(row)}
    aria-label={`${row.plan.university} ${row.program.name} ${saved(row) ? '관심에서 빼기' : '관심에 담기'}`}
    onClick={e => { e.stopPropagation(); void toggle(row); }}><Icon name="heart" size={20} /></button>;
  const open = (row: Row) => update('plan', row.plan.id);
  const univLink = (row: Row, logo = true) => <Link className="al-univ" to={`/univ-detail?u=${encodeURIComponent(row.plan.university)}`} onClick={e => e.stopPropagation()}>
    {logo && <UniversityLogo planId={row.plan.id} university={(row.plan as AdmissionPlan & { logo_name?: string }).logo_name ?? row.plan.university} />}<span>{row.plan.university}{row.plan.campus !== '본교' && ` ${row.plan.campus}`}</span></Link>;
  const programText = (row: Row) => row.program?.name ?? '전형 요약 준비 중 · 원문 보기';
  const rowKeys = (row: Row) => (e: KeyboardEvent<HTMLElement>) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === 'Enter') open(row);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); ((e.key === 'ArrowDown' ? e.currentTarget.nextElementSibling : e.currentTarget.previousElementSibling) as HTMLElement | null)?.focus(); }
  };
  const goPage = (n: number) => { setPage(n); resultRef.current?.scrollIntoView?.({ block: 'start' }); resultRef.current?.focus({ preventScroll: true }); };
  const pager = <nav className="al-pager" aria-label="전형계획 페이지"><button type="button" className="button-outline" disabled={!current} onClick={() => goPage(current - 1)}>이전</button><span className="t-caption num">{current + 1} / {pages}</span><button type="button" className="button-outline" disabled={current + 1 >= pages} onClick={() => goPage(current + 1)}>다음</button></nav>;
  const chip = (label: string, on: boolean, click: () => void, aria?: string) => <button key={label} type="button" className="filter-chip" aria-pressed={on} aria-label={aria} onClick={click}>{label}</button>;
  const flip = (f: Filters, k: FilterKey, v: string): Filters => ({ ...f, [k]: f[k].includes(v) ? f[k].filter(x => x !== v) : [...f[k], v] });
  const typeChips = ['', ...TYPES].map(t => chip(`${t || '전체'} ${typeCount(t)}`, type === t, () => setType(t)));

  const empty = filtered.length ? null
    : interestOnly && !interestCount ? { icon: 'heart', title: '아직 담은 전형이 없어요', body: '목록에서 하트를 눌러 담아 보세요. 담은 전형은 이 기기에만 저장돼요.', action: <button type="button" className="button-primary" onClick={() => setInterestOnly(false)}>관심만 보기 끄기</button> }
    : query && !anyFilter && !interestOnly ? { icon: 'search', title: `'${query}'에 맞는 대학이 없어요`, body: '대학 이름을 다시 확인해 주세요. 줄임말(강원대)로도 찾을 수 있어요.', action: <button type="button" className="button-primary" onClick={() => update('q', '')}>검색어 지우기</button> }
    : { icon: 'search', title: '조건에 맞는 전형이 없어요', body: `${[...(query ? [`'${query}'`] : []), ...chosen, ...(interestOnly ? ['관심만'] : [])].join(' · ')}으로 찾았어요. 조건을 하나씩 풀어 보세요.`, action: <button type="button" className="button-primary" onClick={() => { reset(); setInterestOnly(false); }}>필터 초기화</button> };
  const errorLine = (text: string) => <p className="al-error-line" role="alert"><Icon name="triangle-alert" size={20} /><span>{text}</span></p>;

  return <section className="student-screen admissions-list" data-slug="admissions-list" aria-label="전형계획">
    <div className="screen-heading"><h2 className="t-heading-1">전형계획</h2>{catalog && <ScreenActions><span className="data-status-badge al-asof">시행계획 기준 · {catalog.checked_at}</span></ScreenActions>}</div>
    <PromoBanner />
    {error ? <div className="al-panel al-load-error" role="alert"><Icon name="triangle-alert" size={20} /><p>전형계획 자료를 불러오지 못했어요. 인터넷 연결을 확인하고 다시 불러와 주세요.</p><button type="button" className="button-outline" onClick={() => setAttempt(n => n + 1)}>다시 불러오기</button></div>
      : !catalog ? <p className="al-panel t-body-sm text-muted" role="status">전형계획을 읽고 있어요.</p> : <>
        <label className="al-search"><Icon name="search" size={20} /><input className="text-input" type="search" value={query} placeholder="대학 이름으로 찾기" aria-label="대학 이름으로 찾기" onChange={e => update('q', e.target.value)} /></label>
        <div className="al-chiprow">
          <button type="button" className="button-pill-soft al-filter-button" aria-pressed={filterCount(filters) > 0} onClick={() => { setDraft(filters); setDraftType(type); setSheet('filter'); }}><Icon name="sliders-horizontal" size={20} />필터{filterCount(filters) ? ` ${filterCount(filters)}` : ''}</button>
          {typeChips}{chip(interestLabel('관심'), interestOnly, () => setInterestOnly(v => !v), '관심만 보기')}
        </div>
        <section className="al-filters" aria-label="전형계획 조회 조건">
          {anyFilter && <button type="button" className="al-reset" onClick={reset}>초기화</button>}
          <span className="al-filters__label">지역</span><div className="al-chips">{chip('전체', !filters.region.length, () => setFilters({ ...filters, region: [] }))}{FILTERS.region.map(v => chip(v, filters.region.includes(v), () => setFilters(flip(filters, 'region', v))))}</div>
          <span className="al-filters__label">설립·캠퍼스</span><div className="al-chips">{FILTERS.founding.map(v => chip(v, filters.founding.includes(v), () => setFilters(flip(filters, 'founding', v))))}<span className="al-chips__divider" aria-hidden="true" />{FILTERS.campus.map(v => chip(v, filters.campus.includes(v), () => setFilters(flip(filters, 'campus', v))))}</div>
          <span className="al-filters__label">전형 유형</span><div className="al-chips">{typeChips}</div>
          <span className="al-filters__label">계열</span><div className="al-chips">{FILTERS.field.map(v => chip(v, filters.field.includes(v), () => setFilters(flip(filters, 'field', v))))}</div>
          <span className="al-filters__label">조건</span><div className="al-chips">{FILTERS.cond.map(v => chip(v, filters.cond.includes(v), () => setFilters(flip(filters, 'cond', v))))}</div>
        </section>
        <div className="al-result" ref={resultRef} tabIndex={-1}>
          <div className="al-result__count"><strong className="t-title num">전형 {programCount}개</strong>{campusOnly > 0 && <span className="t-caption text-muted num">요약 전 캠퍼스 {campusOnly}곳</span>}
            <span className="data-status-badge al-result__badge">시행계획 기준</span>
            <span className="al-result__interest">{chip(interestLabel('관심만 보기'), interestOnly, () => setInterestOnly(v => !v))}</span></div>
          {!!filtered.length && <div className="al-result__tools">
            <button type="button" className="al-sort-link" onClick={() => setSheet('sort')}>{sort}<Icon name="arrow-up-down" size={16} /></button>
            <div className="al-sort">
              <button type="button" className="button-pill-soft" aria-expanded={dropdown} onClick={() => setDropdown(v => !v)} onKeyDown={e => { if (e.key === 'Escape') setDropdown(false); }}><Icon name="chevron-down" size={20} />{sort}</button>
              {dropdown && <><div className="al-dropdown__backdrop" onClick={() => setDropdown(false)} /><ul className="al-dropdown" role="listbox" aria-label="정렬">{SORTS.map(s => <li key={s}><button type="button" role="option" aria-selected={s === sort} onClick={() => { setSort(s); setDropdown(false); }}>{s}{s === sort && <Icon name="check" size={20} />}</button></li>)}</ul></>}
            </div>
            <SegmentedControl label="보기" value={view} onChange={setView} options={[{ value: 'list', label: '목록' }, { value: 'table', label: '표' }]} />
          </div>}
        </div>
        <p className="disclaimer-note al-note"><Icon name="info" size={16} /><span>대학 공식 자료가 최종 기준이에요 · 데이터 기준일 {catalog.checked_at} · {sample ? <><br className="al-mobile" />샘플의 대학·숫자는 예시예요</> : '검수 전 요약은 성적 판정에 쓰지 않아요'}</span></p>
        {selectedId && !selected && errorLine('고른 전형을 목록에서 찾지 못했어요. 시행계획이 바뀌었을 수 있어요. 아래 목록에서 다시 골라 주세요.')}
        {(saveError || interests === null) && errorLine('관심 전형을 저장하지 못했어요. 브라우저 설정에서 사이트 저장을 허용한 뒤 다시 눌러 주세요.')}
        {selected && <PlanDetail key={selected.id} plan={selected} onClose={() => update('plan', '')} />}
        {empty ? <div className="al-panel empty-state al-empty"><Icon name={empty.icon} size={48} /><h3 className="t-heading-4">{empty.title}</h3><p className="t-body-sm">{empty.body}</p>{empty.action}</div> : <>
          <div className={`al-list${view === 'table' ? ' al-list--table-view' : ''}`}>{shown.map(row => <div className="al-item" key={row.key} role="link" tabIndex={0} aria-label={`${row.plan.university} ${programText(row)} 전형계획 보기`} onClick={() => open(row)} onKeyDown={rowKeys(row)}>
            <article className="univ-card al-card">
              <div className="al-card__head">{univLink(row)}{heart(row)}</div>
              <p className="al-card__program">{row.plan.region} · {programText(row)}{row.program && ` · ${row.unit}`}{sort === '최근 변경순' && <span className="t-caption text-muted num"> · {shortDate(row.date)} 확인</span>}</p>
            </article>
            <div className="al-card__facts"><span>{facts(row)}</span>{row.program && (quotaDelta(row.program.quota, (row.program as PlanProgram & { quota_prev?: string }).quota_prev) === null ? <span className="al-quota-label"><Quota program={row.program} /></span>
              : <span className="al-quota-wrap"><span className="al-quota-label">모집</span><span className="data-table al-quota"><Quota program={row.program} prefix="" /></span></span>)}</div>
          </div>)}</div>
          <div className={`al-panel al-table-card${view === 'list' ? ' al-table-card--hidden' : ''}`}><table className="data-table al-table">
            <thead><tr>{([['대학', '가나다순'], ['지역', '지역순']] as const).map(([label, s]) => <th key={label} scope="col" aria-sort={sort === s ? 'ascending' : 'none'}><button type="button" className="al-th-sort" onClick={() => setSort(s)}>{label}<Icon name="arrow-up-down" size={16} className={sort === s ? 'al-th-sort--on' : ''} /></button></th>)}
              <th scope="col">전형명</th><th scope="col">유형</th><th scope="col">모집단위</th>
              <th scope="col" className="num" aria-sort={sort === '모집인원 많은 순' ? 'descending' : 'none'}><button type="button" className="al-th-sort" onClick={() => setSort('모집인원 많은 순')}>모집인원<Icon name="arrow-up-down" size={16} className={sort === '모집인원 많은 순' ? 'al-th-sort--on' : ''} /></button></th>
              <th scope="col">수능최저</th><th scope="col">면접</th><th scope="col">관심</th></tr></thead>
            <tbody>{shown.map(row => <tr key={row.key} tabIndex={0} aria-label={`${row.plan.university} ${programText(row)} 전형계획 보기`} onClick={() => open(row)} onKeyDown={rowKeys(row)}>
              <td>{univLink(row)}</td><td>{row.plan.region}</td>
              <td>{programText(row)}{sort === '최근 변경순' && <span className="t-caption text-muted num al-date">{shortDate(row.date)} 확인</span>}</td>
              <td>{row.type ?? '—'}</td><td>{row.unit}</td><td className="num">{row.program ? <Quota program={row.program} prefix="" /> : '—'}</td>
              <td>{row.program ? row.minimum ?? '원문 확인' : '—'}</td><td>{row.program ? row.interview ?? '원문 확인' : '—'}</td><td>{heart(row)}</td></tr>)}</tbody>
          </table></div>
          {pager}
        </>}
      </>}
    {sheet === 'filter' && <Modal label="필터" onClose={() => setSheet('')}>
      <div className="al-sheet"><div className="al-sheet__head"><h3 className="t-heading-4">필터</h3><button type="button" className="al-sheet__close" aria-label="닫기" onClick={() => setSheet('')}><Icon name="x" size={24} /></button></div>
        {([['region', '지역'], ['founding', '설립·캠퍼스'], ['type', '전형 유형'], ['field', '계열'], ['cond', '조건']] as const).map(([k, title]) => <section key={k} className="al-sheet__section"><h4 className="t-heading-4">{title}</h4><div className="al-chips">
          {k === 'type' ? TYPES.map(t => chip(t, draftType === t, () => setDraftType(draftType === t ? '' : t)))
            : (k === 'founding' ? [...FILTERS.founding.map(v => ['founding', v] as const), ...FILTERS.campus.map(v => ['campus', v] as const)] : FILTERS[k].map(v => [k, v] as const)).map(([key, v]) => chip(v, draft[key].includes(v), () => setDraft(flip(draft, key, v))))}</div></section>)}
        <div className="al-sheet__actions"><button type="button" className="button-outline" onClick={() => { setDraft(NO_FILTERS); setDraftType(''); }}>초기화</button><button type="button" className="button-primary" onClick={() => { setFilters(draft); setType(draftType); setSheet(''); }}>전형 {base(draft).filter(r => r.program && (!draftType || r.type === draftType)).length}개 보기</button></div></div>
    </Modal>}
    {sheet === 'sort' && <Modal label="정렬" onClose={() => setSheet('')}>
      <div className="al-sheet"><div className="al-sheet__head"><h3 className="t-heading-4">정렬</h3><button type="button" className="al-sheet__close" aria-label="닫기" onClick={() => setSheet('')}><Icon name="x" size={24} /></button></div>
        <ul className="al-sort-list" role="listbox" aria-label="정렬">{SORTS.map(s => <li key={s}><button type="button" role="option" aria-selected={s === sort} onClick={() => { setSort(s); setSheet(''); }}>{s}{s === sort && <Icon name="check" size={20} />}</button></li>)}</ul></div>
    </Modal>}
    {confirm && <Modal label="관심에서 뺄까요?" onClose={() => setConfirm(null)}>
      <h3 className="t-heading-4">관심에서 뺄까요?</h3>
      <p>{confirm.plan.university} {confirm.program?.name}가 관심 목록에서 빠져요. 대학 상세 · 될각의 관심 표시도 함께 꺼져요.</p>
      <div className="al-confirm__actions"><button type="button" className="button-outline" onClick={() => setConfirm(null)}>취소</button><button type="button" className="button-primary" onClick={() => { const row = confirm; setConfirm(null); void toggle(row, true); }}>빼기</button></div>
    </Modal>}
    {toast && <p role="status" className="toast al-toast"><strong><Icon name="check" size={20} />{toast.text}</strong>{toast.sub && <span className="t-body-sm">{toast.sub}</span>}</p>}
  </section>;
}
