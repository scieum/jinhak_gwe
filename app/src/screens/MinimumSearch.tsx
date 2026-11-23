import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ButtonOutline, ButtonPrimary } from '../components/Buttons';
import { InterestButton } from '../components/InterestButton';
import { SegmentedControl } from '../components/SegmentedControl';
import { loadAdmissionPlans } from '../data/admissionPlans';
import { cutTables as releasedCuts } from '../data/mock-exams';
import { reviewed } from '../engine/types';
import type { CutTable } from '../domain/mock';
import { CORE, SEARCH_ORDER, VERDICT_CLASS, describe, examsByRecent, gradesForMinimum, searchMinimum, shownGrade, verdictText, whatIfMinimum, type Core, type MinimumRule, type Verdict } from '../domain/minimum';
import { useStudent } from '../store/studentDb';
import '../styles/minimum-search.css';

export interface MinimumSource { rules: MinimumRule[]; pending: number; asOf: string }

/** 실제 자료: 전형계획(admission-plans.json)은 아직 draft라 검수된 기준이 0개예요. 최저 문구가 있는 전형은 "검수 전" 개수로만 세요(D1). */
// shortcut: 검수된 구조화 csat_minimum 자료가 없어 rules는 늘 빈 목록, 관리자 검수 자료가 배포되면 여기서 읽어요.
export async function loadMinimumSource(): Promise<MinimumSource> {
  const catalog = await loadAdmissionPlans();
  const pending = catalog.entries.flatMap(e => e.programs).filter(p => p.minimum.trim() && !p.minimum.includes('미적용')).length;
  return { rules: [], pending, asOf: catalog.checked_at };
}

const SHORT: Record<Core, string> = { 국어: '국', 수학: '수', 영어: '영', 탐구: '탐' };
const TILE_NOTE: Record<Verdict, string> = { 충족: '지금 등급으로 기준 안', 근접: '한 영역 1등급이면 기준 안', 미충족: '', '자료 부족': '내 성적에 없는 영역이 있어요', '판정 불가': '' };
/** 받침에 따라 을/를 · 은/는. */
const josa = (w: string, pair: [string, string]) => w + ((w.charCodeAt(w.length - 1) - 0xac00) % 28 ? pair[0] : pair[1]);
const Badge = ({ v }: { v: Verdict }) => <span className={`judge-badge ${VERDICT_CLASS[v]}`}>{verdictText(v)}</span>;
const NOTE = 'ⓘ 관리자가 검수한 수능 최저 기준만 판정했어요 · 검수 전 기준은 판정하지 않아요 · 대학 모집요강이 최종 기준이에요 · 모의고사 등급으로 본 충족 현황이라 실제 수능 결과와 다를 수 있어요';

export function MinimumSearch({ load = loadMinimumSource, cuts = releasedCuts }: { load?: () => Promise<MinimumSource>; cuts?: readonly CutTable[] }) {
  const student = useStudent();
  const [source, setSource] = useState<MinimumSource | null>(null), [loadError, setLoadError] = useState(''), [attempt, setAttempt] = useState(0);
  const [chosen, setExam] = useState('');
  useEffect(() => {
    let live = true; setLoadError(''); setSource(null);
    load().then(s => { if (live) setSource(s); }, () => { if (live) setLoadError('수능 최저 기준을 읽지 못했어요. 인터넷 연결을 확인하고 다시 읽어 주세요.'); });
    return () => { live = false; };
  }, [load, attempt]);

  const mocks = student?.data?.mocks ?? [];
  const exams = examsByRecent(mocks.map(m => m.exam)).slice(0, 4);
  const exam = exams.includes(chosen) ? chosen : exams[0] ?? '';
  const table = cuts.find(t => t.exam === exam && reviewed(t));
  const mock = mocks.find(m => m.exam === exam);
  const grades = mock && table ? gradesForMinimum(mock, table) : null;

  const segment = <SegmentedControl label="기준 성적" value={exam} onChange={setExam} options={exams.map(e => ({ value: e, label: e.replace(/^\d{4}년\s*/, '') }))} />;
  const note = <p className="disclaimer-note">{NOTE}{source ? ` · 데이터 기준일 ${source.asOf}` : ''}</p>;
  let body;
  if (!student || (!source && !loadError)) body = <p role="status" className="t-body-sm text-muted">검수된 수능 최저 기준을 읽고 있어요.</p>;
  else if (student.error || loadError) body = <div className="ms-error" role="alert"><p>{student.error || loadError}</p>{loadError && <ButtonOutline onClick={() => setAttempt(a => a + 1)}>다시 읽기</ButtonOutline>}</div>;
  else if (!exams.length) body = <div className="empty-state"><h3 className="t-heading-4">아직 넣은 모의고사 성적이 없어요</h3><p>모의고사 등급을 넣으면 검수된 수능 최저 기준과 맞춰 충족 현황을 보여 드려요</p><Link className="button-primary" to="/mock-score">성적 입력하기</Link></div>;
  else if (!source!.rules.some(reviewed)) body = <div className="empty-state"><h3 className="t-heading-4">검수된 수능 최저 기준이 아직 없어요</h3><p>관리자 검수가 끝난 기준부터 보여 드려요. 지금은 {source!.pending}개가 검수 전이에요 <span className="data-status-badge">준비 중</span></p><Link className="button-primary" to="/admissions-list">전형계획 보기</Link></div>;
  else if (!grades) body = <div className="ms-nocut"><span className="data-status-badge">등급컷 준비 중</span><p className="t-body-sm">이 시험의 예상 등급컷이 아직 검수되지 않았어요. 등급컷이 올라오면 충족 현황을 보여 드려요</p></div>;
  else body = <Results key={exam} source={source!} grades={grades} table={table!} exam={exam} />;

  return <section className="student-screen minimum-search" data-slug="minimum-search" aria-label="최저로 찾기">
    <div className="screen-heading"><h2 className="t-heading-1">최저로 찾기</h2></div>
    {exams.length > 0 && segment}
    {body}
    {note}
  </section>;
}

