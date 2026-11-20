import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Disclaimer, TraceAccordion } from '../components/CalculationDetails';
import { SegmentedControl } from '../components/SegmentedControl';
import { useStudent } from '../store/studentDb';
import { combinations, conversionFor, currentComparisonBasis, fiveToNineFor } from '../domain/results';
import type { MethodResult } from '../engine/fiveToNineTypes';
import { gradeSummary, validateGrade, type StudentBackup } from '../domain/student';
import { compareBasis } from '../domain/comparison';
import { ComparisonDetails } from '../components/ComparisonDetails';
import { pending } from '../engine/types';
import { scoreUniversity } from '../engine/scoring';
import { judgeRange } from '../engine/judgment';
import { judgmentRule } from '../data/conversion-rules';
import { admissionYear, programs, type ProgramData } from '../data/catalog';
import { useReleasedRules } from '../data/releasedRules';
import type { ScoringRule } from '../engine/scoring';
import { PlacementExplorer } from '../components/PlacementExplorer';
import { ScoreTrendContent } from '../components/ScoreTrendContent';
import { QuickGradeCalculator } from '../components/QuickGradeCalculator';

export function StudentDataScreen({ slug, title, children }: { slug: string; title: string; children: (data: StudentBackup) => ReactNode }) {
  const state = useStudent();
  return <section data-slug={slug} aria-label={title} className="student-screen"><div className="screen-heading"><h2 className="t-heading-1">{title}</h2><Link className="button-outline" to="/grade-input">성적 입력·수정</Link></div>
    {!state ? <p role="status">기기에 저장된 성적을 읽고 있어요.</p> : !state.data ? <p role="alert">{state.error}</p> : children(state.data)}
  </section>;
}
const displayRange = (min: number, max: number) => `${(Math.floor(min * 10 + 1e-9) / 10).toFixed(1)} ~ ${(Math.ceil(max * 10 - 1e-9) / 10).toFixed(1)}`;
export function FiveToNine() {
  const [tab, setTab] = useState<'quick' | 'mine'>('quick');
  return <section data-slug="five-to-nine" className="student-screen">
    <div className="screen-heading"><h2 className="t-heading-1">5 to 9</h2></div>
    <SegmentedControl label="5 to 9 보기" value={tab} onChange={setTab} options={[{ value: 'quick', label: '간편 등급 계산' }, { value: 'mine', label: '내 성적 분석' }]} />
    {tab === 'quick' ? <QuickGradeCalculator /> : <SavedGradeConversion />}
  </section>;
}
const methodText = (m: MethodResult) => m.status === 'ok' ? m.value.toFixed(3) : m.reason;
function SavedGradeConversion() {
  const [combo, setCombo] = useState('전 교과');
  const [placementOpen, setPlacementOpen] = useState(false);
  return <StudentDataScreen slug="five-to-nine-detail" title="내 성적 상세 분석">{data => {
    const r = fiveToNineFor(data.grades, combo), avg = gradeSummary(data.grades, combinations[combo] ?? undefined);
    const ok = r.min !== null && r.max !== null;
    return <><p className="text-muted">5등급 성적을 9등급 기준의 범위로 살펴봐요. 환산은 추정이며 방법별 근거를 함께 확인해 주세요.</p>
      <SegmentedControl label="반영 교과" value={combo} onChange={setCombo} options={Object.keys(combinations).map(value => ({ value, label: value }))} />
      <div className="stats"><div>내 5등급 평균 <strong>{avg.average?.toFixed(2) ?? '—'}</strong></div><div>산출 과목 <strong>{avg.ranked}개</strong></div></div>
      {!data.grades.length ? <EmptyGrades /> : !ok ? <div className="empty-state"><h3 className="t-heading-3">{r.a1.status === 'ok' ? '' : r.a1.reason}</h3><p>석차등급이 있는 과목을 입력하면 범위를 보여드려요.</p></div> : <>
        <div className="position-summary"><span>9등급 환산 범위</span><strong className="t-display num">{displayRange(r.min!, r.max!)}</strong><p>대표값 약 {r.representative!.toFixed(2)} · 신뢰도 {r.confidence}</p></div>
        <div className="range-ruler" role="img" aria-label={`1~9등급 중 내 위치 ${displayRange(r.min!, r.max!)}`}>{[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => <span key={n}>{n}</span>)}<div className="range-ruler__position" style={{ left: `${(r.min! - 1) / 8 * 100}%`, width: `${Math.max(0.3, (r.max! - r.min!) / 8 * 100)}%` }} /></div>
        <div className="table-scroll"><table className="data-table"><thead><tr><th>방법</th><th>환산값·상태</th></tr></thead><tbody><tr><th>A-1 평균 기반</th><td>{methodText(r.a1)}</td></tr><tr><th>A-2 과목 기반</th><td>{methodText(r.a2)}</td></tr><tr><th>A-3 분포비율 보정</th><td>{methodText(r.a3)}</td></tr><tr><th>B 교육청 실측표</th><td>{methodText(r.b)}</td></tr></tbody></table></div>
        <p>산출 {r.stats.rankedCount}과목 · 제외 {r.stats.excludedCount}과목</p>
      </>}<button type="button" className="button-outline" onClick={() => setPlacementOpen(true)}>작년 입결 기준 위치 보기</button>
      {placementOpen && <PlacementExplorer onClose={() => setPlacementOpen(false)} combination={combo} average={avg.average}
        range={ok ? { min: r.min!, max: r.max! } : undefined} inputBasis={currentComparisonBasis(data.grades, combinations[combo] ?? [...new Set(data.grades.filter(g => !validateGrade(g).length).map(g => g.subject_group))], ok)} />}
      <TraceAccordion trace={r.trace.map(t => ({ rule: t.rule ?? '', detail: t.note ? `${t.label} · ${t.note}` : t.label, value: typeof t.value === 'number' ? t.value : undefined }))} /><Disclaimer />
      <div className="toolbar"><Link className="button-outline" to="/univ-score">대학별 환산</Link><Link className="button-outline" to="/doelgak">될각 확인</Link></div></>;
  }}</StudentDataScreen>;
}
function EmptyGrades() { return <div className="empty-state"><h3 className="t-heading-3">아직 입력한 성적이 없어요</h3><p>성적 입력 화면에서 과목을 추가해 주세요.</p></div>; }

