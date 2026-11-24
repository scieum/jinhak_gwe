// 학과별 입결 구간표(work/dept-tier/02-spec.md · 05-build.json). 판정 · 순번 · 등급 이름 · 층별 색 없이 공개 컷을 구간 층으로만 쌓는다.
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { useReleasedResults } from '../data/releasedResults';
import { useUnivWiki } from '../data/univWiki';
import { useSampleMode } from '../data/sample/mode';
import { sampleTierFields, sampleTierUnits } from '../data/sample/deptTier';
import { buildLayers, DEFAULT_WIDTH, groupsOf, parseWidth, sameGroup, tierData, tierFields, widthText, WIDTH_PRESETS, type Major, type TierCell, type TierGroup, type TierType } from '../domain/deptTier';
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
const cutText = (c: number) => Number.isInteger(c) ? c.toFixed(1) : String(c);
/** univ-logo, 로고 파일이 없으면 univ-monogram(첫 글자) */
const Logo = ({ university }: { university: string }) => universityLogoFile(university) ? <UniversityLogo university={university} /> : <span className="dept-tier__mono" aria-hidden="true" data-ch={university.slice(0, 1)} />;
const detailPath = (c: TierCell, type: TierType) => `/univ-detail?u=${encodeURIComponent(c.university)}&d=${encodeURIComponent(`${c.unit}|${type}`)}`;

