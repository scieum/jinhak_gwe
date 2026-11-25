// 학과별 입결 구간표(work/dept-tier/02-spec.md · 05-build.json). 판정 · 순번 · 등급 이름 · 층별 색 없이 공개 컷을 구간 층으로만 쌓는다.
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { useTierSources } from '../data/deptTier';
import { indexTierPlans, plansForTier, quotaDelta, resultQuota, unitPlanQuota } from '../domain/deptTierPlans';
import { planFileName, planFileUrl, planPageUrl } from '../domain/admissionPlans';
import { buildLayers, DEFAULT_WIDTH, groupsOf, isLocalTalent, localTalentMatch, parseWidth, sameGroup, SPECIAL_KINDS, tierData, tierFields, widthText, WIDTH_PRESETS, type Major, type SpecialKind, type TierCell, type TierGroup, type TierType } from '../domain/deptTier';
import { SIDO } from '../domain/auth';
import type { FieldRow } from '../domain/univWiki';
import { SegmentedControl } from '../components/SegmentedControl';
import { UniversityLogo, universityLogoFile } from '../components/UniversityLogo';
import { ScreenActions } from '../components/ScreenActions';
import { dataAsOf } from '../data/catalog';
import { Modal } from '../components/Modal';
import { Icon } from '../components/Icon';
import { useCompactResults } from '../components/ResultFilters';
import '../styles/dept-tier.css';

const KEY = 'dept-tier-width', CUSTOM = 'custom';
/** 고른 폭은 이 기기에만(spec D5 · D17). 저장소가 막혀 있어도 기본 0.5로 동작한다. */
function savedWidth(): { choice: string; w100: number; draft: string } {
  try {
    const v = localStorage.getItem(KEY) ?? '';
    if (v.startsWith(`${CUSTOM}:`)) { const p = parseWidth(v.slice(CUSTOM.length + 1)); if (p && 'w100' in p) return { choice: CUSTOM, w100: p.w100, draft: v.slice(CUSTOM.length + 1) }; }
    if ((WIDTH_PRESETS as readonly number[]).includes(Number(v))) return { choice: v, w100: Number(v), draft: '' };
  } catch { /* 저장소 사용 불가 */ }
  return { choice: String(DEFAULT_WIDTH), w100: DEFAULT_WIDTH, draft: '' };
}
const saveWidth = (v: string) => { try { localStorage.setItem(KEY, v); } catch { /* 기억만 못 할 뿐 표는 바뀐다 */ } };
/** 우리 도(지역인재 권역 판단). 앱에 학생 시·도 정보가 없어서 이 화면에서 고르고 이 기기에만 기억한다(구간 폭과 같은 방식). */
const SIDO_KEY = 'dept-tier-sido';
const savedSido = () => { try { const v = localStorage.getItem(SIDO_KEY) ?? ''; return (SIDO as readonly string[]).includes(v) ? v : ''; } catch { return ''; } };
const saveSido = (v: string) => { try { localStorage.setItem(SIDO_KEY, v); } catch { /* 기억만 못 할 뿐 표는 바뀐다 */ } };
const cutText = (c: number) => Number.isInteger(c) ? c.toFixed(1) : String(c);
/** univ-logo, 로고 파일이 없으면 univ-monogram(첫 글자) */
const Logo = ({ university }: { university: string }) => universityLogoFile(university) ? <UniversityLogo university={university} /> : <span className="dept-tier__mono" aria-hidden="true" data-ch={university.slice(0, 1)} />;
// 2026-11-25 사용자 요청: 칸을 누르면 수시 입결(대학별 최근 3개년)에서 그 학과를 바로 보여 줘요.
const detailPath = (c: TierCell, type: TierType) => `/admission-results?${new URLSearchParams({ view: 'university', gu: c.university, gt: type, gp: c.program, gd: c.unit })}`;

