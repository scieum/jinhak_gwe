import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { useStudent } from '../store/studentDb';
import { gradeSummary } from '../domain/student';
import { combinations, conversionFor, currentComparisonBasis, fiveToNineFor } from '../domain/results';
import { compareBasis } from '../domain/comparison';
import { collectedProgramPath } from '../domain/interests';
import { judgeRange } from '../engine/judgment';
import { judgmentRule } from '../data/conversion-rules';
import { admissionYear, dataAsOf, programs } from '../data/catalog';
import { UniversityLogo } from './UniversityLogo';
import { GradeRange } from './GradeRange';
import { Icon } from './Icon';
import { PromoBanner } from './PromoBanner';
import '../styles/home.css';

// Figma "홈 · UI Bowl 상세 시안 · 11.24"(817:2 · 817:43 · 821:890 · 821:914) 그대로.
// shortcut: 2028학년도 일정은 시안 값(공식 발표 대조 전). 대교협·평가원 확정 일정이 데이터로 들어오면 그 값으로 바꿔요.
const DDAYS = [['수시 원서 접수', '2027-09-08'], ['수능', '2027-11-18']] as const;
const JUDGE = { 안정: ['judge-safe', '●'], 적정: ['judge-fit', '◐'], 소신: ['judge-reach', '▲'], 위험: ['judge-risk', '■'] } as const;
const COMBO = '국수영사과'; // 될각 화면 기본 반영 교과와 같아요

const one = (v: number) => (Math.round(v * 10) / 10).toFixed(1);
const rangeText = (min: number | null, max: number | null) => min === null || max === null ? '환산 준비 중' : `약 ${(Math.floor(min * 10) / 10).toFixed(1)}~${(Math.ceil(max * 10) / 10).toFixed(1)}`;
const dday = (date: string) => { const now = new Date(); const d = Math.round((Date.parse(`${date}T00:00:00`) - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) / 864e5); return d > 0 ? `D-${d}` : d === 0 ? 'D-day' : `D+${-d}`; };

/** PC(≥1024)면 셸 머리(page-header)에, 모바일이면 화면 안에 그려요. */
function useDesktop() {
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    if (typeof matchMedia !== 'function') return;
    const media = matchMedia('(min-width: 1024px)'), update = () => setDesktop(media.matches);
    update(); media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  return desktop;
}