/** 관리자가 배포한 검수 완료 규칙(public/data/scoring-rules.json)을 대학별 환산에 더해요. 같은 대학·전형·연도는 카탈로그가 먼저예요. */
export function withReleasedRules(catalog: readonly ProgramData[], rules: readonly ScoringRule[]): ProgramData[] {
  const key = (u: string, p: string, y: number) => `${u}|${p}|${y}`, have = new Set(catalog.map(p => key(p.university, p.program, p.admission_year)));
  return [...catalog, ...rules.filter(r => !have.has(key(r.university, r.program, r.admission_year))).map((r): ProgramData => ({ id: `rule-${r.id}`, admission_year: r.admission_year, university: r.university, program: r.program, department: '',
    source: r.source, license_status: 'unknown', rule: r, cut: null, cut_subject_scope: [], cut_grade_system: 9, minimum_required: false }))];
}

export function UniversityScores() {
  const [sort, setSort] = useState('환산 비율');
  const released = useReleasedRules();
  return <StudentDataScreen slug="univ-score" title="대학별 환산">{data => {
    const rows = withReleasedRules(programs, released).filter(p => p.admission_year === admissionYear).map(p => ({ p, r: p.rule ? scoreUniversity(data.grades, data.attendance, p.rule) : null }));
    const readyRows = rows.flatMap(row => row.r?.status === 'ready' ? [{ id: row.p.id, ...row.r.value }] : []);
    const ratioSorted = [...readyRows].sort((a, b) => b.total / b.max - a.total / a.max);
    const avgSorted = [...readyRows].filter(r => r.average_rank !== null).sort((a, b) => a.average_rank! - b.average_rank!);
    rows.sort((a, b) => Number(b.r?.status === 'ready') - Number(a.r?.status === 'ready') || (sort === '대학 이름' ? a.p.university.localeCompare(b.p.university) : ratioSorted.findIndex(r => r.id === a.p.id) - ratioSorted.findIndex(r => r.id === b.p.id)));
    return <><p className="text-muted">{admissionYear}학년도 · 대학별 규칙으로 교과와 출결을 계산해요.</p><div className="stats"><div>등록 전형 <strong>{rows.length}</strong></div><div>계산 완료 <strong>{readyRows.length}</strong></div><div>준비 중 <strong>{rows.length - readyRows.length}</strong></div></div>
      <SegmentedControl label="대학 정렬" value={sort} onChange={setSort} options={['환산 비율', '대학 이름'].map(value => ({ value, label: value }))} />
      {!data.grades.length && <EmptyGrades />}{!rows.length && <div className="empty-state"><h3 className="t-heading-3">검수된 대학별 규칙을 준비하고 있어요</h3><p>대학 공식 자료와 대조한 규칙부터 공개해요. 등록되지 않은 대학은 임의로 계산하지 않아요.</p></div>}
      {rows.map(({ p, r }) => <article className="univ-card" key={p.id}><h3 className="t-heading-3">{p.university}</h3><p>{[p.program, p.department].filter(Boolean).join(' · ')}</p>{r?.status === 'ready' ? <><div className="stats"><div>교과 <strong>{r.value.grade.toFixed(2)}</strong></div><div>출결 <strong>{r.value.attendance.toFixed(2)}</strong></div><div>합계 <strong>{r.value.total.toFixed(p.rule!.rounding.digits)} / {r.value.max}</strong></div></div>
        <p>만점 대비 {(r.value.total / r.value.max * 100).toFixed(2)}%{r.value.average_rank !== null && ` · 반영 교과 평균 ${r.value.average_rank.toFixed(2)}`}</p>
        {avgSorted.some(a => a.id === p.id) && <p>반영 교과 평균 기준 {avgSorted.findIndex(a => a.id === p.id) + 1}위 → 만점 대비 환산 기준 {ratioSorted.findIndex(a => a.id === p.id) + 1}위</p>}
        {r.value.attendance_deduction > 0 && <p className="notice">출결 감점 {r.value.attendance_deduction}점이 있어요.</p>}</> : <p className="notice">{r?.reason ?? '환산 규칙 준비 중'}</p>}
        <TraceAccordion trace={r?.trace ?? []} />{p.source.startsWith('https://') && <a className="text-button" href={p.source} target="_blank" rel="noreferrer">공식 원문 보기 ↗</a>}</article>)}
      <p className="t-caption text-muted">환산 순위는 대학 만점 대비 점수 비율을 비교한 순서예요. 대학 선호도나 지원 결과를 뜻하지 않아요.</p><Disclaimer /></>;
  }}</StudentDataScreen>;
}