function Results({ source, grades, table, exam }: { source: MinimumSource; grades: NonNullable<ReturnType<typeof gradesForMinimum>>; table: CutTable; exam: string }) {
  const rows = useMemo(() => searchMinimum(source.rules, grades), [source, grades]);
  const whatIf = useMemo(() => whatIfMinimum(source.rules, grades), [source, grades]);
  const [tile, setTile] = useState<Verdict | null>(null), [area, setArea] = useState<Core | null>(null);
  const [field, setField] = useState(''), [region, setRegion] = useState(''), [kind, setKind] = useState(''), [query, setQuery] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const count = (v: Verdict) => rows.filter(r => r.judged.verdict === v).length;
  const options = (k: 'field' | 'region' | 'kind') => [...new Set(rows.map(r => r.rule[k]).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ko'));
  const pick = whatIf.find(w => w.area === area);
  const q = query.trim();
  const shown = rows.filter(r => (pick ? pick.newly.includes(r.rule.id) : !tile || r.judged.verdict === tile)
    && (!field || r.rule.field === field) && (!region || r.rule.region === region) && (!kind || r.rule.kind === kind)
    && (!q || `${r.rule.university} ${r.rule.unit}`.includes(q)));
  const reset = () => { setTile(null); setArea(null); setField(''); setRegion(''); setKind(''); setQuery(''); };
  const myLine = CORE.map(a => `${SHORT[a]} ${shownGrade(grades, a) ?? '–'}`).join(' · ') + ` · 한국사 ${grades.grades.한국사 ?? '–'}`;
  const title = pick ? `${pick.area} 1등급 오르면 새로 충족 ${shown.length}개` : `${tile ?? '전체'} ${shown.length}개`;

  return <>
    <div className="ms-grades"><p className="num t-body">{myLine}</p><Link className="t-link" to={`/mock-score?exam=${encodeURIComponent(exam)}`}>성적 바꾸기 ›</Link>
      <p className="t-caption text-muted">{exam} · 예상 등급 범위의 큰 숫자로 판정해요 · 탐구는 상위 1과목 · 등급컷 {table.version} ({table.as_of})</p></div>

    <section aria-labelledby="ms-status"><h3 id="ms-status" className="t-heading-4">충족 현황</h3>
      <div className="ms-tiles" role="group" aria-label="판정으로 거르기">{SEARCH_ORDER.map(v =>
        <button key={v} type="button" className={`stat-tile ms-tile ${VERDICT_CLASS[v]}-text`} aria-pressed={!pick && tile === v} onClick={() => { setArea(null); setTile(tile === v ? null : v); }}>
          <span className="t-caption">{v}</span><strong className="num">{verdictText(v).replace(v, '')}{count(v)}개</strong>{TILE_NOTE[v] && <span className="t-body-sm text-muted">{TILE_NOTE[v]}</span>}
        </button>)}</div>
      <p className="t-caption text-muted">검수된 수능 최저 전형 {rows.length}개 기준이에요</p>
      {source.pending > 0 && <p className="t-caption text-muted">검수 전이라 판정하지 않은 전형 {source.pending}개 <span className="data-status-badge">준비 중</span></p>}
    </section>

    <section aria-labelledby="ms-whatif" className="ms-card"><h3 id="ms-whatif" className="t-heading-4">한 영역만 1등급 오르면</h3>
      <ul className="ms-whatif">{whatIf.map(w => { const can = w.to !== undefined; return <li key={w.area}>
        <button type="button" disabled={!can} aria-pressed={area === w.area} onClick={() => { setTile(null); setArea(area === w.area ? null : w.area); }}
          aria-label={can ? `${josa(w.area, ['을', '를'])} ${w.from}등급에서 ${w.to}등급으로 바꾸면 충족 전형이 ${w.before}개에서 ${w.after}개로 ${w.after - w.before}개 늘어요` : w.from === 1 ? `${josa(w.area, ['은', '는'])} 이미 1등급이라 바꿔 볼 수 없어요` : `${w.area} 성적이 없어서 바꿔 볼 수 없어요`}>
          <span className="t-title">{w.area} {w.from ?? '–'} → {w.to ?? '–'}</span>
          {can ? <><span className="num">충족 {w.before} → {w.after}</span><strong className="num">+{w.after - w.before}개</strong></> : <span className="t-body-sm text-muted">{w.from === 1 ? '이미 1등급이에요' : '성적이 없어요'}</span>}
        </button></li>; })}</ul>
      <p className="t-caption text-muted">한 번에 한 영역만 바꿔 봐요 · 한 전형이 여러 영역에서 같이 셀 수 있어서 더하면 근접 수보다 커요</p>
    </section>

    <p className="t-caption ms-legend" aria-label="판정 범례"><Badge v="충족" /> 기준 안 · <Badge v="근접" /> 한 영역 1등급이면 기준 안 · <Badge v="미충족" /> · <Badge v="자료 부족" /></p>
    <div className="ms-filters">
      {pick && <button type="button" className="filter-chip" aria-pressed="true" onClick={() => setArea(null)}>{pick.area} 1등급 오르면 ✕<span className="sr-only"> 끄기</span></button>}
      <label>계열<select value={field} onChange={e => setField(e.target.value)}><option value="">전체</option>{options('field').map(o => <option key={o}>{o}</option>)}</select></label>
      <label>지역<select value={region} onChange={e => setRegion(e.target.value)}><option value="">전체</option>{options('region').map(o => <option key={o}>{o}</option>)}</select></label>
      <label>전형 유형<select value={kind} onChange={e => setKind(e.target.value)}><option value="">전체</option>{options('kind').map(o => <option key={o}>{o}</option>)}</select></label>
      <input type="search" aria-label="대학·학과 검색" placeholder="대학·학과 검색" value={query} onChange={e => setQuery(e.target.value)} />
    </div>

    <section aria-labelledby="ms-list"><div className="section-row"><h3 id="ms-list" className="t-title" aria-live="polite">{title}</h3><span className="t-caption text-muted">판정 순 · 대학 이름 순</span></div>
      {pick && <p className="t-caption text-muted">{pick.area} {pick.from} → {pick.to}로 바꿔서 본 개수예요 · 지금 판정은 그대로예요</p>}
      {!shown.length ? <div className="empty-state"><h4 className="t-heading-4">고른 조건에 맞는 전형이 없어요</h4><p>계열·지역·검색어를 넓히거나 다른 판정을 골라 보세요</p><ButtonPrimary onClick={reset}>조건 초기화</ButtonPrimary></div>
        : <ul className="ms-list">{shown.map(({ rule, judged, sum }) => { const expanded = open === rule.id; return <li key={rule.id} className="univ-card">
          <div className="ms-card-top"><span><Badge v={judged.verdict} />{pick && <span className="t-caption"> {pick.area} {pick.to}등급이면 → 충족</span>}</span>
            <InterestButton compact university={rule.university} program={rule.admission} department={rule.unit} /></div>
          <h4 className="t-heading-3">{rule.university}</h4>
          <p className="t-body-sm text-muted">{rule.unit} · {rule.admission}</p>
          <p className="t-body-sm">{describe(rule.criterion)}</p>
          <p className="num t-body-sm">기준 합 {rule.criterion.sum} · 내 합 {sum ?? '–'}</p>
          <p className="t-body-sm">{judged.reason}</p>
          <button type="button" className="text-button" aria-expanded={expanded} aria-controls={`trace-${rule.id}`} onClick={() => setOpen(expanded ? null : rule.id)}>어떻게 계산했나요?</button>
          {expanded && <ol id={`trace-${rule.id}`} className="trace-accordion">
            <li><span className="text-muted">기준 출처</span> {rule.source} · 관리자 검수 {rule.reviewed_at}</li>
            <li><span className="text-muted">기준</span> {describe(rule.criterion)}{rule.criterion.tamgu === 'best' ? ' (탐구 상위 1과목)' : ' (탐구 2과목 평균)'}</li>
            <li><span className="text-muted">판정에 쓴 등급</span> <span className="num">{exam}: {myLine}</span></li>
            <li><span className="text-muted">기준과 비교</span> <span className="num">내 합 {sum ?? '–'} / 기준 {rule.criterion.sum}</span></li>
            <li className="trace-result"><Badge v={judged.verdict} /> — {judged.reason}</li>
            <li className="disclaimer-note">수능 최저 기준은 대학 모집요강이 최종 기준이에요</li>
          </ol>}
        </li>; })}</ul>}
    </section>
  </>;
}
