import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { ButtonOutline } from '../components/Buttons';
import { Icon } from '../components/Icon';
import { InterestButton } from '../components/InterestButton';
import { Modal } from '../components/Modal';
import { ScreenActions } from '../components/ScreenActions';
import { UniversityLogo } from '../components/UniversityLogo';
import { loadAdmissionPlans } from '../data/admissionPlans';
import { dataAsOf } from '../data/catalog';
import { cutTables as releasedCuts } from '../data/mock-exams';
import { sampleCutTables } from '../data/sample/mockScore';
import { SAMPLE_MINIMUM_PENDING, sampleMinimumRules } from '../data/sample/minimumSearch';
import { isSampleMode, useSampleMode } from '../data/sample/mode';
import { sampleTrendMocks } from '../data/sample/scoreTrend';
import { reviewed } from '../engine/types';
import type { CutTable } from '../domain/mock';
import { CORE, SEARCH_ORDER, VERDICT_CLASS, examsByRecent, gradesForMinimum, requiredAreas, searchMinimum, shownGrade, verdictText, whatIfMinimum, type Core, type Criterion, type MinimumRule, type SearchRow, type Verdict } from '../domain/minimum';
import { useStudent } from '../store/studentDb';
import '../styles/minimum-search.css';

export interface MinimumSource { rules: MinimumRule[]; pending: number; asOf: string }

/** 실제 자료: 전형계획(admission-plans.json)은 아직 draft라 검수된 기준이 0개예요. 최저 문구가 있는 전형은 "검수 전" 개수로만 세요(D1).
 *  샘플 모드에서는 sample 표식 기준(data/sample/minimumSearch)으로 시안 예시를 보여 줘요 — 샘플 모드가 꺼지면 reviewed()가 막아요(NEVER-1). */
// shortcut: 검수된 구조화 csat_minimum 자료가 없어 실제 rules는 늘 빈 목록, 관리자 검수 자료가 배포되면 여기서 읽어요.
export async function loadMinimumSource(): Promise<MinimumSource> {
  if (isSampleMode()) return { rules: sampleMinimumRules, pending: SAMPLE_MINIMUM_PENDING, asOf: dataAsOf };
  const catalog = await loadAdmissionPlans();
  const pending = catalog.entries.flatMap(e => e.programs).filter(p => p.minimum.trim() && !p.minimum.includes('미적용') && p.minimum !== '원문 확인 필요').length;
  return { rules: [], pending, asOf: catalog.checked_at };
}

const SHORT: Record<Core, string> = { 국어: '국', 수학: '수', 영어: '영', 탐구: '탐' };
/** 받침에 따라 을/를 · 은/는. */
const josa = (w: string, pair: [string, string]) => w + ((w.charCodeAt(w.length - 1) - 0xac00) % 28 ? pair[0] : pair[1]);
const MARK: Partial<Record<Verdict, string>> = { 충족: 'safe', 근접: 'fit', 미충족: 'risk' };
const TILE_NOTE: Record<Verdict, [desktop: string, mobile: string]> = { 충족: ['지금 등급으로 기준 안', '기준 안'], 근접: ['1등급 오르면 기준 안', '1등급 차이'], 미충족: ['기준 밖', '기준 밖'], '자료 부족': ['성적에 없는 영역이 있어요', '성적 필요'], '판정 불가': ['', ''] };
const RULE_NOTE: Record<Verdict, string> = { 충족: '고른 영역 합이 기준 이내', 근접: '한 영역이 1등급 오르면 기준 안', 미충족: '한 영역을 올려도 기준 밖', '자료 부족': '필요한 성적이 없으면 판정하지 않아요', '판정 불가': '대학 기준이 없어요' };
/** 표 첫 화면(전체 보기)에 판정마다 보여 줄 줄 수(v2 시안 1440 표 8행). 타일을 누르면 그 판정 전체를 보여 줘요. */
const PREVIEW: Partial<Record<Verdict, number>> = { 충족: 3, 근접: 2, 미충족: 2, '자료 부족': 1 };
const MOBILE_ROWS = 3;

