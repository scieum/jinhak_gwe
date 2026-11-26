import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Link, useSearchParams } from 'react-router-dom';
import { SegmentedControl } from '../components/SegmentedControl';
import { useStudent } from '../store/studentDb';
import { type StudentBackup } from '../domain/student';
import type { ProgramData } from '../data/catalog';
import type { ScoringRule } from '../engine/scoring';
import { ScoreTrendScreen } from '../components/ScoreTrendContent';
import { ReferenceGradeAnalysis } from '../components/ReferenceGradeAnalysis';
import { QuickGradeCalculator } from '../components/QuickGradeCalculator';
import { HomeDashboard } from '../components/HomeDashboard';
import { ScreenActions } from '../components/ScreenActions';
import { dataAsOf } from '../data/catalog';
import '../styles/five-to-nine.css';

export function StudentDataScreen({ slug, title, children, actions, className = '' }: { slug: string; title: string; children: (data: StudentBackup) => ReactNode; actions?: ReactNode; className?: string }) {
  const state = useStudent();
  return <section data-slug={slug} aria-label={title} className={`student-screen ${className}`.trim()}><div className="screen-heading"><h2 className="t-heading-1">{title}</h2><ScreenActions>{actions ?? <Link className="button-outline" to="/grade-input">성적 입력·수정</Link>}</ScreenActions></div>
    {!state ? <p role="status">기기에 저장된 성적을 읽고 있어요.</p> : !state.data ? <p role="alert">{state.error}</p> : children(state.data)}
  </section>;
}
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
    {tab === 'quick' ? <>{viewTabs}<QuickGradeCalculator /></> : <ReferenceGradeAnalysis viewTabs={viewTabs} desktop={desktop} />}
  </section>;
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
  return <ScoreTrendScreen />;
}