export function DeptTier() {
  const { sources, retry } = useTierSources(), compact = useCompactResults();
  const wiki = sources?.wiki, draft = sources?.draft, plans = sources?.plans ?? null;
  const units = useMemo(() => sources ? [...sources.released, ...sources.draft.units] : null, [sources]);
  const planIndex = useMemo(() => indexTierPlans(plans), [plans]);
  const [planCell, setPlanCell] = useState<TierCell | null>(null);
  const fields = useMemo(() => {
    const reviewed = wiki?.fields ?? [], has = new Set(reviewed.map(f => `${f.university}|${f.unit}`));
    // 검수된 계열표가 있는 모집단위는 초안보다 검수표를 따른다
    return [...reviewed, ...(draft ? draft.fields.filter(f => !has.has(`${f.university}|${f.unit}`)) : [])];
  }, [wiki, draft]);
  const groups = useMemo(() => groupsOf(fields), [fields]);
  const [major, setMajor] = useState<Major>('인문'), [type, setType] = useState<TierType>('교과');
  const [pick, setPick] = useState<TierGroup | null>(null), [picker, setPicker] = useState(false);
  const [kinds, setKinds] = useState<SpecialKind[]>([]); // 기본은 일반 전형만, 특별 전형은 종류별로 켠다(2026-11-25 사용자 요청)
  const [sido, setSido] = useState(savedSido);
  const localOk = useMemo(() => (u: string) => localTalentMatch(sido, plansForTier(planIndex, u, '교과').map(x => x.plan.region)), [sido, planIndex]);
  const [width, setWidth] = useState(savedWidth), [error, setError] = useState(''), [announce, setAnnounce] = useState('');
  const input = useRef<HTMLInputElement>(null), focusInput = useRef(false);
  const [head, setHead] = useState<Element | null>(null);
  useEffect(() => { setHead(compact ? null : document.querySelector('.topbar__heading')); }, [compact]);
  useEffect(() => { if (width.choice === CUSTOM && focusInput.current) { focusInput.current = false; input.current?.focus(); } }, [width.choice]);

  const inMajor = groups.filter(g => g.major === major);
  // 처음 열면 모집단위가 가장 많은 묶음(같으면 계열표 순서 앞)
  const size = (g: TierGroup) => fields.filter(f => f.major === g.major && f.mid === g.mid && f.small === g.small).length;
  const group = pick && inMajor.some(g => sameGroup(g, pick)) ? pick : inMajor.reduce<TierGroup | undefined>((a, g) => !a || size(g) > size(a) ? g : a, undefined);
  const data = useMemo(() => units && group ? tierData(units, fields, group, type, { kinds, localOk }) : null, [units, fields, group, type, kinds, localOk]);
  const cells = data && data.status !== 'pending' ? data.cells : [];
  const layers = buildLayers(cells, width.w100);

  const apply = (w100: number, choice: string, draft: string, saved: string) => {
    setWidth({ choice, w100, draft }); setError(''); saveWidth(saved);
    if (cells.length) setAnnounce(`층 ${buildLayers(cells, w100).length}개로 다시 나눴어요`);
  };
  const choose = (choice: string) => {
    if (choice === CUSTOM) { focusInput.current = true; setWidth(w => ({ ...w, choice })); return; } // 입력 전에는 직전 폭 그대로
    apply(Number(choice), choice, width.draft, choice);
  };
  const commit = () => {
    const p = parseWidth(width.draft);
    if (!p) { setError(''); return; } // 빈칸 = 직전 폭 유지
    if ('error' in p) { setError(p.error); setAnnounce(`${p.error}. 표는 직전 구간 폭 ${widthText(width.w100)} 그대로예요`); return; }
    apply(p.w100, CUSTOM, width.draft.trim(), `${CUSTOM}:${width.draft.trim()}`);
  };
  const choosePick = (g: TierGroup) => { setPick(g); setPicker(false); };

  const year = data && data.status !== 'pending' ? data.year : null;
  const typeName = `학생부${type}`, empty = layers.filter(l => !l.cells.length).length;
  const majorSeg = <SegmentedControl label="대계열" value={major} onChange={m => { setMajor(m); setPick(null); }} options={[{ value: '인문', label: '인문' }, { value: '자연', label: '자연' }]} />;
  const typeSeg = <SegmentedControl label="전형 유형" value={type} onChange={setType} options={[{ value: '교과', label: '교과' }, { value: '종합', label: '종합' }]} />;
  const widthControl = <div className="dept-tier__width">
    <div className="dept-tier__width-row"><span className="t-label text-muted" id="dept-tier-width-label">구간 폭</span>
      <SegmentedControl label="구간 폭" value={width.choice} onChange={choose}
        options={[...WIDTH_PRESETS.map(w => ({ value: String(w), label: widthText(w) })), { value: CUSTOM, label: '직접' }]} />
      <p className="t-caption text-muted dept-tier__remember">이 기기에서만 기억해요</p>{/* 2026-11-25 사용자 요청: 안내 글은 컨트롤 바로 뒤 같은 줄 */}
      {width.choice === CUSTOM && <div className="dept-tier__custom">
        <input ref={input} className={error ? 'text-input text-input-error' : 'text-input'} inputMode="decimal" placeholder="예: 0.25" value={width.draft}
          aria-label="구간 폭 직접 입력, 0.05부터 1.0까지" aria-invalid={!!error} aria-describedby="dept-tier-width-help"
          onChange={e => setWidth(w => ({ ...w, draft: e.target.value }))} onBlur={commit} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commit(); } }} />
        <div id="dept-tier-width-help">{error ? <><p className="t-caption dept-tier__error">{error}</p><p className="t-caption text-muted">표는 직전 구간 폭 {widthText(width.w100)} 그대로예요</p></>
          : <p className="t-caption text-muted">0.05~1.0 · 소수 둘째 자리까지 넣을 수 있어요</p>}</div>
      </div>}</div>
  </div>;
  const kindCounts = data?.kinds ?? {}, shownKinds = SPECIAL_KINDS.filter(k => (kindCounts[k.kind] ?? 0) > 0);
  const toggleKind = (k: SpecialKind) => setKinds(ks => ks.includes(k) ? ks.filter(x => x !== k) : [...ks, k]);
  const specialRow = <div className="dept-tier__row" role="group" aria-label="특별 전형 종류"><span className="t-label text-muted">특별 전형</span>
    {shownKinds.map(({ kind }) => <button key={kind} type="button" className="filter-chip" aria-pressed={kinds.includes(kind)} onClick={() => toggleKind(kind)}>{kind} <span className="num">{kindCounts[kind]}</span></button>)}
    <p className="t-caption text-muted dept-tier__remember">{shownKinds.length ? '지원 자격이 제한된 전형이에요 · 켠 종류만 층에 넣어요' : '이 묶음에는 특별 전형 입결이 없어요'}</p></div>;
  const sidoRow = <div className="dept-tier__row"><label className="t-label text-muted" htmlFor="dept-tier-sido">우리 도</label>
    <span className="dept-tier__sido"><select id="dept-tier-sido" value={sido} onChange={e => { setSido(e.target.value); saveSido(e.target.value); }}>
      <option value="">설정 안 함</option>{SIDO.map(s => <option key={s} value={s}>{s}</option>)}</select><Icon name="chevron-down" size={20} /></span>
    <p className="t-caption text-muted dept-tier__remember">지원 자격이 맞는 지역인재 전형만 보여 드려요 · 이 기기에서만 기억해요</p></div>;
  const asof = <span className="data-status-badge dept-tier__asof">{plans ? `전형계획 확인일 ${plans.checked_at}` : `데이터 기준일 ${dataAsOf}`}</span>;
  const summary = data && data.status !== 'pending' ? [data.pending > 0 && `이 묶음에서 ${type} 컷이 없는 모집단위 ${data.pending}개는 층에 넣지 않았어요`, data.special > 0 && `특별 전형 ${data.special}개 제외`,
    data.local > 0 && (sido ? `지역인재 ${data.local}개 제외 · 우리 도 권역의 대학이 아니에요` : `지역인재 ${data.local}개 제외 · 우리 도를 설정하면 지원 자격이 맞는 지역인재 전형을 보여 드려요`)].filter(Boolean).join(' · ') : '';
  const pendingBadge = summary && <span className="data-status-badge dept-tier__pending-count">{summary}</span>;
  const basisNote = '원문 대조 전 참고자료예요';
  const otherYear = data && data.status !== 'pending' ? data.other : 0, special = data?.special ?? 0, local = data?.local ?? 0;
  return <section data-slug="dept-tier" aria-label="학과별 입결 구간표" className="student-screen dept-tier">
    {head && createPortal(<><h1 className="dept-tier__title">학과별 입결 구간표</h1><p className="dept-tier__lead">학과 묶음 하나를 골라 공개 입결 70% 컷을 구간으로 쌓아 보여 드려요</p></>, head)}
    {compact ? <h2 className="dept-tier__mtitle">학과별 입결 구간표</h2> : <ScreenActions>{asof}</ScreenActions>}

    <section className="dept-tier__controls" aria-label="계열과 구간 폭 고르기">
      {compact ? <>
        {majorSeg}
        <div className="dept-tier__row">{group && <button type="button" className="button-pill-soft dept-tier__pick" aria-haspopup="dialog" onClick={() => setPicker(true)}>{group.mid} › {group.small} ▾</button>}{typeSeg}</div>
        {widthControl}
        {sidoRow}
        {specialRow}
      </> : <>
        <div className="dept-tier__row dept-tier__row--top">{majorSeg}<div className="dept-tier__right">{typeSeg}{widthControl}</div></div>
        {inMajor.length > 0 && group && <>
          <div className="dept-tier__row" role="group" aria-label="중계열"><span className="t-label text-muted">중계열</span>
            {[...new Set(inMajor.map(g => g.mid))].map(mid => <button key={mid} type="button" className="filter-chip" aria-pressed={mid === group.mid} onClick={() => setPick(inMajor.find(g => g.mid === mid)!)}>{mid}</button>)}</div>
          <div className="dept-tier__row" role="group" aria-label="학과 묶음"><span className="t-label text-muted">학과 묶음</span>
            {inMajor.filter(g => g.mid === group.mid).map(g => <button key={g.small} type="button" className="filter-chip" aria-pressed={g.small === group.small} onClick={() => setPick(g)}>{g.small}</button>)}
            <button type="button" className="button-pill-soft dept-tier__search" aria-haspopup="dialog" onClick={() => setPicker(true)}><Icon name="search" size={20} />학과 이름으로 찾기</button></div>
        </>}
        {sidoRow}
        {specialRow}
      </>}
    </section>
    <p role="status" className="sr-only">{announce}</p>
    {!!sources?.errors.length && <div className="dept-tier__load-error" role="alert"><p>{sources.errors.join(' · ')} 자료를 불러오지 못했어요. 불러온 자료만 표시하고 있어요.</p><button type="button" className="button-outline" onClick={retry}>다시 불러오기</button></div>}
    {plans && <p className="t-caption text-muted dept-tier__plan-note">실제 공개 자료 · {plans.year}학년도 전형계획 연결 · 입결은 아래 표시된 과거 학년도 자료예요. 학과별 모집 여부와 인원은 전형계획 원문에서 확인해 주세요.</p>}

    {!units || !wiki ? <p role="status">공개 입결과 학과 계열표를 읽고 있어요.</p>
      : !group ? <div className="dept-tier__pending"><span className="data-status-badge">준비 중</span><p className="t-body-sm text-muted">학과 계열표에 {major} 계열이 아직 검수되지 않았어요. 검수가 끝나면 채워져요.</p></div>
      : data!.status === 'pending' ? <div className="dept-tier__pending"><h3 className="t-heading-4">{group.small}</h3><span className="data-status-badge">준비 중</span><p className="t-body-sm text-muted">이 묶음의 입결은 아직 검수 중이에요</p></div>
      : <>
        {compact ? <div className="dept-tier__basis">{asof}<p className="t-caption text-muted">{year}학년도 수시 {typeName} · 70% 컷 · 9등급</p><p className="t-caption text-muted">{basisNote} · 등급은 숫자가 작을수록 상위예요</p></div>
          : <div className="dept-tier__basis"><p className="t-caption text-muted">{year}학년도 수시 {typeName} · 70% 컷 · 9등급 · {basisNote} · 등급은 숫자가 작을수록 상위예요</p>{pendingBadge}</div>}
        <div className="dept-tier__mine"><div className="dept-tier__mine-head"><h3 className="t-title">내 위치</h3><span className="data-status-badge">준비 중</span></div>
          {/* shortcut: 검수된 5→9 환산 규칙이 아직 없어서(NEVER-1) 항상 준비 중. 규칙이 verified가 되면 spec D11 선 · 띠 · 말풍선을 그린다 */}
          <p className="text-muted">검수된 환산 규칙이 생기면 {compact ? '이 표 위에' : '왼쪽 축에'} 내 위치를 보여 드려요</p></div>
        {compact && pendingBadge}
        {data!.status === 'short' ? <div className="empty-state"><Icon name="layers" /><h3 className="t-heading-4">공개된 입결이 아직 적어요</h3>
          <p>검수된 모집단위가 {cells.length}개라서 층을 쌓지 않았어요. 3개부터 보여 드려요</p>
          <button type="button" className="button-primary" aria-haspopup="dialog" onClick={() => setPicker(true)}>다른 학과 묶음 고르기</button></div>
          : <div className="dept-tier__board" aria-label={`${group.mid} › ${group.small} 구간 층`}>
            {layers.map(l => <section key={l.lo} className="placement-board tier-layer" aria-labelledby={`tier-${l.lo}`}>
              <h4 className="tier-layer__head" id={`tier-${l.lo}`}><span className="tier-layer__range num"><span className="tier-layer__prefix">70% 컷 </span>{l.label}</span>
                <span className="t-caption text-muted">모집단위 {l.cells.length}개</span></h4>
              {l.cells.length ? <ul className="tier-layer__cells">{l.cells.map(c => <li key={`${c.university}|${c.unit}|${c.program}`}>
                <div className="tier-cell-group">
                <Link className="tier-cell" to={detailPath(c, type)} aria-label={`${c.university} ${c.unit}, ${year}학년도 ${typeName} 70% 컷 ${cutText(c.cut)}${isLocalTalent(c.program) ? ', 지역인재 지원 자격 해당 가능, 원문 확인' : ''}, 수시 입결 최근 3개년 보기`}>
                  <Logo university={c.university} />
                  <span className="tier-cell__univ">{c.university}</span>
                  <span className="tier-cell__unit">{c.unit}</span>
                  <span className="tier-cell__program">{c.program}</span>
                  {isLocalTalent(c.program) && <span className="tier-cell__program">지역인재 · 지원 자격은 원문 확인</span>}
                  <span className="tier-cell__cut"><span className="num">{cutText(c.cut)}</span><Icon name="chevron-right" size={16} /></span>
                </Link>
                {plans && (plansForTier(planIndex, c.university, type).length > 0
                  ? <button type="button" className="tier-cell__plan" aria-label={`${c.university} ${plans.year} 전형계획 보기`} onClick={() => setPlanCell(c)}>{plans.year} 전형계획 <Icon name="chevron-right" size={14} /></button>
                  : <span className="tier-cell__plan tier-cell__plan--empty">전형계획 연결 자료 없음</span>)}
                </div></li>)}</ul>
                : <p className="t-body-sm text-muted">이 구간에는 공개된 입결이 없어요</p>}
            </section>)}
          </div>}
        <details className="trace-accordion"><summary><span>어떻게 나눴나요?</span><Icon name="chevron-down" size={20} /></summary>
          <ol>
            <li>기준 → {year}학년도 수시 {typeName} 70% 컷 · 9등급 · 수시 정리본(원문 대조 전) · 원문 확인 필요 행 제외</li>
            <li>계열 → {group.major} › {group.mid} › {group.small} · 학과 계열표 초안(학과명 규칙 추천, 검수 전)</li>
            <li>대상 → 후보 {data!.candidates}개 중 {[data!.pending && `${type} 컷 없음 ${data!.pending}개`, otherYear && `다른 학년도 ${otherYear}개`, special && `특별 전형 ${special}개`, local && `지역인재 ${local}개`].filter(Boolean).map(t => `${t} `).join('· ') + (data!.pending || otherYear || special || local ? '빼요 → ' : '')}{cells.length}개</li>
            {data!.status === 'short' ? <li>층별 개수 → 모집단위 {cells.length}개 — 3개보다 적어서 표를 만들지 않아요</li> : <>
              <li>구간 폭 → {width.choice === CUSTOM ? `학생이 직접 넣은 ${widthText(width.w100)}(0.05~1.0 · 소수 둘째 자리까지)` : `학생이 고른 ${widthText(width.w100)}(0.1 · 0.2 · 0.3 · 0.5 중에서 고르거나 0.05~1.0 사이로 직접 넣을 수 있어요)`} · 1.0부터 {widthText(width.w100)}씩 · 아래 경계 포함 · 데이터 범위 {cutText(Math.min(...cells.map(c => c.cut)))}~{cutText(Math.max(...cells.map(c => c.cut)))} 밖 층은 그리지 않아요</li>
              <li>층별 개수 → {layers.map(l => `${l.label} ${l.cells.length}개`).join(' · ')}</li></>}
            <li>빠지는 경우 → 입결 미공개 · 검수 전 · 5등급제 컷 · 컷 빈칸 · 다른 학년도 · 계열표에 대계열이 없는 모집단위 · 켜지 않은 종류의 특별 전형(지원 자격이 제한된 전형) · 우리 도 권역(강원 · 충청 · 호남 · 대구경북 · 부산울산경남 · 제주)에 소재하지 않은 대학의 지역인재 전형</li>
            <li>층 안 순서 → 같은 층 안에서 70% 컷 숫자가 작은 칸부터 왼쪽에, 같으면 대학 이름 가나다순(서열이 아니에요)</li>
          </ol>
          {data!.status === 'ok' && <p className="dept-tier__total">모집단위 {cells.length}개 · 층 {layers.length}개{empty ? `(빈 층 ${empty}개)` : ''}</p>}
        </details>
      </>}
    <p className="disclaimer-note t-caption text-muted"><Icon name="info" size={16} /><span>공개된 {year ?? ''}{year ? '학년도 ' : ''}입결 70% 컷을 고른 구간 폭으로 묶은 표예요 · 대학이나 학과의 순위 · 추천이 아니에요 · 위아래는 숫자 구간, 같은 층 안 좌우는 컷 숫자 순일 뿐이에요 · 대학 공식 자료가 최종 기준이에요 · 데이터 기준일 {dataAsOf}</span></p>
    {planCell && plans && <Modal label={`${planCell.university} 전형계획`} wide onClose={() => setPlanCell(null)}>
      <div className="section-row"><h3 className="t-heading-3">{planCell.university} · {plans.year} 전형계획</h3><button type="button" className="button-outline" onClick={() => setPlanCell(null)}>닫기</button></div>
      <p className="t-body-sm text-muted">{planCell.unit}의 {year}학년도 입결에서 연결했어요. 아래는 대학·캠퍼스 단위의 학생부{type} 전형 목록이며, 이 학과에 적용되는지는 모집 범위를 확인해 주세요.</p>
      {plansForTier(planIndex, planCell.university, type).map(({ plan, programs }) => <section key={plan.id} className="dept-tier__plan-campus">
        <h4 className="t-heading-4">{plan.campus} · {plan.region}</h4>
        {!programs.length && <p className="text-muted">학생부{type} 요약이 없어 원문으로 제공해요.</p>}
        {programs.map((program, i) => {
          const doc = plan.documents.find(d => d.id === program.document_id), q = unitPlanQuota(program, planCell.unit);
          // 증감은 이 모집단위 · 같은 전형 이름의 입결 학년도 모집인원과 정확히 맞을 때만(별칭 · 이름 바뀜 추정 없음)
          const before = q?.kind === 'unit' && typeof q.quota === 'number' && year ? resultQuota(units ?? [], planCell.university, planCell.unit, program.name, year) : null;
          return <article className="dept-tier__plan-program" key={`${program.name}-${i}`}>
            <h5 className="t-title">{program.name}</h5>
            <dl>{q ? <div><dt>모집인원({planCell.unit})</dt><dd>
              {q.kind === 'pooled' ? `공동선발 ${q.quota}명(${q.units}개 학과)` : typeof q.quota === 'number' ? `${q.quota}명` : q.quota}
              {before !== null && typeof q.quota === 'number' && <> <strong className="num">{quotaDelta(q.quota, before)}</strong> <span className="t-caption text-muted">{year} 입결 모집 {before}명 대비</span></>}
              {doc && <> <a className="t-link t-caption" href={planPageUrl(doc, q.pages[0])} target="_blank" rel="noreferrer">{q.pages.join(', ')}쪽 ↗</a></>}</dd></div>
              : <div><dt>전형 전체 모집인원</dt><dd>{program.quota}</dd></div>}
              <div><dt>모집 범위</dt><dd>{program.scope || ('unit' in program && typeof program.unit === 'string' && program.unit) || '모집단위별 적용 여부는 원문 확인'}</dd></div>
              <div><dt>전형방법</dt><dd>{program.method}</dd></div><div><dt>수능최저</dt><dd>{program.minimum}</dd></div>
              <div><dt>지원자격</dt><dd>{program.eligibility}</dd></div>
              {program.interview && <div><dt>면접</dt><dd>{program.interview}</dd></div>}</dl>
            {doc && <a className="t-link" href={planPageUrl(doc, program.pages[0])} target="_blank" rel="noreferrer">시행계획 원문 · {program.pages.join(', ')}쪽 ↗</a>}
          </article>;
        })}
        {!programs.length && plan.documents.map(doc => doc.local_file
          ? <a key={doc.id} className="t-link" href={planFileUrl(doc)} download={planFileName(doc)}>{doc.label} 내려받기 (PDF)</a>
          : <a key={doc.id} className="t-link" href={doc.download_url} target="_blank" rel="noreferrer">{doc.label} ↗</a>)}
      </section>)}
      <p className="t-caption text-muted">시행계획 기준 · 확인일 {plans.checked_at} · 최종 모집요강에서 변경될 수 있어요.</p>
    </Modal>}
    {picker && <GroupPicker fields={fields} groups={inMajor} current={group} onPick={choosePick} onClose={() => setPicker(false)} />}
  </section>;
}