export function DeptTier() {
  const released = useReleasedResults(), wiki = useUnivWiki(), compact = useCompactResults(), sample = useSampleMode();
  // 샘플 모드: 이 화면 샘플(계열표 · 입결)을 더해요. 다른 화면이 보는 공개 로더는 그대로예요.
  const units = useMemo(() => released && sample ? [...released, ...sampleTierUnits] : released, [released, sample]);
  const fields = useMemo(() => [...(wiki?.fields ?? []), ...(wiki && sample ? sampleTierFields : [])], [wiki, sample]);
  const groups = useMemo(() => groupsOf(fields), [fields]);
  const [major, setMajor] = useState<Major>('인문'), [type, setType] = useState<TierType>('교과');
  const [pick, setPick] = useState<TierGroup | null>(null), [picker, setPicker] = useState(false);
  const [width, setWidth] = useState(savedWidth), [error, setError] = useState(''), [announce, setAnnounce] = useState('');
  const input = useRef<HTMLInputElement>(null), focusInput = useRef(false);
  const [head, setHead] = useState<Element | null>(null);
  useEffect(() => { setHead(compact ? null : document.querySelector('.topbar__heading')); }, [compact]);
  useEffect(() => { if (width.choice === CUSTOM && focusInput.current) { focusInput.current = false; input.current?.focus(); } }, [width.choice]);

  const inMajor = groups.filter(g => g.major === major);
  // 처음 열면 모집단위가 가장 많은 묶음(같으면 계열표 순서 앞)
  const size = (g: TierGroup) => fields.filter(f => f.major === g.major && f.mid === g.mid && f.small === g.small).length;
  const group = pick && inMajor.some(g => sameGroup(g, pick)) ? pick : inMajor.reduce<TierGroup | undefined>((a, g) => !a || size(g) > size(a) ? g : a, undefined);
  const data = units && group ? tierData(units, fields, group, type) : null;
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
      {width.choice === CUSTOM && <div className="dept-tier__custom">
        <input ref={input} className={error ? 'text-input text-input-error' : 'text-input'} inputMode="decimal" placeholder="예: 0.25" value={width.draft}
          aria-label="구간 폭 직접 입력, 0.05부터 1.0까지" aria-invalid={!!error} aria-describedby="dept-tier-width-help"
          onChange={e => setWidth(w => ({ ...w, draft: e.target.value }))} onBlur={commit} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commit(); } }} />
        <div id="dept-tier-width-help">{error ? <><p className="t-caption dept-tier__error">{error}</p><p className="t-caption text-muted">표는 직전 구간 폭 {widthText(width.w100)} 그대로예요</p></>
          : <p className="t-caption text-muted">0.05~1.0 · 소수 둘째 자리까지 넣을 수 있어요</p>}</div>
      </div>}</div>
    <p className="t-caption text-muted">이 기기에서만 기억해요</p>
  </div>;
  const asof = <span className="data-status-badge dept-tier__asof">데이터 기준일 {dataAsOf}</span>;
  const pendingBadge = data && data.status !== 'pending' && data.pending > 0 && <span className="data-status-badge dept-tier__pending-count">준비 중 {data.pending}개 — 검수가 끝나면 채워져요</span>;
  return <section data-slug="dept-tier" aria-label="학과별 입결 구간표" className="student-screen dept-tier">
    {head && createPortal(<><h1 className="dept-tier__title">학과별 입결 구간표</h1><p className="dept-tier__lead">학과 묶음 하나를 골라 공개 입결 70% 컷을 구간으로 쌓아 보여 드려요</p></>, head)}
    {compact ? <h2 className="dept-tier__mtitle">학과별 입결 구간표</h2> : <ScreenActions>{asof}</ScreenActions>}

    <section className="dept-tier__controls" aria-label="계열과 구간 폭 고르기">
      {compact ? <>
        {majorSeg}
        <div className="dept-tier__row">{group && <button type="button" className="button-pill-soft dept-tier__pick" aria-haspopup="dialog" onClick={() => setPicker(true)}>{group.mid} › {group.small} ▾</button>}{typeSeg}</div>
        {widthControl}
      </> : <>
        <div className="dept-tier__row dept-tier__row--top">{majorSeg}<div className="dept-tier__right">{typeSeg}{widthControl}</div></div>
        {inMajor.length > 0 && group && <>
          <div className="dept-tier__row" role="group" aria-label="중계열"><span className="t-label text-muted">중계열</span>
            {[...new Set(inMajor.map(g => g.mid))].map(mid => <button key={mid} type="button" className="filter-chip" aria-pressed={mid === group.mid} onClick={() => setPick(inMajor.find(g => g.mid === mid)!)}>{mid}</button>)}</div>
          <div className="dept-tier__row" role="group" aria-label="학과 묶음"><span className="t-label text-muted">학과 묶음</span>
            {inMajor.filter(g => g.mid === group.mid).map(g => <button key={g.small} type="button" className="filter-chip" aria-pressed={g.small === group.small} onClick={() => setPick(g)}>{g.small}</button>)}
            <button type="button" className="button-pill-soft dept-tier__search" aria-haspopup="dialog" onClick={() => setPicker(true)}><Icon name="search" size={20} />학과 이름으로 찾기</button></div>
        </>}
      </>}
    </section>
    <p role="status" className="sr-only">{announce}</p>

    {!units || !wiki ? <p role="status">공개 입결과 학과 계열표를 읽고 있어요.</p>
      : !group ? <div className="dept-tier__pending"><span className="data-status-badge">준비 중</span><p className="t-body-sm text-muted">학과 계열표에 {major} 계열이 아직 검수되지 않았어요. 검수가 끝나면 채워져요.</p></div>
      : data!.status === 'pending' ? <div className="dept-tier__pending"><h3 className="t-heading-4">{group.small}</h3><span className="data-status-badge">준비 중</span><p className="t-body-sm text-muted">이 묶음의 입결은 아직 검수 중이에요</p></div>
      : <>
        {compact ? <div className="dept-tier__basis">{asof}<p className="t-caption text-muted">{year}학년도 수시 {typeName} · 70% 컷 · 9등급</p><p className="t-caption text-muted">관리자가 검수한 입결만 · 등급은 숫자가 작을수록 상위예요</p></div>
          : <div className="dept-tier__basis"><p className="t-caption text-muted">{year}학년도 수시 {typeName} · 70% 컷 · 9등급 · 관리자가 검수한 입결만 · 등급은 숫자가 작을수록 상위예요</p>{pendingBadge}</div>}
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
              {l.cells.length ? <ul className="tier-layer__cells">{l.cells.map(c => <li key={`${c.university}|${c.unit}`}>
                <Link className="tier-cell" to={detailPath(c, type)} aria-label={`${c.university} ${c.unit}, ${year}학년도 ${typeName} 70% 컷 ${cutText(c.cut)}, 대학 상세로 이동`}>
                  <Logo university={c.university} />
                  <span className="tier-cell__univ">{c.university}</span>
                  <span className="tier-cell__unit">{c.unit}</span>
                  <span className="tier-cell__cut"><span className="num">{cutText(c.cut)}</span><Icon name="chevron-right" size={16} /></span>
                </Link></li>)}</ul>
                : <p className="t-body-sm text-muted">이 구간에는 공개된 입결이 없어요</p>}
            </section>)}
          </div>}
        <details className="trace-accordion"><summary><span>어떻게 나눴나요?</span><Icon name="chevron-down" size={20} /></summary>
          <ol>
            <li>기준 → {year}학년도 수시 {typeName} 70% 컷 · 9등급 · 관리자 2명 검수</li>
            <li>계열 → {group.major} › {group.mid} › {group.small}(학과 계열표, 관리자 2명 검수)</li>
            <li>대상 → 후보 {data!.candidates}개 중 {data!.pending ? `검수 전 ${data!.pending}개 빼요 → ` : ''}{cells.length}개</li>
            {data!.status === 'short' ? <li>층별 개수 → 모집단위 {cells.length}개 — 3개보다 적어서 표를 만들지 않아요</li> : <>
              <li>구간 폭 → {width.choice === CUSTOM ? `학생이 직접 넣은 ${widthText(width.w100)}(0.05~1.0 · 소수 둘째 자리까지)` : `학생이 고른 ${widthText(width.w100)}(0.1 · 0.2 · 0.3 · 0.5 중에서 고르거나 0.05~1.0 사이로 직접 넣을 수 있어요)`} · 1.0부터 {widthText(width.w100)}씩 · 아래 경계 포함 · 데이터 범위 {cutText(Math.min(...cells.map(c => c.cut)))}~{cutText(Math.max(...cells.map(c => c.cut)))} 밖 층은 그리지 않아요</li>
              <li>층별 개수 → {layers.map(l => `${l.label} ${l.cells.length}개`).join(' · ')}</li></>}
            <li>빠지는 경우 → 입결 미공개 · 검수 전 · 5등급제 컷 · 컷 빈칸 · 다른 학년도 · 계열표에 대계열이 없는 모집단위</li>
            <li>층 안 순서 → 대학 이름 가나다순(위아래 · 왼쪽오른쪽 순서는 서열이 아니에요)</li>
          </ol>
          {data!.status === 'ok' && <p className="dept-tier__total">모집단위 {cells.length}개 · 층 {layers.length}개{empty ? `(빈 층 ${empty}개)` : ''}</p>}
        </details>
      </>}
    <p className="disclaimer-note t-caption text-muted"><Icon name="info" size={16} /><span>공개된 {year ?? ''}{year ? '학년도 ' : ''}입결 70% 컷을 고른 구간 폭으로 묶은 표예요 · 대학이나 학과의 순위 · 추천이 아니에요 · 위아래와 좌우 순서는 숫자 구간과 가나다순일 뿐이에요 · 대학 공식 자료가 최종 기준이에요{sample ? ' · 샘플의 대학·숫자는 예시예요' : ''} · 데이터 기준일 {dataAsOf}</span></p>
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