const judgmentClass = { 안정: 'safe', 적정: 'fit', 소신: 'reach', 위험: 'risk' };
const judgmentIcon = { 안정: '●', 적정: '◆', 소신: '▲', 위험: '■' };
export function Doelgak() {
  const [combo, setCombo] = useState('국수영사과');
  const [filter, setFilter] = useState('전체');
  return <StudentDataScreen slug="doelgak" title="될각 · 교과전형">{data => {
    const conversion = conversionFor(data.grades, combo);
    const scope = combinations[combo] ?? [...new Set(data.grades.filter(g => !validateGrade(g).length).map(g => g.subject_group))];
    const inputBasis = currentComparisonBasis(data.grades, scope, conversion.status === 'ready');
    const rows = programs.filter(p => p.admission_year === admissionYear).map(p => ({ p,
      r: conversion.status !== 'ready' ? null : !compareBasis(inputBasis, p.cut_basis).comparable
        ? pending(compareBasis(inputBasis, p.cut_basis).reasons.join(' '))
        : p.cut_grade_system !== inputBasis.grade_system ? pending('등급제 확인이 필요해요.') : p.cut_subject_scope.length !== scope.length || !scope.every(g => p.cut_subject_scope.includes(g))
        ? pending('같은 반영 교과 기준의 입결 자료가 필요해요.')
        : judgeRange(conversion.value, p.license_status === 'allowed' ? p.cut : null, judgmentRule) }));
    return <><p className="text-muted">환산 범위의 불리한 쪽을 기준으로 입결과 비교해요. 수능최저와 충원율은 따로 확인해 주세요.</p>
      <section className="filter-panel" aria-label="판정 조회 조건"><SegmentedControl label="판정 반영 교과" value={combo} onChange={setCombo} options={Object.keys(combinations).map(value => ({ value, label: value }))} />
      <SegmentedControl label="판정 필터" value={filter} onChange={setFilter} options={['전체', '안정', '적정', '소신', '위험'].map(value => ({ value, label: value }))} /></section>
      {conversion.status !== 'ready' && <p className="notice">{data.grades.length ? conversion.reason : '성적을 입력하면 검수된 기준으로 비교할 수 있어요.'}</p>}
      {!rows.length && <div className="empty-state"><h3 className="t-heading-3">검수된 입결 자료를 준비하고 있어요</h3><p>입결과 판정 기준이 모두 준비된 전형만 판정해요.</p></div>}
      {rows.filter(({ r }) => filter === '전체' || (r?.status === 'ready' && r.value.label === filter)).map(({ p, r }) => <article className="univ-card" key={p.id}><h3 className="t-heading-3">{p.university} · {p.department}</h3><p>{p.program}</p>
        {r?.status === 'ready' ? <><span className={`judge-badge judge-${judgmentClass[r.value.label]}`}>{judgmentIcon[r.value.label]} {r.value.label}</span>{r.value.boundary && <p>경계 · 유리한 쪽 기준 {r.value.favorable_label}</p>}</> : <span className="judge-badge judge-none">— {r?.reason ?? '환산 결과 준비 중'}</span>}
        <p>{p.minimum_required ? '수능최저 확인 필요' : '수능최저 없음'}{p.fill_rate !== undefined && ` · 충원율 ${p.fill_rate}%`}</p><ComparisonDetails input={inputBasis} cut={p.cut_basis} /><TraceAccordion trace={r?.trace ?? []} /></article>)}
      <TraceAccordion trace={conversion.trace} /><Disclaimer /></>;
  }}</StudentDataScreen>;
}

