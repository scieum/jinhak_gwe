import { Fragment } from 'react';
import { compareBasis, metricLabels, statisticLabels, type ComparisonBasis } from '../domain/comparison';
import '../styles/preparation.css';
export function ComparisonDetails({ input, cut }: { input: ComparisonBasis; cut?: ComparisonBasis }) {
  const check = compareBasis(input, cut);
  const fields: { label: string; read: (b: ComparisonBasis) => string }[] = [
    { label: '학년도', read: b => `${b.year}학년도` }, { label: '등급제', read: b => b.grade_system ? `${b.grade_system}등급` : '점수 기준' },
    { label: '지표', read: b => metricLabels[b.metric] }, { label: '통계 기준', read: b => statisticLabels[b.statistic] },
    { label: '척도·만점', read: b => String(b.max_score) }, { label: '반영 교과', read: b => b.subject_scope.join('·') || '미입력' },
    { label: '반영 학기', read: b => b.semesters.join('·') || '미입력' }, { label: '산식', read: b => b.method_id },
    { label: '산식 버전', read: b => b.method_version }, { label: '검수 상태', read: b => b.review_status === 'verified' ? '검수 완료' : '검수 전' },
    { label: '출처', read: b => b.source },
  ];
  return <details className="trace-accordion" open={!check.comparable}><summary>입결 비교 조건 · {check.comparable ? '조건 일치' : '확인 필요'}</summary>
    {!check.comparable && <ul>{check.reasons.map(r => <li key={r}>{r}</li>)}</ul>}
    <dl className="basis-grid"><dt>비교 항목</dt><dd>내 환산 기준</dd><dd>입결 기준</dd>{fields.map(f => <Fragment key={f.label}><dt>{f.label}</dt><dd>{f.read(input)}</dd><dd>{cut ? f.read(cut) : '미등록'}</dd></Fragment>)}</dl>
  </details>;
}