/** 모바일 bottom-sheet · PC modal(같은 Modal, 모바일에서는 아래에 붙는다). 실제 학과명으로도 묶음을 찾는다. */
function GroupPicker({ fields, groups, current, onPick, onClose }: { fields: readonly FieldRow[]; groups: TierGroup[]; current?: TierGroup; onPick: (g: TierGroup) => void; onClose: () => void }) {
  const [q, setQ] = useState(''), query = q.trim();
  const rows = tierFields(fields);
  const unitsOf = (g: TierGroup) => rows.filter(f => sameGroup(f as TierGroup, g));
  const shown = groups.filter(g => !query || g.small.includes(query) || g.mid.includes(query) || unitsOf(g).some(f => f.unit.includes(query)));
  return <Modal label="학과 묶음 고르기" onClose={onClose}>
    <div className="section-row"><h3 className="t-heading-3">학과 묶음 고르기</h3><button type="button" className="button-outline" onClick={onClose} aria-label="닫기"><Icon name="x" size={20} /></button></div>
    <input type="search" className="text-input" placeholder="학과 이름으로 찾기" aria-label="학과 이름으로 찾기" value={q} onChange={e => setQ(e.target.value)} />
    {!shown.length && <p className="t-body-sm text-muted">찾는 학과 묶음이 없어요</p>}
    {[...new Set(shown.map(g => g.mid))].map(mid => <section key={mid} aria-label={mid} className="dept-tier__picker">
      <h4 className="t-label text-muted">{mid}</h4>
      {shown.filter(g => g.mid === mid).map(g => <button key={g.small} type="button" className="dept-tier__picker-row" aria-pressed={!!current && sameGroup(g, current)} onClick={() => onPick(g)}>
        <span>{g.small}</span><span className="t-caption text-muted">모집단위 {unitsOf(g).length}개</span></button>)}
    </section>)}
  </Modal>;
}
