import { useState } from 'react';
import { Link } from 'react-router-dom';
import { gradeSummary, semesters, type StudentBackup } from '../domain/student';
import { safeSourceUrl } from '../domain/planner';
import { Modal } from './Modal';
import { Icon } from './Icon';
import { MockTrend } from './MockTrend';
import '../styles/score-trend.css';

export function ScoreTrendContent({ data }: { data: StudentBackup }) {
  const [minimumOpen, setMinimumOpen] = useState(false);
  const values = semesters.map(semester => ({ semester, summary: gradeSummary(data.grades.filter(g => g.semester === semester)) }));
  const latest = values.filter(v => v.summary.average !== null).at(-1);
  const applications = data.planning?.applications ?? [];
  return <>
    <div className="section-row"><p className="text-muted">내신과 모의고사 등급을 한눈에 확인해요.</p>
      <button type="button" className="button-outline" aria-haspopup="dialog" aria-expanded={minimumOpen} onClick={() => setMinimumOpen(true)}>목표 대학 최저 현황</button></div>
    <div className="score-trend-grid">
      <article className="score-trend-card" aria-labelledby="school-trend-title">
        <header><h3 id="school-trend-title" className="t-heading-3">내신 학기별 평균 등급</h3><p className="t-caption text-muted">5등급 기준 · 학점 가중 평균 · 1등급이 위예요</p></header>
        <div className="score-trend-summary"><span className="t-body-sm">최근 학기 평균</span><strong>{latest ? `${latest.summary.average!.toFixed(2)}등급` : '—'}</strong><span className="t-caption text-muted">{latest ? `${latest.semester[0]}학년 ${latest.semester[2]}학기 · ${latest.summary.ranked}과목` : '성적 입력 전'}</span></div>
        {latest ? <><svg className="trend-chart" viewBox="0 0 600 260" role="img" aria-label="학기별 평균 등급 추이">
          {[1, 2, 3, 4, 5].map(n => <g key={n}><line x1="40" x2="570" y1={20 + (n - 1) * 50} y2={20 + (n - 1) * 50} stroke="var(--color-hairline)" /><text x="10" y={25 + (n - 1) * 50}>{n}</text></g>)}
          {values.map(({ semester, summary }, i) => <g key={semester}><text x={50 + i * 100} y="250" textAnchor="middle">{semester}</text>{summary.average !== null && <><circle cx={50 + i * 100} cy={20 + (summary.average - 1) * 50} r="4" fill="var(--color-ink)" /><title>{semester}: {summary.average.toFixed(2)}</title>{i > 0 && values[i - 1].summary.average !== null && <line x1={50 + (i - 1) * 100} y1={20 + (values[i - 1].summary.average! - 1) * 50} x2={50 + i * 100} y2={20 + (summary.average - 1) * 50} stroke="var(--color-ink)" strokeWidth="2" />}</>}</g>)}
        </svg><div className="table-scroll"><table className="data-table"><caption className="sr-only">내신 학기별 평균 등급 목록</caption><thead><tr><th scope="col">학기</th><th scope="col">산출 과목</th><th scope="col">평균 등급</th></tr></thead><tbody>{values.map(v => <tr key={v.semester}><th scope="row">{v.semester}</th><td>{v.summary.ranked}</td><td>{v.summary.average?.toFixed(2) ?? '입력 전'}</td></tr>)}</tbody></table></div></>
          : <div className="score-trend-empty"><Icon name="chart-column" size={32} /><h4 className="t-heading-4">평균을 낼 수 있는 성적이 없어요</h4><p className="text-muted">과목과 등급을 입력하면 학기별 추이를 볼 수 있어요.</p><Link className="button-outline" to="/grade-input">내신 성적 입력</Link></div>}
      </article>
      <MockTrend scores={data.mocks ?? []} />
    </div>
    {minimumOpen && <Modal label="목표 대학 최저 현황" onClose={() => setMinimumOpen(false)}>
      <div className="score-minimum-panel"><header className="section-row"><h3 className="t-heading-3">목표 대학 최저 현황</h3><button type="button" className="score-minimum-close" aria-label="최저 현황 닫기" onClick={() => setMinimumOpen(false)}><Icon name="x" /></button></header>
        {applications.length ? <><p className="text-muted">지원 준비에 등록한 대학이에요. 모의고사 성적과 대학별 최저 기준이 연결되면 충족 여부를 확인할 수 있어요.</p>
          {applications.map(a => <article className="univ-card" key={a.id}><h4 className="t-heading-4">{a.university}</h4><p>{a.year}학년도 · {a.program}{a.department && ` · ${a.department}`}</p><span className="t-body-sm text-muted">최저 기준 확인 필요</span>{a.source_url && safeSourceUrl(a.source_url) && <a href={a.source_url} target="_blank" rel="noreferrer">등록한 모집요강 열기 ↗</a>}<Link to={`/eligibility-check?plan=${encodeURIComponent(a.id)}`}>지원 자격 확인표 열기</Link></article>)}
        </> : <div className="empty-state"><h4 className="t-heading-4">등록한 목표 대학이 없어요</h4><p>지원 준비에 대학과 전형을 추가해 주세요.</p></div>}
        <Link className="button-outline" to="/application-checklist">지원할 대학·전형 관리</Link>
      </div>
    </Modal>}
  </>;
}
