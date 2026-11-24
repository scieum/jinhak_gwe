import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Link, useSearchParams } from 'react-router-dom';
import { TraceAccordion } from '../components/CalculationDetails';
import { SegmentedControl } from '../components/SegmentedControl';
import { useStudent } from '../store/studentDb';
import { combinations, currentComparisonBasis, fiveToNineFor } from '../domain/results';
import type { MethodResult } from '../engine/fiveToNineTypes';
import { gradeSummary, validateGrade, type StudentBackup } from '../domain/student';
import type { ProgramData } from '../data/catalog';
import type { ScoringRule } from '../engine/scoring';
import { PlacementExplorer } from '../components/PlacementExplorer';
import { ScoreTrendContent } from '../components/ScoreTrendContent';
import { QuickGradeCalculator } from '../components/QuickGradeCalculator';
import { HomeDashboard } from '../components/HomeDashboard';
import { GradeRange } from '../components/GradeRange';
import { ScreenActions } from '../components/ScreenActions';
import { Icon } from '../components/Icon';
import { dataAsOf } from '../data/catalog';
import '../styles/five-to-nine.css';

export function StudentDataScreen({ slug, title, children, actions, className = '' }: { slug: string; title: string; children: (data: StudentBackup) => ReactNode; actions?: ReactNode; className?: string }) {
  const state = useStudent();
  return <section data-slug={slug} aria-label={title} className={`student-screen ${className}`.trim()}><div className="screen-heading"><h2 className="t-heading-1">{title}</h2><ScreenActions>{actions ?? <Link className="button-outline" to="/grade-input">성적 입력·수정</Link>}</ScreenActions></div>
    {!state ? <p role="status">기기에 저장된 성적을 읽고 있어요.</p> : !state.data ? <p role="alert">{state.error}</p> : children(state.data)}
  </section>;
}
const methodValue = (m: MethodResult) => m.status === 'ok' ? `약 ${(Math.round(m.value * 10) / 10).toFixed(1)}` : '준비 중';
const METHODS = [['a1', 'A-1 평균 기반'], ['a2', 'A-2 과목 기반 · 수강자수 보정'], ['a3', 'A-3 분포비율 보정'], ['b', 'B 교육청 실측표']] as const;
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
// v2 시안 five-to-nine/390 · 1440(346:131226 · 346:131252): 기본 보기 = 내 성적 분석
export function FiveToNine() {
  const [query, setQuery] = useSearchParams();
  const tab = query.get('view') === 'quick' ? 'quick' : 'mine';
  const desktop = useDesktop();
  const [head, setHead] = useState<Element | null>(null);
  useEffect(() => { setHead(desktop ? document.querySelector('.topbar__heading') : null); }, [desktop]);
  const viewTabs = <SegmentedControl label="5 to 9 보기" value={tab} onChange={value => { const next = new URLSearchParams(query); next.set('view', value); setQuery(next); }} options={[{ value: 'quick', label: '간편 등급 계산' }, { value: 'mine', label: '내 성적 분석' }]} />;
  return <section data-slug="five-to-nine" className="student-screen f2n" aria-label="5 to 9">
    {head && createPortal(<p className="t-body-lg f2n-lead">5등급 내신을 9등급으로 옮긴 추정 범위예요. 한 숫자가 아니라 범위로 봐요</p>, head)}
    {desktop && <ScreenActions><span className="data-status-badge f2n-asof">데이터 기준일 {dataAsOf}</span></ScreenActions>}
    {tab === 'quick' ? <>{viewTabs}<QuickGradeCalculator /></> : <SavedGradeConversion viewTabs={viewTabs} desktop={desktop} />}
  </section>;
}
const NOTE = `5 to 9 환산은 공식 환산표가 아닌 추정 범위예요 · 교육청 실측표는 한 지역 학생 표본으로 만든 표예요 · 내 5등급 평균은 입력한 성적으로 계산했어요 · 대학 공식 자료가 최종 기준이에요 · 데이터 기준일 ${dataAsOf}`;
function SavedGradeConversion({ viewTabs, desktop }: { viewTabs: ReactNode; desktop: boolean }) {
  const state = useStudent();
  const [combo, setCombo] = useState('전 교과');
  const [placementOpen, setPlacementOpen] = useState(false);
  const data = state?.data;
  const r = data ? fiveToNineFor(data.grades, combo) : null, avg = data ? gradeSummary(data.grades, combinations[combo] ?? undefined) : null;
  const ok = !!r && r.min !== null && r.max !== null && r.display !== null;
  const two = (v: number) => v.toFixed(2), one = (v: number) => (Math.round(v * 10) / 10).toFixed(1);
  const comboTabs = <SegmentedControl label="반영 교과" value={combo} onChange={setCombo} options={Object.keys(combinations).map(value => ({ value, label: value }))} />;
  const entry = <div className="f2n-entry"><button type="button" className="button-outline" onClick={() => setPlacementOpen(true)}><Icon name="chart-column" size={20} />이 등급대 입결 보기</button>
    <p className={desktop ? 't-body-sm text-muted' : 't-caption text-muted'}>작년 입결 70% 컷 기준으로 내 위치 주변 학과를 배치표 · 표 · 점 그래프로 보여줘요</p></div>;
  const note = <p className="disclaimer-note t-caption text-muted f2n-note">{NOTE}</p>;
  const placement = placementOpen && data && <PlacementExplorer onClose={() => setPlacementOpen(false)} combination={combo} average={avg!.average}
    range={ok ? { min: r!.min!, max: r!.max! } : undefined} inputBasis={currentComparisonBasis(data.grades, combinations[combo] ?? [...new Set(data.grades.filter(g => !validateGrade(g).length).map(g => g.subject_group))], ok)} />;
  if (!state) return <>{viewTabs}<p role="status" className="t-body-sm text-muted f2n-status">기기에 저장된 성적을 읽고 있어요.</p></>;
  if (!data) return <>{viewTabs}<div className="f2n-card f2n-error" role="alert"><Icon name="triangle-alert" size={20} /><p>{state.error}</p><button type="button" className="button-outline" onClick={() => window.location.reload()}>다시 열기</button></div></>;
  if (!ok) {
    const none = !data.grades.length;
    return <div className="f2n-layout"><div className="f2n-main">{viewTabs}{comboTabs}
      <div className="empty-state"><Icon name="chart-column" size={48} /><h3 className="t-heading-4">{none ? '아직 입력한 성적이 없어요' : '석차등급이 있는 과목이 없어요'}</h3>
        <p>{none ? '성적 입력 화면에서 과목을 추가해 주세요.' : '석차등급이 있는 과목을 입력하면 범위를 보여드려요.'}</p><Link className="button-primary" to="/grade-input">성적 입력하기</Link></div>
      {entry}</div>
      {desktop && <aside className="f2n-aside" aria-label="환산 신뢰도와 근거"><section className="f2n-card"><h3 className="t-heading-4">신뢰도 · —</h3><p className="t-body-sm text-muted">성적을 입력하면 신뢰도와 계산 과정을 보여드려요.</p></section><TraceAccordion trace={[]} /></aside>}
      {note}{placement}</div>;
  }
  const res = r!, conf = res.confidence, okCount = [res.a1, res.a2, res.b].filter(m => m.status === 'ok').length;
  const g5 = res.g5 === null ? '—' : two(res.g5);
  const diff = res.a1.status === 'ok' && res.b.status === 'ok' ? res.a1.value - res.b.value : null;
  const diffText = diff === null ? '' : `약 ${two(Math.abs(diff))}등급 ${diff >= 0 ? '높게(불리하게)' : '낮게(유리하게)'}`;
  const tile = <div className="stat-tile f2n-tile"><span className="t-caption text-muted">내 환산 9등급 (추정)</span><strong className="t-display num f2n-range">약 {res.display!.min.toFixed(1)}~{res.display!.max.toFixed(1)}</strong>
    {!desktop && <p className="num">5등급 평균 {g5} → 대표값 약 {two(res.representative!)} · 신뢰도 {conf}</p>}</div>;
  const rangeCard = <section className="f2n-card" aria-label="5 to 9 내 위치"><h3 className="t-title">5 to 9 내 위치</h3>
    <GradeRange min={res.min!} max={res.max!} representative={res.representative ?? undefined} digits={2} />
    <span className="data-status-badge">신뢰도 {conf}</span>{entry}</section>;
  const input = (k: string) => k === 'a2' ? '과목별 등급·학점·수강자수' : k === 'a3' ? '원점수·성취도별\n분포비율 (검수 전)' : `학점 가중\n5등급 평균 ${g5}`;
  const bSource = res.bTable?.source ?? (res.b.status === 'ok' ? '교육청 실측표' : res.b.reason);
  const source = (k: string) => k === 'b' ? bSource : k === 'a3' && res.a3.status !== 'ok' ? 'U:NAVI 계산식\n· 검수 전' : 'U:NAVI 계산식';
  const reason = (k: string) => k === 'a1' ? `학점 가중 5등급 평균 ${g5}을 누적비로 바꿨어요` : k === 'a2' ? '과목별 등급 구간에 수강자수를 보정한 학점 가중 평균'
    : k === 'a3' ? `원점수·성취도별 분포비율${res.a3.status === 'ok' ? '' : ' · 검수 전이라 범위에서 제외'}` : bSource;
  const explain = desktop
    ? [diff !== null && `A-1은 앱 공식이라 교육청 실측표보다 ${diffText} 나와요.`, '등급은 숫자가 작을수록 상위예요.', res.a3.status !== 'ok' && 'A-3은 준비 중이라 범위에 넣지 않았어요.'].filter(Boolean).join(' ')
    : [diff !== null && `A-1은 교육청 실측표보다 ${diffText} 나와요`, '등급은 숫자가 작을수록 상위예요', '세 방법 모두 추정이라 범위로 봐 주세요'].filter(Boolean).join(' · ');
  const methodCard = <section className="f2n-card" aria-label={desktop ? '방법 비교' : '방법별 환산값'}><h3 className="t-heading-4">{desktop ? '방법 비교' : '방법별 환산값'}</h3>
    {desktop ? <table className="data-table f2n-methods"><thead><tr><th scope="col">기준</th>{METHODS.map(([k, l]) => <th scope="col" key={k}>{l}</th>)}</tr></thead>
      <tbody><tr><th scope="row">환산 9등급</th>{METHODS.map(([k]) => <td key={k} className="num f2n-value">{methodValue(res[k])}</td>)}</tr>
        <tr><th scope="row">사용한 입력</th>{METHODS.map(([k]) => <td key={k}>{input(k)}</td>)}</tr>
        <tr><th scope="row">출처·연도·표본</th>{METHODS.map(([k]) => <td key={k}>{source(k)}</td>)}</tr></tbody></table>
      : <table className="data-table f2n-methods"><thead><tr><th scope="col">방법</th><th scope="col">환산 9등급</th></tr></thead>
        <tbody>{METHODS.map(([k, l]) => <tr key={k}><th scope="row">{l}<span className="t-caption text-muted">{reason(k)}</span></th><td className="num f2n-value">{methodValue(res[k])}</td></tr>)}</tbody></table>}
    <p className="t-body-sm text-muted">{explain}</p></section>;
  // 제목의 신뢰도 값(높음·보통·낮음)은 데이터예요. 시안 예시는 "보통"
  const reasonCard = <section className="f2n-card" aria-label="신뢰도 근거"><h3 className="t-heading-4">신뢰도 {conf}인 이유</h3>
    <table className="data-table f2n-reasons"><tbody><tr><th scope="row">석차등급 산출 과목</th><td className="num">{res.stats.rankedCount}개</td></tr>
      <tr><th scope="row">소수 수강 과목</th><td className="num">{Math.round(res.stats.smallRatio * 100)}%</td></tr>
      <tr><th scope="row">방법 간 차이</th><td className="num">{res.spread === null ? '—' : `${one(res.spread)}등급`}</td></tr></tbody></table></section>;
  const trace = <TraceAccordion key={String(desktop)} open={desktop} trace={res.trace.map(t => ({ rule: t.rule ?? '', detail: t.note ? `${t.label} · ${t.note}` : t.label, value: typeof t.value === 'number' ? t.value : undefined }))}
    note={`${res.a3.status === 'ok' ? '' : 'A-3 분포비율 보정은 검수 전이라 계산하지 않았어요 · '}중간 단계는 반올림하지 않아요 · 대학 공식 자료가 최종 기준이에요`} />;
  return desktop
    ? <div className="f2n-layout"><div className="f2n-main">{viewTabs}{comboTabs}{tile}<p className="num f2n-summary">방법 {okCount}가지로 본 범위 · 신뢰도 {conf} · 석차등급 산출 과목 {res.stats.rankedCount}개</p>{rangeCard}{methodCard}</div>
      <aside className="f2n-aside" aria-label="환산 신뢰도와 근거">{reasonCard}{trace}</aside>{note}{placement}</div>
    : <div className="f2n-layout">{viewTabs}{tile}{comboTabs}{rangeCard}{methodCard}<aside className="f2n-aside" aria-label="환산 신뢰도와 근거">{reasonCard}{trace}</aside>{note}{placement}</div>;
}

/** 관리자가 배포한 검수 완료 규칙(public/data/scoring-rules.json)을 대학별 환산에 더해요. 같은 대학·전형·연도는 카탈로그가 먼저예요. */
export function withReleasedRules(catalog: readonly ProgramData[], rules: readonly ScoringRule[]): ProgramData[] {
  const key = (u: string, p: string, y: number) => `${u}|${p}|${y}`, have = new Set(catalog.map(p => key(p.university, p.program, p.admission_year)));
  return [...catalog, ...rules.filter(r => !have.has(key(r.university, r.program, r.admission_year))).map((r): ProgramData => ({ id: `rule-${r.id}`, admission_year: r.admission_year, university: r.university, program: r.program, department: '',
    source: r.source, license_status: 'unknown', rule: r, cut: null, cut_subject_scope: [], cut_grade_system: 9, minimum_required: false }))];
}

export function StudentHome() {
  return <HomeDashboard />;
}

export function ScoreTrend() {
  return <StudentDataScreen slug="score-trend" title="성적 추이">{data => <ScoreTrendContent data={data} />}</StudentDataScreen>;
}
