import { useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Disclaimer, TraceAccordion } from '../components/CalculationDetails';
import { SegmentedControl } from '../components/SegmentedControl';
import { useStudent } from '../store/studentDb';
import { combinations, currentComparisonBasis, fiveToNineFor } from '../domain/results';
import type { MethodResult } from '../engine/fiveToNineTypes';
import { gradeSummary, validateGrade, type StudentBackup } from '../domain/student';
import { scoreUniversity } from '../engine/scoring';
import { admissionYear, programs, type ProgramData } from '../data/catalog';
import { useReleasedRules } from '../data/releasedRules';
import type { ScoringRule } from '../engine/scoring';
import { PlacementExplorer } from '../components/PlacementExplorer';
import { ScoreTrendContent } from '../components/ScoreTrendContent';
import { QuickGradeCalculator } from '../components/QuickGradeCalculator';
import { HomeDashboard } from '../components/HomeDashboard';
import { GradeRange } from '../components/GradeRange';
import { UniversityLogo } from '../components/UniversityLogo';
import { ScreenActions } from '../components/ScreenActions';

export function StudentDataScreen({ slug, title, children, actions, className = '' }: { slug: string; title: string; children: (data: StudentBackup) => ReactNode; actions?: ReactNode; className?: string }) {
  const state = useStudent();
  return <section data-slug={slug} aria-label={title} className={`student-screen ${className}`.trim()}><div className="screen-heading"><h2 className="t-heading-1">{title}</h2><ScreenActions>{actions ?? <Link className="button-outline" to="/grade-input">성적 입력·수정</Link>}</ScreenActions></div>
    {!state ? <p role="status">기기에 저장된 성적을 읽고 있어요.</p> : !state.data ? <p role="alert">{state.error}</p> : children(state.data)}
  </section>;
}
const displayRange = (min: number, max: number) => `${(Math.floor(min * 10 + 1e-9) / 10).toFixed(1)} ~ ${(Math.ceil(max * 10 - 1e-9) / 10).toFixed(1)}`;
export function FiveToNine() {
  const [query, setQuery] = useSearchParams();
  const tab = query.get('view') === 'mine' ? 'mine' : 'quick';
  return <section data-slug="five-to-nine" className="student-screen">
    <div className="screen-heading"><h2 className="t-heading-1">5 to 9</h2></div>
    <SegmentedControl label="5 to 9 보기" value={tab} onChange={value => { const next = new URLSearchParams(query); next.set('view', value); setQuery(next); }} options={[{ value: 'quick', label: '간편 등급 계산' }, { value: 'mine', label: '내 성적 분석' }]} />
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
    return <div className="analysis-layout"><div className="analysis-main"><p className="text-muted">5등급 성적을 9등급 기준의 범위로 살펴봐요. 환산은 추정이며 방법별 근거를 함께 확인해 주세요.</p>
      <SegmentedControl label="반영 교과" value={combo} onChange={setCombo} options={Object.keys(combinations).map(value => ({ value, label: value }))} />
      {!data.grades.length ? <EmptyGrades /> : !ok ? <div className="empty-state"><h3 className="t-heading-3">{r.a1.status === 'ok' ? '' : r.a1.reason}</h3><p>석차등급이 있는 과목을 입력하면 범위를 보여드려요.</p></div> : <>
        <div className="conversion-overview"><div><span>내 5등급 평균</span><strong className="t-display num">{avg.average?.toFixed(2) ?? '—'}</strong></div><span aria-hidden="true">→</span><div><span>9등급 환산 범위</span><strong className="t-display num">{displayRange(r.min!, r.max!)}</strong></div></div><p className="t-body-sm text-muted">대표값 약 {r.representative!.toFixed(2)} · 방법별 차이를 범위로 표시해요.</p>
        <GradeRange min={r.min!} max={r.max!} representative={r.representative ?? undefined} />
        <section><h3 className="t-heading-3">방법별 비교</h3><div className="table-scroll"><table className="data-table conversion-methods"><thead><tr><th>방법</th><th>환산값·상태</th></tr></thead><tbody><tr><th>A-1 평균 기반</th><td>{methodText(r.a1)}</td></tr><tr><th>A-2 과목 기반</th><td>{methodText(r.a2)}</td></tr><tr><th>A-3 분포비율 보정</th><td>{methodText(r.a3)}</td></tr><tr><th>B 교육청 실측표</th><td>{methodText(r.b)}</td></tr></tbody></table></div></section>
        <p>산출 {r.stats.rankedCount}과목 · 제외 {r.stats.excludedCount}과목</p>
      </>}<button type="button" className="button-outline" onClick={() => setPlacementOpen(true)}>작년 입결 기준 위치 보기</button>
      {placementOpen && <PlacementExplorer onClose={() => setPlacementOpen(false)} combination={combo} average={avg.average}
        range={ok ? { min: r.min!, max: r.max! } : undefined} inputBasis={currentComparisonBasis(data.grades, combinations[combo] ?? [...new Set(data.grades.filter(g => !validateGrade(g).length).map(g => g.subject_group))], ok)} />}
      <Disclaimer /><div className="toolbar"><Link className="button-outline" to="/univ-score">대학별 환산</Link><Link className="button-outline" to="/doelgak">될각 확인</Link></div>
      </div><aside className="analysis-aside" aria-label="환산 신뢰도와 근거"><h3 className="t-heading-3">신뢰도 · {r.confidence}</h3><dl className="analysis-facts"><div><dt>산출 과목</dt><dd>{r.stats.rankedCount}개</dd></div><div><dt>제외 과목</dt><dd>{r.stats.excludedCount}개</dd></div><div><dt>방법 간 차이</dt><dd>{r.spread === null ? '—' : `${r.spread.toFixed(3)}등급`}</dd></div><div><dt>소인수·미산출 과목 비율</dt><dd>{Math.round(r.stats.smallRatio * 100)}%</dd></div></dl><p className="t-caption text-muted">신뢰도는 환산에 사용한 자료의 구성과 방법 간 차이를 나타내요.</p>
      <TraceAccordion trace={r.trace.map(t => ({ rule: t.rule ?? '', detail: t.note ? `${t.label} · ${t.note}` : t.label, value: typeof t.value === 'number' ? t.value : undefined }))} /></aside></div>;
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
  const [selected, setSelected] = useState('');
  const released = useReleasedRules();
  return <StudentDataScreen slug="univ-score" title="대학별 환산">{data => {
    const rows = withReleasedRules(programs, released).filter(p => p.admission_year === admissionYear).map(p => ({ p, r: p.rule ? scoreUniversity(data.grades, data.attendance, p.rule) : null }));
    const readyRows = rows.flatMap(row => row.r?.status === 'ready' ? [{ id: row.p.id, ...row.r.value }] : []);
    const ratioSorted = [...readyRows].sort((a, b) => b.total / b.max - a.total / a.max);
    const avgSorted = [...readyRows].filter(r => r.average_rank !== null).sort((a, b) => a.average_rank! - b.average_rank!);
    rows.sort((a, b) => Number(b.r?.status === 'ready') - Number(a.r?.status === 'ready') || (sort === '대학 이름' ? a.p.university.localeCompare(b.p.university) : ratioSorted.findIndex(r => r.id === a.p.id) - ratioSorted.findIndex(r => r.id === b.p.id)));
    const active = rows.find(row => row.p.id === selected) ?? rows[0];
    return <div className="analysis-layout"><div className="analysis-main"><p className="text-muted">{admissionYear}학년도 · 대학별 규칙으로 교과와 출결을 계산해요.</p><div className="analysis-stat-tiles"><div><span>등록 전형</span><strong>{rows.length}</strong></div><div><span>계산 완료</span><strong>{readyRows.length}</strong></div><div><span>준비 중</span><strong>{rows.length - readyRows.length}</strong></div></div>
      <SegmentedControl label="대학 정렬" value={sort} onChange={setSort} options={['환산 비율', '대학 이름'].map(value => ({ value, label: value }))} />
      {!data.grades.length && <EmptyGrades />}{!rows.length && <div className="empty-state"><h3 className="t-heading-3">검수된 대학별 규칙을 준비하고 있어요</h3><p>대학 공식 자료와 대조한 규칙부터 공개해요. 등록되지 않은 대학은 임의로 계산하지 않아요.</p></div>}
      {rows.length > 0 && <div className="table-scroll"><table className="data-table univ-score-table"><thead><tr><th>대학·전형</th><th className="num">교과</th><th className="num">출결</th><th className="num">합계 / 만점</th><th>환산 순위</th></tr></thead><tbody>{rows.map(({ p, r }) => <tr key={p.id} className={active?.p.id === p.id ? 'is-selected' : ''}><td><button className="text-button univ-score-name" aria-pressed={active?.p.id === p.id} aria-label={`${p.university} ${p.program} 환산 상세`} onClick={() => setSelected(p.id)}><UniversityLogo university={p.university} /><span><strong>{p.university}</strong><small>{[p.program, p.department].filter(Boolean).join(' · ')}</small></span></button></td><td className="num">{r?.status === 'ready' ? r.value.grade.toFixed(2) : '—'}</td><td className="num">{r?.status === 'ready' ? r.value.attendance.toFixed(2) : '—'}</td><td className="num">{r?.status === 'ready' ? `${r.value.total.toFixed(p.rule!.rounding.digits)} / ${r.value.max}` : '준비 중'}</td><td>{r?.status === 'ready' ? `${ratioSorted.findIndex(a => a.id === p.id) + 1}위` : '—'}</td></tr>)}</tbody></table></div>}
      <p className="t-caption text-muted">환산 순위는 대학 만점 대비 점수 비율을 비교한 순서예요. 대학 선호도나 지원 결과를 뜻하지 않아요.</p><Disclaimer /></div>
      <aside className="analysis-aside" aria-label="대학별 환산 근거">{active ? (() => { const { p, r } = active; return <><div className="univ-score-name"><UniversityLogo university={p.university} /><h3 className="t-heading-3">{p.university}</h3></div><p>{[p.program, p.department].filter(Boolean).join(' · ')}</p>{r?.status === 'ready' ? <><div className="univ-score-total"><span>내 환산점수</span><strong>{r.value.total.toFixed(p.rule!.rounding.digits)}</strong><span>/ {r.value.max}점 만점</span></div><dl className="analysis-facts"><div><dt>교과</dt><dd>{r.value.grade.toFixed(2)}</dd></div><div><dt>출결</dt><dd>{r.value.attendance.toFixed(2)}</dd></div></dl><p>만점 대비 {(r.value.total / r.value.max * 100).toFixed(2)}%{r.value.average_rank !== null && ` · 반영 교과 평균 ${r.value.average_rank.toFixed(2)}`}</p>{avgSorted.some(a => a.id === p.id) && <p>반영 교과 평균 기준 {avgSorted.findIndex(a => a.id === p.id) + 1}위 → 만점 대비 환산 기준 {ratioSorted.findIndex(a => a.id === p.id) + 1}위</p>}{r.value.attendance_deduction > 0 && <p className="notice">출결 감점 {r.value.attendance_deduction}점이 있어요.</p>}</> : <p className="notice">{r?.reason ?? '환산 규칙 준비 중'}</p>}<TraceAccordion trace={r?.trace ?? []} />{p.source.startsWith('https://') && <a className="text-button" href={p.source} target="_blank" rel="noreferrer">공식 원문 보기 ↗</a>}</>; })() : <><h3 className="t-heading-3">대학별 환산 근거</h3><p className="text-muted">검수된 전형이 등록되면 대학별 반영 방법과 내 환산점수를 확인할 수 있어요.</p></>}</aside></div>;
  }}</StudentDataScreen>;
}

export function StudentHome() {
  return <HomeDashboard />;
}

export function ScoreTrend() {
  return <StudentDataScreen slug="score-trend" title="성적 추이">{data => <ScoreTrendContent data={data} />}</StudentDataScreen>;
}