function useDesktop() {
  const query = '(min-width: 1024px)';
  const [desktop, setDesktop] = useState(() => typeof matchMedia === 'function' && matchMedia(query).matches);
  useEffect(() => {
    if (typeof matchMedia !== 'function') return;
    const media = matchMedia(query), update = () => setDesktop(media.matches);
    update(); media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  return desktop;
}

const Badge = ({ v }: { v: Verdict }) => <span className={`judge-badge mns-badge ${VERDICT_CLASS[v]}`}>{MARK[v] && <span className={`mns-mark mns-mark--${MARK[v]}`} aria-hidden="true" />}<span>{v}</span></span>;
const areaText = (c: Criterion) => c.areas.map(a => SHORT[a]).join('·');
/** "국·수·영·탐 중 2개" · "수학 포함 2개" · "국·수 포함 3개" · "국·수·영·탐 4개" */
function scopeText(c: Criterion) {
  const must = requiredAreas(c);
  if (must.length) return `${must.length > 1 ? must.map(a => SHORT[a]).join('·') : must[0]} 포함 ${c.count}개`;
  return `${areaText(c)}${c.count < c.areas.length ? ' 중' : ''} ${c.count}개`;
}
const sumText = (c: Criterion) => `합 ${c.sum} 이내${c.history_max ? ` · 한국사 ${c.history_max} 이내` : ''}`;
/** 영역 고르는 방법은 minimum.ts bestSum과 같아요: 필수 영역 먼저, 나머지는 좋은 등급부터(같으면 국·수·영·탐 순). */
function pickedText(row: SearchRow) {
  const c = row.rule.criterion, v = row.judged.values, must = requiredAreas(c);
  const rest = CORE.filter(a => c.areas.includes(a) && !must.includes(a) && v[a] !== undefined).sort((a, b) => v[a]! - v[b]!);
  const picked = [...must, ...rest].slice(0, c.count);
  return row.sum === null ? '—' : `${picked.map(a => `${SHORT[a]} ${v[a]}`).join(' + ')} = ${row.sum}`;
}
function compareText(row: SearchRow) {
  const c = row.rule.criterion;
  if (row.sum === null) return '합을 낼 수 없어요';
  return row.sum > c.sum ? `${row.sum}, 기준보다 ${row.sum - c.sum} 커요` : `${row.sum}, 기준 ${c.sum} 이내예요`;
}
const reasonText = (row: SearchRow) => row.judged.verdict === '근접' ? '한 영역이 1등급 오르면 기준 안이에요' : row.judged.verdict === '충족' ? '지금 등급으로 기준 안이에요' : row.judged.reason;

export function MinimumSearch({ load = loadMinimumSource, cuts = [...releasedCuts, ...sampleCutTables] }: { load?: () => Promise<MinimumSource>; cuts?: readonly CutTable[] }) {
  const sample = useSampleMode();
  const student = useStudent();
  const desktop = useDesktop();
  const [source, setSource] = useState<MinimumSource | null>(null), [loadError, setLoadError] = useState(''), [attempt, setAttempt] = useState(0);
  const [slots, setSlots] = useState<{ head: Element | null; bar: Element | null }>({ head: null, bar: null });
  useEffect(() => { setSlots({ head: desktop ? document.querySelector('.topbar__heading') : null, bar: desktop ? null : document.getElementById('appbar-actions') }); }, [desktop]);
  useEffect(() => {
    let live = true; setLoadError(''); setSource(null);
    load().then(s => { if (live) setSource(s); }, () => { if (live) setLoadError('수능 최저 기준을 읽지 못했어요. 인터넷 연결을 확인하고 다시 읽어 주세요.'); });
    return () => { live = false; };
  }, [load, attempt, sample]);

  const stored = student?.data?.mocks ?? [];
  // 성적 추이와 같아요: 샘플 모드에서만 9·10월 샘플 모의고사를 덧붙여 봐요(저장하지 않아요).
  const mocks = sample ? [...stored, ...sampleTrendMocks.filter(s => !stored.some(m => m.exam === s.exam))] : stored;
  const exam = examsByRecent(mocks.map(m => m.exam))[0] ?? '';
  const table = cuts.find(t => t.exam === exam && reviewed(t));
  const mock = mocks.find(m => m.exam === exam);
  const grades = mock && table ? gradesForMinimum(mock, table) : null;
  const month = exam.match(/(\d{1,2})월/)?.[1];
  const examName = month ? `${month}월 모의고사` : exam;
  const ready = !!source && source.rules.some(reviewed) && !!grades;

  const note = <p className="disclaimer-note mns-note"><Icon name="info" size={16} /><span>관리자가 검수한 수능 최저 기준만 판정했어요<span className="mns-desktop-only"> · 검수 전 기준은 판정하지 않아요</span> · 대학 모집요강이 최종 기준이에요 · 모의고사 등급으로 본 현황이라 실제 수능과 다를 수 있어요{sample ? ' · 샘플의 대학·숫자는 예시예요' : ''} · 데이터 기준일 {source?.asOf ?? dataAsOf}</span></p>;
  let body;
  if (!student || (!source && !loadError)) body = <p role="status" className="t-body-sm text-muted">검수된 수능 최저 기준을 읽고 있어요.</p>;
  else if (student.error || loadError) body = <div className="mns-error" role="alert"><p>{student.error || loadError}</p>{loadError && <ButtonOutline onClick={() => setAttempt(a => a + 1)}>다시 읽기</ButtonOutline>}</div>;
  else if (!exam) body = <div className="empty-state"><h3 className="t-heading-4">아직 넣은 모의고사 성적이 없어요</h3><p>모의고사 등급을 넣으면 검수된 수능 최저 기준과 맞춰 충족 현황을 보여 드려요</p><Link className="button-primary" to="/mock-score">성적 입력하기</Link></div>;
  else if (!source!.rules.some(reviewed)) body = <div className="empty-state"><h3 className="t-heading-4">검수된 수능 최저 기준이 아직 없어요</h3><p>관리자 검수가 끝난 기준부터 보여 드려요. 지금은 {source!.pending}개가 검수 전이에요 <span className="data-status-badge">준비 중</span></p><Link className="button-primary" to="/admissions-list">전형계획 보기</Link></div>;
  else if (!grades) body = <div className="mns-nocut"><span className="data-status-badge">등급컷 준비 중</span><p className="t-body-sm">이 시험의 예상 등급컷이 아직 검수되지 않았어요. 등급컷이 올라오면 충족 현황을 보여 드려요</p></div>;
  else body = <Results key={exam} source={source!} grades={grades} examName={examName} exam={exam} desktop={desktop} />;

  return <section className="student-screen minimum-search" data-slug="minimum-search" aria-label="최저로 찾기">
    {slots.head && ready && createPortal(<p className="t-body-lg mns-lead">{examName} 등급을 관리자가 검수한 수능 최저 기준에 맞춰 봤어요</p>, slots.head)}
    {ready && (desktop ? <ScreenActions><span className="data-status-badge mns-asof">모집요강 반영 · {source!.asOf}</span></ScreenActions>
      : slots.bar && createPortal(<span className="data-status-badge mns-asof">모집요강 반영</span>, slots.bar))}
    {body}
    {note}
  </section>;
}

function Results({ source, grades, examName, exam, desktop }: { source: MinimumSource; grades: NonNullable<ReturnType<typeof gradesForMinimum>>; examName: string; exam: string; desktop: boolean }) {
  const rows = useMemo(() => searchMinimum(source.rules, grades), [source, grades]);
  const whatIf = useMemo(() => whatIfMinimum(source.rules, grades), [source, grades]);
  // 390 시안은 충족 타일을 고른 상태, 1440 시안은 전체(타일 안 고름)로 열려요.
  const [tile, setTile] = useState<Verdict | null>(desktop ? null : '충족'), [area, setArea] = useState<Core | null>(null);
  const [filters, setFilters] = useState({ field: '', region: '', kind: '' }), [query, setQuery] = useState('');
  const [sheet, setSheet] = useState(false), [more, setMore] = useState(false), [reverse, setReverse] = useState(false);
  const [selected, setSelected] = useState(() => rows.find(r => r.judged.verdict === '근접')?.rule.id ?? rows[0]?.rule.id ?? '');
  const count = (v: Verdict) => rows.filter(r => r.judged.verdict === v).length;
  const options = (k: 'field' | 'region' | 'kind') => [...new Set(rows.map(r => r.rule[k]).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ko'));
  const pick = whatIf.find(w => w.area === area);
  const q = query.trim();
  const matched = rows.filter(r => (!filters.field || r.rule.field === filters.field) && (!filters.region || r.rule.region === filters.region) && (!filters.kind || r.rule.kind === filters.kind)
    && (!q || `${r.rule.university} ${r.rule.unit}`.includes(q)));
  const shown = matched.filter(r => pick ? pick.newly.includes(r.rule.id) : !tile || r.judged.verdict === tile);
  const ordered = reverse ? [...SEARCH_ORDER].reverse().flatMap(v => shown.filter(r => r.judged.verdict === v)) : shown;
  const preview = !tile && !pick && !q && !filters.field && !filters.region && !filters.kind;
  const tableRows = preview ? SEARCH_ORDER.flatMap(v => ordered.filter(r => r.judged.verdict === v).slice(0, PREVIEW[v] ?? 0)).sort((a, b) => ordered.indexOf(a) - ordered.indexOf(b)) : ordered;
  const listRows = more ? shown : shown.slice(0, MOBILE_ROWS);
  const active = rows.find(r => r.rule.id === selected);
  const myLine = CORE.map(a => `${SHORT[a]} ${shownGrade(grades, a) ?? '–'}`).join(' · ');
  const title = pick ? `${pick.area} 1등급 오르면 새로 충족 ${shown.length}개` : `${tile ?? '전체'} ${shown.length}개`;
  const sortText = pick || tile ? '대학 이름 순' : '판정 순 · 대학 이름 순';
  const filterCount = Object.values(filters).filter(Boolean).length;
  const chooseTile = (v: Verdict) => { setArea(null); setMore(false); setTile(tile === v ? null : v); };

  const hero = <div className="stat-tile mns-hero">
    <p className="mns-hero__caption">{desktop ? `${examName} 실채점 · ${myLine}` : `${examName} 실채점으로 보면`}</p>
    <p className="mns-hero__value num">충족 {count('충족')}개</p>
    <p className="mns-hero__sub num">{desktop ? `검수된 수능 최저 전형 ${rows.length}개 중이에요` : `${myLine} · 한국사 ${grades.grades.한국사 ?? '미입력'}`}</p>
  </div>;
  const tiles = <div className="mns-tiles" role="group" aria-label="판정으로 거르기">{SEARCH_ORDER.map(v =>
    <button key={v} type="button" className={`stat-tile mns-tile ${VERDICT_CLASS[v]}-text`} aria-pressed={!pick && tile === v} onClick={() => chooseTile(v)}>
      <span className="mns-tile__label">{MARK[v] && <span className={`mns-mark mns-mark--${MARK[v]}`} aria-hidden="true" />}{v}</span>
      <strong className="mns-tile__value num">{count(v)}개</strong><span className="mns-tile__note">{TILE_NOTE[v][desktop ? 0 : 1]}</span>
    </button>)}</div>;
  const pending = source.pending > 0 && <p className="mns-pending__text">검수 전이라 판정하지 않은 전형 {source.pending}개 <span className="data-status-badge mns-ready">준비 중</span></p>;

  const whatIfCard = <section aria-labelledby="mns-whatif" className="mns-card mns-whatif-card"><h3 id="mns-whatif" className="mns-card__title">한 영역만 1등급 오르면</h3>
    <ul className="mns-whatif">{whatIf.map(w => { const can = w.to !== undefined; return <li key={w.area}>
      <button type="button" disabled={!can} aria-pressed={area === w.area} onClick={() => { setTile(null); setMore(false); setArea(area === w.area ? null : w.area); }}
        aria-label={can ? `${josa(w.area, ['을', '를'])} ${w.from}등급에서 ${w.to}등급으로 바꾸면 충족 전형이 ${w.before}개에서 ${w.after}개로 ${w.after - w.before}개 늘어요` : w.from === 1 ? `${josa(w.area, ['은', '는'])} 이미 1등급이라 바꿔 볼 수 없어요` : `${w.area} 성적이 없어서 바꿔 볼 수 없어요`}>
        <span className="mns-whatif__area num">{w.area} {w.from ?? '–'} → {w.to ?? '–'}</span>
        {can ? <><span className="mns-whatif__count num">충족 {w.before} → {w.after}</span><strong className="mns-whatif__plus num">+{w.after - w.before}개</strong></> : <span className="mns-whatif__count text-muted">{w.from === 1 ? '이미 1등급이에요' : '성적이 없어요'}</span>}
      </button></li>; })}</ul>
    <p className="mns-caption">한 번에 한 영역만 바꿔 봐요 · 한 전형이 여러 영역에서 같이 셀 수 있어서 더하면 근접 수보다 커요</p>
  </section>;

  const trace = active && <details className="trace-accordion mns-trace" open={desktop || undefined} key={`${active.rule.id}-${desktop}`}>
    <summary><span>어떻게 계산했나요?</span><Icon name="chevron-down" size={20} /></summary>
    <ol className="mns-steps">
      <li><span>① 기준 출처</span><span>{active.rule.source} · 검수 완료</span></li>
      <li><span>② 기준</span><span className="num">{active.rule.criterion.count}개 {sumText(active.rule.criterion)}</span></li>
      <li><span>③ 판정에 쓴 등급</span><span className="num">{myLine}</span></li>
      <li><span>④ 고른 영역</span><span className="num">{pickedText(active)}</span></li>
      <li><span>⑤ 기준과 비교</span><span className="num">{compareText(active)}</span></li>
      <li><span>⑥ 판정 규칙</span><span>{RULE_NOTE[active.judged.verdict]}</span></li>
      <li className="mns-steps__final"><span>판정</span><span>{verdictText(active.judged.verdict)}</span></li>
    </ol>
    <p className="disclaimer-note mns-trace__note"><Icon name="info" size={16} /><span>수능 최저 기준은 대학 모집요강이 최종 기준이에요 · 데이터 기준일 {source.asOf}</span></p>
  </details>;

  const empty = !shown.length && <div className="empty-state mns-empty"><h4 className="t-heading-4">고른 조건에 맞는 전형이 없어요</h4><p>계열·지역·검색어를 넓히거나 다른 판정을 골라 보세요</p>
    <button type="button" className="button-primary" onClick={() => { setTile(null); setArea(null); setFilters({ field: '', region: '', kind: '' }); setQuery(''); }}>조건 초기화</button></div>;
  const pickNote = pick && <p className="mns-caption">{pick.area} {pick.from} → {pick.to}로 바꿔서 본 개수예요 · 지금 판정은 그대로예요 <button type="button" className="text-button" onClick={() => setArea(null)}>{pick.area} 1등급 오르면 끄기</button></p>;

  if (!desktop) return <>
    <div className="mns-summary">{hero}{tiles}<div className="mns-pending">{pending}</div></div>
    <section className="mns-results" aria-labelledby="mns-list">
      <div className="mns-results__head"><h3 id="mns-list" className="mns-results__title" aria-live="polite">{title}</h3><span className="mns-results__sort">{tile || pick ? '대학 이름 순' : '판정 순 · 대학 이름 순'}</span></div>
      {pickNote}
      {empty || <ul className="mns-list">{listRows.map(r => <li key={r.rule.id} className="mns-row">
        <UniversityLogo university={r.rule.university} />
        <div className="mns-row__text"><p className="mns-row__name">{r.rule.university}</p><p className="mns-row__line num">{r.rule.unit} · 내 합 {r.sum ?? '–'} / 기준 {r.rule.criterion.sum}</p></div>
        <Badge v={r.judged.verdict} /></li>)}</ul>}
      {!more && shown.length > MOBILE_ROWS && <button type="button" className="button-pill-soft mns-more" onClick={() => setMore(true)}>{tile ?? '전체'} 전형 {shown.length - MOBILE_ROWS}개 더 보기</button>}
    </section>
    {whatIfCard}
    {trace}
  </>;

  return <>
    <div className="mns-summary">{hero}{tiles}</div>
    <div className="mns-pending">{pending}<Link className="mns-change" to={`/mock-score?exam=${encodeURIComponent(exam)}`}>성적 바꾸기 ›</Link></div>
    <div className="mns-columns">
      <section className="mns-results" aria-labelledby="mns-list">
        <div className="mns-results__head"><h3 id="mns-list" className="mns-results__title" aria-live="polite">{title}</h3><span className="mns-results__sort">{sortText}</span>
          <label className="text-input mns-search"><Icon name="search" size={20} /><input type="search" aria-label="대학·학과 검색" placeholder="대학·학과 검색" value={query} onChange={e => setQuery(e.target.value)} /></label>
          <button type="button" className="button-pill-soft mns-filter" onClick={() => setSheet(true)}><Icon name="sliders-horizontal" size={20} />필터{filterCount ? ` ${filterCount}` : ''}</button></div>
        {pickNote}
        {empty || <table className="data-table mns-table"><thead><tr><th>대학 · 모집단위</th><th>전형</th><th>기준</th><th className="num">기준 합</th><th className="num">내 합</th>
          <th aria-sort={reverse ? 'descending' : 'ascending'}><button type="button" className="mns-sort" onClick={() => setReverse(!reverse)} aria-label={`판정 ${reverse ? '자료 부족부터' : '충족부터'} · 눌러서 순서 바꾸기`}>판정<Icon name="arrow-up-down" size={16} /></button></th><th>관심</th></tr></thead>
          <tbody>{tableRows.map(r => { const c = r.rule.criterion; return <tr key={r.rule.id} aria-selected={r.rule.id === selected}>
            <td><div className="mns-univ"><UniversityLogo university={r.rule.university} /><span><button type="button" className="mns-open" aria-pressed={r.rule.id === selected} onClick={() => setSelected(r.rule.id)}>{r.rule.university}</button><small>{r.rule.unit}</small></span></div></td>
            <td>{r.rule.admission}</td>
            <td>{c.history_max ? `${scopeText(c)} ${sumText(c)}` : <>{scopeText(c)}<br />{sumText(c)}</>}</td>
            <td className="num">{c.sum}</td><td className="num">{r.sum ?? '–'}</td>
            <td><Badge v={r.judged.verdict} /></td>
            <td><InterestButton compact university={r.rule.university} program={r.rule.admission} department={r.rule.unit} /></td></tr>; })}</tbody></table>}
      </section>
      <div className="mns-side">
        {whatIfCard}
        {active && <section className="mns-card mns-selected" aria-labelledby="mns-selected">
          <p className="mns-selected__label">고른 전형</p>
          <div className="mns-selected__head"><UniversityLogo university={active.rule.university} /><h3 id="mns-selected" className="mns-selected__name">{active.rule.university} {active.rule.unit}</h3>
            <InterestButton compact university={active.rule.university} program={active.rule.admission} department={active.rule.unit} /></div>
          <p className="mns-selected__meta num">{active.rule.admission} · 내 합 {active.sum ?? '–'} / 기준 {active.rule.criterion.sum}</p>
          <div className="mns-selected__judge"><Badge v={active.judged.verdict} /><span>{reasonText(active)}</span></div>
          {trace}
          <Link className="button-primary mns-board" to="/susiro">수시로에 담기</Link>
        </section>}
      </div>
    </div>
    {sheet && <Modal label="필터" onClose={() => setSheet(false)}>
      <div className="mns-sheet"><div className="mns-sheet__head"><h3 className="t-heading-4">필터</h3><button type="button" className="mns-sheet__close" aria-label="닫기" onClick={() => setSheet(false)}><Icon name="x" size={24} /></button></div>
        <div className="mns-conditions">{([['field', '계열'], ['region', '지역'], ['kind', '전형 유형']] as const).map(([k, label]) => <div className="mns-condition" role="group" aria-label={label} key={k}>
          <span className="mns-condition__label">{label}</span>
          <div className="mns-chips">{['', ...options(k)].map(o => <button key={o || 'all'} type="button" className="filter-chip" aria-pressed={filters[k] === o} onClick={() => setFilters({ ...filters, [k]: o })}>{o || '전체'}</button>)}</div></div>)}</div>
        <div className="mns-sheet__actions"><button type="button" className="button-outline" onClick={() => setFilters({ field: '', region: '', kind: '' })}>초기화</button><button type="button" className="button-primary" onClick={() => setSheet(false)}>결과 {matched.filter(r => !tile || r.judged.verdict === tile).length}개 보기</button></div></div>
    </Modal>}
  </>;
}
