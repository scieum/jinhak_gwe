import { useState } from 'react';
import { Link } from 'react-router-dom';
import { cutTables, mockExams } from '../data/mock-exams';
import { AREAS, gradeLabel, type Area, type MockScore } from '../domain/mock';
import { mockTrend } from '../domain/mockTrend';
import { Icon } from './Icon';

export function MockTrend({ scores }: { scores: readonly MockScore[] }) {
  const [area, setArea] = useState<Area>('국어');
  const rows = mockTrend(scores, cutTables, mockExams);
  const ordered = rows.filter(row => row.order >= 0);
  const latest = ordered.at(-1);
  const selected = latest?.areas.find(a => a.key === area);
  const points = ordered.map(row => row.areas.find(a => a.key === area)!.grade);
  const hasGrades = points.some(g => g.status === 'ready');
  const x = (i: number) => ordered.length === 1 ? 300 : 50 + i * 500 / (ordered.length - 1);
  const y = (grade: number) => 20 + (grade - 1) * 25;

  return <article className="score-trend-card" aria-labelledby="mock-trend-title">
    <header><h3 id="mock-trend-title" className="t-heading-3">모의고사 영역별 등급</h3><p className="t-caption text-muted">9등급 기준 · 회차별 추이 · 1등급이 위예요</p></header>
    {!rows.length ? <div className="score-trend-empty"><Icon name="chart-column" size={32} /><h4 className="t-heading-4">아직 입력한 모의고사 성적이 없어요</h4><p className="text-muted">원점수를 입력하면 회차별 기록을 여기서 확인할 수 있어요.</p><Link className="button-outline" to="/mock-score">모의고사 성적 입력</Link></div> : <>
      <label>추이를 볼 영역<select value={area} onChange={e => setArea(e.target.value as Area)}>{AREAS.map(a => <option key={a.key}>{a.key}</option>)}</select></label>
      <div className="score-trend-summary"><span className="t-body-sm">최근 모의고사 · {area}</span><strong>{selected ? gradeLabel(selected.grade) : '회차 순서 확인 필요'}</strong><span className="t-caption text-muted">{latest?.exam ?? '등록된 시험 목록 밖의 기록이에요'}{selected?.raw !== undefined && ` · 원점수 ${selected.raw}/${selected.max}점`}</span></div>
      {hasGrades ? <><svg className="trend-chart" viewBox="0 0 600 260" role="img" aria-label={`${area} 모의고사 예상 등급 추이. 회차별 원점수와 등급은 아래 표에서 확인할 수 있어요.`}>
        {[1, 3, 5, 7, 9].map(n => <g key={n}><line x1="40" x2="570" y1={y(n)} y2={y(n)} stroke="var(--color-hairline)" /><text x="10" y={y(n) + 5}>{n}</text></g>)}
        {points.map((g, i) => {
          const previous = points[i - 1];
          return <g key={ordered[i].exam}><text x={x(i)} y="250" textAnchor="middle">{i + 1}</text>{g.status === 'ready' && <>
            <title>{ordered[i].exam}: {gradeLabel(g)}</title>
            {g.min === g.max ? <circle cx={x(i)} cy={y(g.min)} r="4" fill="var(--color-ink)" /> : <><line x1={x(i)} x2={x(i)} y1={y(g.min)} y2={y(g.max)} stroke="var(--color-ink)" strokeWidth="3" /><path d={`M${x(i) - 5},${y(g.min)}h10 M${x(i) - 5},${y(g.max)}h10`} stroke="var(--color-ink)" /></>}
            {g.min === g.max && previous?.status === 'ready' && previous.min === previous.max && <line x1={x(i - 1)} x2={x(i)} y1={y(previous.min)} y2={y(g.min)} stroke="var(--color-ink)" strokeWidth="2" />}
          </>}</g>;
        })}
      </svg><p className="t-caption text-muted">가로축 번호는 아래 표의 회차예요. 세로 막대는 예상 등급 범위이며, 등급이 없는 회차는 선으로 잇지 않아요.</p></>
        : <p className="notice">{area}의 표시할 등급이 없어요. 입력한 원점수는 아래 표에서 확인할 수 있고, 검수된 등급컷이 등록되면 추이를 보여 줘요.</p>}
      <div className="table-scroll"><table className="data-table"><caption className="sr-only">{area} 모의고사 회차별 원점수와 예상 등급</caption><thead><tr><th scope="col">회차</th><th scope="col">시험</th><th scope="col">원점수</th><th scope="col">예상 등급</th><th scope="col">수정</th></tr></thead><tbody>{rows.map((row, i) => {
        const a = row.areas.find(a => a.key === area)!;
        return <tr key={row.exam}><th scope="row">{row.order < 0 ? '순서 미확인' : i + 1}</th><td>{row.exam}</td><td>{a.raw === undefined ? '입력 전' : `${a.raw}/${a.max}점`}</td><td>{gradeLabel(a.grade)}</td><td><Link className="t-link" aria-label={`${row.exam} 성적 수정`} to={`/mock-score?exam=${encodeURIComponent(row.exam)}`}>수정</Link></td></tr>;
      })}</tbody></table></div>
      <p className="disclaimer-note">예상 등급은 검수된 등급컷으로 본 추정이에요. 성적 통지표가 최종 기준이에요.</p>
      <Link className="button-outline" to="/mock-score">모의고사 성적 입력·수정</Link>
    </>}
  </article>;
}
