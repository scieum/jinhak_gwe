import { Link } from 'react-router-dom';
import { useStudent } from '../store/studentDb';
import { gradeSummary } from '../domain/student';
import { combinations, fiveToNineFor } from '../domain/results';
import { collectedProgramPath } from '../domain/interests';
import { Disclaimer } from './CalculationDetails';
import { UniversityLogo } from './UniversityLogo';
import { InterestButton } from './InterestButton';
import { GradeRange } from './GradeRange';
import { Icon } from './Icon';

const rangeText = (min: number | null, max: number | null) => min === null || max === null ? '환산 준비 중' : `약 ${(Math.floor(min * 10) / 10).toFixed(1)}~${(Math.ceil(max * 10) / 10).toFixed(1)}`;
export function HomeDashboard() {
  const state = useStudent();
  if (!state?.data) return <section className="student-screen" data-slug="home">{state ? <p role="alert">{state.error}</p> : <p role="status">기기에 저장된 성적을 읽고 있어요.</p>}</section>;
  const data = state.data, result = fiveToNineFor(data.grades, '전 교과'), average = gradeSummary(data.grades);
  const interests = data.interests ?? [], apps = data.planning?.applications ?? [], board = data.boards?.[0];
  const ready = result.min !== null && result.max !== null;
  return <section className="student-screen home-dashboard" data-slug="home" aria-label="나의 진학 내비">
    <header className="home-greeting"><h2 className="t-heading-1">{data.grades.length ? '지금 내 위치예요' : '반가워요'}</h2><p className="text-muted">{data.grades.length ? '입력한 성적으로 계산한 추정 범위예요.' : '성적을 입력하면 내 위치를 추정 범위로 보여 드려요.'}</p></header>
    <div className="home-columns"><section className="home-summary" aria-label="내 성적 요약">
      {!data.grades.length ? <div className="home-empty"><Icon name="chart-column" size={36} /><h3 className="t-heading-3">아직 입력한 성적이 없어요</h3><p className="text-muted">첫 학기 성적부터 차근차근 입력해 보세요.</p><Link className="button-primary" to="/grade-input">성적 입력하기</Link></div> : <>
        <div className="home-stat-row"><div><span>내 환산 9등급</span><strong className="t-heading-1">{rangeText(result.min, result.max)}</strong><small>9등급 기준 추정 범위예요.</small></div><div><span>5등급 평균</span><strong className="t-heading-2">{average.average?.toFixed(2) ?? '—'}</strong><small>학점 가중 평균이에요.</small></div><div><span>신뢰도</span><strong className="t-heading-2">{result.confidence}</strong><small>산출 {result.stats.rankedCount}과목 기준이에요.</small></div><div className="home-mobile-representative"><span>대표값</span><strong>{result.representative?.toFixed(2) ?? '—'}</strong></div></div>
        {ready && <GradeRange min={result.min!} max={result.max!} representative={result.representative ?? undefined} />}
        <p className="t-body-sm text-muted">방법마다 값이 조금씩 달라서 범위로 보여드려요.</p>
        <div className="home-summary-details"><section><h3 className="t-body-sm">교과 조합별</h3><table className="data-table home-combos"><thead><tr><th>교과 조합</th><th>5등급</th><th>9등급 환산</th></tr></thead><tbody>{Object.entries(combinations).map(([name, groups]) => { const r = fiveToNineFor(data.grades, name); return <tr key={name}><th scope="row">{name}</th><td>{gradeSummary(data.grades, groups ?? undefined).average?.toFixed(2) ?? '—'}</td><td>{rangeText(r.min, r.max)}</td></tr>; })}</tbody></table></section>
          <section><h3 className="t-body-sm">다음 할 일</h3><div className="home-action-list"><Link to="/grade-input">성적 입력·수정<Icon name="chevron-right" size={20} /></Link><Link to="/susiro">수시로 6장 중 {board?.slots.length ?? 0}장 채웠어요<Icon name="chevron-right" size={20} /></Link><Link to="/counsel-tasks">상담 질문·할 일 확인<Icon name="chevron-right" size={20} /></Link></div></section></div>
        <Link className="button-pill-soft" to="/five-to-nine?view=mine">5 to 9 자세히 보기</Link>
      </>}
    </section><aside className="home-right"><div className="home-preparation-stats"><Link to="/application-checklist"><span>지원 준비 전형</span><strong className="t-heading-2">{apps.length}개</strong><small>원서·서류 준비를 확인해요.</small></Link><Link to="/admission-results?view=interests"><span>관심 학과·전형</span><strong className="t-heading-2">{interests.length}개</strong><small>저장한 관심 목록이에요.</small></Link></div>
      <section className="home-interests"><h3 className="t-heading-3">관심 대학·학과</h3><p className="t-caption text-muted">저장한 학과의 발표 입결을 확인해요.</p>{!interests.length ? <div className="empty-state"><p>입결 화면에서 학과 옆 하트를 눌러 담아 보세요.</p></div> : <ul>{interests.slice(0, 4).map(i => <li key={i.id}><UniversityLogo university={i.university} /><Link to={collectedProgramPath(i.university, i.program, i.department)}><strong>{i.university}</strong><span className="t-caption text-muted">{[i.program, i.department ?? '학과 미지정'].join(' · ')}</span></Link><InterestButton university={i.university} program={i.program} department={i.department} compact /></li>)}</ul>}<Link className="button-pill-soft" to="/admission-results?view=interests">관심 목록 전체 보기</Link></section>
    </aside></div>
    <section className="home-shortcuts"><h3 className="t-heading-3">바로가기</h3><div className="home-action-list">{[['성적 입력하기','grade-input','chart-column'],['대학별 환산 보기','univ-score','arrow-up-down'],['전형계획 둘러보기','admissions-list','book-open'],['생기부 AI로 내 기록 살펴보기','saenggibu-ai','sparkles']].map(([label,route,icon]) => <Link to={`/${route}`} key={route}><Icon name={icon} /><span>{label}</span><Icon name="chevron-right" size={20} /></Link>)}</div></section><Disclaimer />
  </section>;
}