export function StudentHome() {
  return <StudentDataScreen slug="home" title="나의 진학 내비">{data => {
    const all = gradeSummary(data.grades), main = gradeSummary(data.grades, ['국어', '수학', '영어', '사회', '과학']);
    return <><p className="text-muted">{admissionYear}학년도 진학 준비 · 내 성적부터 차근차근 확인해요.</p><div className="stats"><div>입력 과목 <strong>{data.grades.length}</strong></div><div>전 교과 평균 <strong>{all.average?.toFixed(2) ?? '—'}</strong></div><div>국수영사과 평균 <strong>{main.average?.toFixed(2) ?? '—'}</strong></div></div>
      {!data.grades.length && <EmptyGrades />}<div className="quick-links">{[['성적 입력', 'grade-input'], ['5 to 9', 'five-to-nine'], ['대학별 환산', 'univ-score'], ['될각', 'doelgak'], ['원서·서류 체크리스트', 'application-checklist'], ['상담 질문·할 일', 'counsel-tasks'], ['지원 자격 확인표', 'eligibility-check'], ['입결 비교 조건', 'admission-results']].map(([label, path], i) => <Link className="univ-card" key={path} to={`/${path}`}><span className="text-muted">0{i + 1}</span><h3 className="t-heading-3">{label} →</h3></Link>)}</div><Disclaimer /></>;
  }}</StudentDataScreen>;
}

export function ScoreTrend() {
  return <StudentDataScreen slug="score-trend" title="성적 추이">{data => <ScoreTrendContent data={data} />}</StudentDataScreen>;
}