export function HomeDashboard() {
  const state = useStudent();
  const desktop = useDesktop();
  if (!state?.data) return <section className="student-screen" data-slug="home">{state ? <p role="alert">{state.error}</p> : <p role="status">기기에 저장된 성적을 읽고 있어요.</p>}</section>;
  const data = state.data, has = data.grades.length > 0;
  const result = fiveToNineFor(data.grades, '전 교과'), average = gradeSummary(data.grades).average;
  const ready = result.min !== null && result.max !== null;

  // 관심 대학 될각: 될각 화면과 같은 조건(검수된 입결 · 같은 비교 기준)일 때만 판정해요. 그 밖은 판정 없음(NEVER-1).
  const conversion = conversionFor(data.grades, COMBO), scope = combinations[COMBO]!;
  const basis = currentComparisonBasis(data.grades, scope, conversion.status === 'ready');
  const judged = (university: string) => {
    if (conversion.status !== 'ready') return null;
    for (const p of programs) {
      if (p.university !== university || p.admission_year !== admissionYear || (p.admission_type && p.admission_type !== '교과')) continue;
      if (!compareBasis(basis, p.cut_basis).comparable || p.cut_grade_system !== basis.grade_system || p.cut_subject_scope.length !== scope.length || !scope.every(g => p.cut_subject_scope.includes(g))) continue;
      const r = judgeRange(conversion.value, p.license_status === 'allowed' ? p.cut : null, judgmentRule);
      if (r.status === 'ready') return { p, v: r.value };
    }
    return null;
  };
  const universities = (data.interests ?? []).filter((i, k, all) => all.findIndex(x => x.university === i.university) === k); // 대학마다 첫 관심 하나
  const rows = universities.map(i => ({ i, j: judged(i.university) }));
  const judgedCount = rows.filter(r => r.j).length;

  const Title = desktop ? 'h1' : 'h2'; // 모바일은 앱바 로고가 h1이에요
  const heading = <div className={`home-heading${desktop ? '' : ' screen-heading'}`}><Title>{has ? '지금 내 위치예요' : '반가워요'}</Title><p>{has ? '입력한 성적으로 계산한 추정 범위예요.' : desktop ? '성적을 입력하면 내 위치를 추정 범위로 보여 드려요.' : '성적을 입력하면 내 위치를 보여 드려요.'}</p></div>;
  const headSlot = desktop ? document.querySelector('.topbar__heading') : null;
  const badgeSlot = typeof document === 'undefined' ? null : document.getElementById(desktop ? 'topbar-screen-actions' : 'appbar-actions');
  const shortcuts = [...(has ? [['성적 입력·수정', 'grade-input', 'file-text']] : []), ['대학별 환산', 'univ-score', 'arrow-up-down'], ['전형계획 살펴보기', 'admissions-list', 'book-open'], ['될각 확인하기', 'doelgak', 'sparkles']];

  return <section className={`student-screen home-dashboard${has ? '' : ' home-dashboard--empty'}`} data-slug="home" aria-label="나의 U:NAVI">
    {headSlot ? createPortal(heading, headSlot) : heading}
    {badgeSlot && createPortal(<span className="data-status-badge home-asof">시행계획 기준{desktop ? ` · ${dataAsOf}` : ''}</span>, badgeSlot)}
    <div className="home-columns">
      <div className="home-left">
        {has ? <section className="home-hero" aria-label="내 성적 요약">
          <div className="stat-tile home-stat"><span>내 환산 9등급</span><strong className="num">{rangeText(result.min, result.max)}</strong><p>{ready ? '5등급 평균을 9등급 기준으로 옮긴 추정 범위예요.' : '석차등급이 있는 과목을 입력하면 범위를 보여 드려요.'}</p></div>
          <p className="home-chips"><span>5등급 평균</span><b className="grade-chip num">{average === null ? '—' : one(average)}</b>
            {result.representative !== null && <><span>대표값</span><b className="grade-chip grade-chip--9 num">{one(result.representative)}<sub>9</sub></b></>}
            <span className="home-chips__count num">입력 과목 {data.grades.length}개</span></p>
        </section> : <section className="home-card home-empty" aria-label="내 성적 요약"><div className="empty-state"><Icon name="file-text" size={48} /><h2>아직 입력한 성적이 없어요</h2><p>성적표를 한 번 입력하면 {desktop ? '' : <br />}환산 9등급 범위를 {desktop ? '여기에서 ' : ''}볼 수 있어요.</p><Link className="button-primary" to="/grade-input">성적 입력하기</Link></div></section>}
        <PromoBanner closable />
        {has && <section className="home-card home-range" aria-label="5 to 9 내 위치">
          <h2>5 to 9 내 위치</h2>
          {ready && <div className="home-range__bar"><GradeRange min={result.min!} max={result.max!} representative={result.representative ?? undefined} /><span className="data-status-badge">신뢰도 {result.confidence}</span></div>}
          <p className="home-range__note">방법마다 값이 조금씩 달라서 범위로 보여드려요.</p>
          <Link className="button-pill-soft" to="/five-to-nine?view=mine">5 to 9 자세히 보기</Link>
        </section>}
      </div>
      <div className="home-right">
        <div className="home-dday">{DDAYS.map(([label, date]) => <div className="stat-tile home-tile" key={label}><span>{label}</span><strong className="num">{dday(date)}</strong><small className="num">{date} 예정</small></div>)}</div>
        <section className="home-card home-judge" aria-label="관심 대학 될각">
          <div><h2>관심 대학 될각</h2><p>{rows.length ? `관심 대학 ${rows.length}곳 중 ${judgedCount}곳 · 교과전형 입결과 비교했어요` : '관심 대학을 담으면 여기에서 될각 판정을 볼 수 있어요.'}</p></div>
          {rows.length > 0 && <ul>{rows.slice(0, 4).map(({ i, j }) => {
            const badge = !j ? <span className="judge-badge judge-none">{has ? '자료 준비 중' : '성적 입력 후 보여요'}</span>
              : j.v.boundary ? <span className="judge-badge judge-edge">경계</span>
              : <span className={`judge-badge ${JUDGE[j.v.label][0]}`}><span aria-hidden="true">{JUDGE[j.v.label][1]}</span> {j.v.label}</span>;
            return <li className="univ-card" key={i.university}><UniversityLogo university={i.university} />
              <Link to={collectedProgramPath(i.university, j?.p.program ?? i.program, j ? j.p.department || undefined : i.department)}><strong>{i.university}</strong><span>{j ? [j.p.program, j.p.department].filter(Boolean).join(' · ') : [i.program, i.department].filter(Boolean).join(' · ')}</span></Link>{badge}</li>;
          })}</ul>}
          {rows.length ? <Link className="button-pill-soft" to="/doelgak">될각 전체 보기</Link> : <Link className="button-pill-soft" to="/admissions-list">전형계획 둘러보기</Link>}
        </section>
      </div>
    </div>
    <section className="home-shortcuts" aria-labelledby="home-shortcuts-title">
      <h2 id="home-shortcuts-title"><span className="home-pc">이어서 준비해요</span><span className="home-mobile">바로가기</span></h2>
      <div className="home-shortcuts__list">{shortcuts.map(([label, route, icon]) => <Link to={`/${route}`} key={route}><Icon name={icon} /><span>{label}</span><Icon name="chevron-right" /></Link>)}</div>
    </section>
    <p className="disclaimer-note home-note"><Icon name="info" size={16} /><span>대학 공식 자료가 최종 기준이에요 · 데이터 기준일 {dataAsOf}</span></p>
  </section>;
}
