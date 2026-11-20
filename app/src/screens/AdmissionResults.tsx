import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { programs, admissionYear } from '../data/catalog';
import { combinations, conversionFor, currentComparisonBasis } from '../domain/results';
import { validateGrade } from '../domain/student';
import { compareBasis } from '../domain/comparison';
import { reviewed } from '../engine/types';
import { ComparisonDetails } from '../components/ComparisonDetails';
import { SegmentedControl } from '../components/SegmentedControl';
import { ResultBrowser } from '../components/ResultBrowser';
import { InterestList } from '../components/InterestList';
import { CollectedResultBrowser } from '../components/CollectedResultBrowser';
import { useReleasedResults } from '../data/releasedResults';
import { StudentDataScreen } from './Results';

export const RESULT_NOTICE = 'ⓘ 각 대학이 공식 발표한 수시 입결을 모은 참고 자료예요 · 대학마다 컷 산출 기준이 달라 대학끼리 같은 축에서 바로 비교하기 어려워요 · 대학 공식 자료가 최종 기준이에요';
export function AdmissionResults() {
  const units = useReleasedResults(), [query, setQuery] = useSearchParams();
  const view = query.get('view') === 'interests' ? 'interests' : query.get('view') === 'results' || query.has('u') ? 'results' : 'collected';
  const tabs = <SegmentedControl label="입결과 관심 전형" value={view} onChange={value => { const next = new URLSearchParams(query); next.set('view', value); if (value === 'collected') next.delete('u'); setQuery(next); }} options={[{ value: 'collected', label: '수집 자료' }, { value: 'results', label: '검수 완료 입결' }, { value: 'interests', label: '관심 전형' }]} />;
  return <section data-slug="admission-results" aria-label="수시 입결" className="student-screen">
    <div className="screen-heading admission-results-intro"><h2 className="t-heading-1">수시 입결</h2><p className="text-muted">대학이 발표한 지난 입결을 찾아보세요.</p><Link className="button-outline" to="/national-placement">전국 배치표 보기</Link></div>

    {view !== 'collected' && <div className="filter-panel">{tabs}</div>}
    {view === 'collected' ? <CollectedResultBrowser key={JSON.stringify([query.get('cu'), query.get('cp'), query.get('cd')])} tabs={tabs} initialUniversity={query.get('cu') ?? ''} initialProgram={query.get('cp') ?? ''} initialDepartment={query.get('cd') ?? ''} /> : view === 'interests' ? <InterestList units={units} /> : !units ? <p role="status">공개 입결 자료를 읽고 있어요.</p> : <ResultBrowser units={units} initialUniversity={query.get('u') ?? undefined} />}
    {view !== 'collected' && <><p className="disclaimer-note">{RESULT_NOTICE}</p>
    <details><summary>내 성적과 비교하는 조건</summary><ComparisonConditions /></details></>}
  </section>;
}
function ComparisonConditions() {
  const [combo, setCombo] = useState('국수영사과');
  return <StudentDataScreen slug="admission-results-compare" title="내 성적 비교 조건">{data => {
    const conversion = conversionFor(data.grades, combo);
    const scope = combinations[combo] ?? [...new Set(data.grades.filter(g => !validateGrade(g).length).map(g => g.subject_group))];
    const input = currentComparisonBasis(data.grades, scope, conversion.status === 'ready');
    const rows = programs.filter(p => p.admission_year === admissionYear);
    return <><p className="text-muted">입결 수치를 내 성적과 비교하기 전에 학년도·등급제·반영 교과·산식이 같은지 확인해요. 조건이 다르면 차이와 판정을 표시하지 않아요.</p><SegmentedControl label="입결 비교 교과" value={combo} onChange={setCombo} options={Object.keys(combinations).map(value => ({ value, label: value }))} />
      {!rows.length && <ComparisonDetails input={input} />}
      {rows.map(p => {
        const check = compareBasis(input, p.cut_basis), released = p.license_status === 'allowed' && p.cut && reviewed(p.cut) && Number.isFinite(p.cut.cut70) && (!p.cut_basis || p.cut_basis.statistic === 'p70');
        return <article className="univ-card" key={p.id}><h3 className="t-heading-3">{p.university} · {p.department}</h3><p>{p.program}</p>
          <p>{released ? `공개 자료 값: ${p.cut!.cut70} (70% 컷)` : '공개할 입결 자료 확인 필요'}</p>
          <p className="notice">{released && check.comparable ? '비교 조건이 일치해요. 될각에서 판정 기준과 함께 확인할 수 있어요.' : '조건 확인 전에는 점수 차이와 판정을 표시하지 않아요.'}</p>
          <ComparisonDetails input={input} cut={p.cut_basis} /></article>;
      })}<div className="toolbar"><Link className="button-outline" to="/doelgak">될각 비교 보기</Link><Link className="button-outline" to="/eligibility-check">지원 자격도 확인하기</Link></div></>;
  }}</StudentDataScreen>;
}
