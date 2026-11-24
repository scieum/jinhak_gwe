import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BrandLogo } from '../components/BrandLogo';
import { Icon } from '../components/Icon';
import { MODE_HOME } from '../shell/nav';
import '../styles/about.css';

// Figma 840:52 "서비스 소개 상세페이지 · 밝은 분위기" (844:12 PC 1440, 844:271 Mobile 390). 앱 셸 밖 공개 랜딩.
const img = (name: string) => `${import.meta.env.BASE_URL}assets/admission-style/${name}.png`;
const START = MODE_HOME.student;

const FEATURES = [
  ['01  EXPLORE', '2028 전형계획', '2028학년도 모집 인원과 전형 요소, 수능최저, 일정을 대학별로 살펴봐요.', '대학·전형별 정보 확인'],
  ['02  UNDERSTAND', '내 성적 이해', '학기별 성적을 정리하고, 5등급 성적의 위치를 9등급 기준의 추정 범위로 읽어요.', '숫자와 해석을 함께'],
  ['03  CALCULATE', '대학별 환산', '대학마다 다른 반영 교과와 비율을 적용한 점수와 산출 근거를 함께 확인해요.', '검수된 환산 규칙 적용'],
  ['04  PLAN', '수시 6장 설계', '관심 대학과 전형을 배치하고 일정과 조건을 살펴 나만의 지원 조합을 준비해요.', '지원 계획을 한눈에'],
  ['05  CHECK', '모의고사·최저', '모의고사 성적과 목표 전형의 수능최저 기준을 함께 살펴 준비할 부분을 찾아요.', '목표 기준과 현재 성적 비교'],
  ['06  CONNECT', '선생님과 상담', '지원 계획과 고민을 상담카드로 정리하고 선생님과 다음 선택을 준비해요.', '탐색에서 상담까지 연결'],
];
const AUDIENCE = [
  ['FOR STUDENTS', '나에게 맞는 방향을\n찾고 싶은 학생', 'gilkong-explore-v1', '내 성적의 위치를 이해하고,\n궁금한 대학을 비교하며,\n나만의 지원 계획을 준비해요.'],
  ['FOR TEACHERS', '학생의 다음 선택을\n함께하는 선생님', 'gilkong-practice-v1', '학생의 성적과 관심 대학을 살펴보고,\n상담에서 나눈 이야기를\n다음 지원 계획으로 이어가요.'],
];
const PLAN_CARDS = ['A', 'B', 'C', 'D', 'E', 'F'].map((u, i) => [`0${i + 1}  관심 카드`, `관심 대학 ${u}`, i % 2 ? '학생부종합' : '학생부교과']);
const STUDENTS = [
  ['01  학생 A', '관심 대학 확인', '희망 학과와 전형의 지원 조건을 살펴봐요.'],
  ['02  학생 B', '수능최저 점검', '입력한 모의고사 성적과 목표 기준을 함께 확인해요.'],
  ['03  학생 C', '계획 함께 보기', '지원 카드와 일정, 고민 메모를 바탕으로 상담해요.'],
];
const STEPS = [
  ['01', '나의 위치부터', '성적을 입력하고 내 위치를 살펴보세요.'],
  ['02', '궁금한 대학으로', '관심 있는 대학과 전형을 비교해 보세요.'],
  ['03', '나만의 계획까지', '후보를 정리하며 지원 계획을 준비하세요.'],
];
const FAQ = [
  ['어떤 학생에게 도움이 되나요?', '2028학년도 대입을 준비하며 내 성적의 위치, 관심 대학의 전형, 수시 지원 계획을 살펴보고 싶은 학생을 위한 서비스예요. 선생님도 학생과 함께 상담에 활용할 수 있어요.'],
  ['처음에는 무엇부터 하면 되나요?', '관심 있는 대학의 전형계획부터 둘러보세요. 성적을 입력하면 내 위치와 대학별 환산을 살펴보고, 관심 대학을 수시 지원 계획으로 연결할 수 있어요.'],
  ['5등급을 9등급으로 바꾸면 확정 등급인가요?', '확정 등급이 아닌 추정 범위예요. 등급제 사이의 위치를 이해하기 위한 참고 정보이며, 입력한 학기와 과목, 계산 방법에 따라 달라질 수 있어요.'],
  ['대학별 환산과 등급 해석은 다른가요?', '5→9등급 해석은 다른 등급제에서 내 위치를 살펴보는 과정이에요. 대학별 환산은 대학·전형별 반영 교과, 비율 등 검수된 규칙을 적용해 점수를 계산하는 과정이에요.'],
  ['수시 6장 보드에서는 무엇을 할 수 있나요?', '관심 대학·전형을 배치하고 수능최저, 고사 일정, 고민 메모를 함께 정리해요. 지원 조합을 살펴본 뒤 선생님과 상담할 자료로 활용할 수 있어요.'],
  ['선생님과 상담할 때 어떻게 활용하나요?', '성적과 관심 대학, 지원 카드, 고민을 먼저 정리해 보세요. 상담카드 파일이나 QR로 전달하고, 선생님과 전형 조건 및 계획을 함께 검토할 수 있어요.'],
  ['입력한 학생 성적은 어디에 저장되나요?', '학생 모드의 성적과 지원 계획은 이용하는 기기의 브라우저에 저장돼요. 다른 기기로 옮기거나 브라우저 데이터를 지우기 전에는 백업 파일을 보관해 주세요.'],
  ['모든 대학·전형의 점수를 계산할 수 있나요?', '검수가 완료된 환산 규칙이 있는 전형만 계산해요. 자료가 없거나 검수 전이라면 준비 중으로 안내하며, 지원 전에는 대학의 최신 모집 요강도 함께 확인해 주세요.'],
];
// 범위 막대 16칸(시안 track): 1등급 1칸, 2~8등급 2칸씩, 9등급 1칸
const TRACK = [1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9];

const Eyebrow = ({ children, center }: { children: string; center?: boolean }) => <p className={`about__eyebrow${center ? ' about__center' : ''}`}>{children}</p>;
const Mascot = ({ name, size, className }: { name: string; size: number; className?: string }) =>
  <img className={['about__mascot', className].filter(Boolean).join(' ')} src={img(name)} alt="" width={size} height={size} style={{ ['--size' as string]: `${size}px` }} />;
const Cta = () => <Link className="about__cta" to={START}>U:NAVI 시작하기</Link>;

function PositionPreview() {
  return <div className="about-preview">
    <p className="about-preview__label">U:NAVI  /  내 위치 미리보기</p>
    <div className="about-preview__stat">
      <p className="about-preview__label">내 환산 9등급</p>
      <p className="about-preview__value">약 2.2~2.8</p>
      <p className="about__body about__ink">5등급 성적을 옮긴 추정 범위예요.</p>
    </div>
    <div className="about-preview__secondary">
      <span className="about__small">5등급 평균</span><span className="about-preview__chip">2.1</span>
      <span className="about-preview__gap" />
      <span className="about__small">대표값</span><span className="about-preview__chip about-preview__chip--boxed">2.5<small>9</small></span>
    </div>
    <div className="about-preview__range">
      <div className="about-preview__chart" aria-hidden="true">
        <div className="about-preview__track">{TRACK.map((g, i) => <span key={i} style={{ background: `var(--color-grade-${g})` }} />)}</div>
        <div className="about-preview__bracket" />
        <div className="about-preview__line" />
        <div className="about-preview__bubble">2.5</div>
        <div className="about-preview__stem" />
        <svg className="about-preview__dot" viewBox="0 0 20 20"><circle cx="10" cy="10" r="10" fill="var(--color-ink)" /><circle cx="10" cy="10" r="9" fill="var(--color-canvas)" /><circle cx="10" cy="10" r="6" fill="var(--color-accent)" /></svg>
        <div className="about-preview__ticks">{[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => <span key={n}>{n}</span>)}</div>
      </div>
      <span className="about-preview__badge">신뢰도 보통</span>
    </div>
    <p className="about-preview__label">이해를 돕기 위한 예시예요.{'\n'}환산 결과는 입력 성적과 방법에 따라 달라져요.</p>
  </div>;
}

export function About() {
  useEffect(() => { try { localStorage.setItem('jinhak-navi-seen-about', '1'); } catch { /* 저장 못 해도 페이지는 그대로 */ } }, []);
  return <div className="about" data-slug="about">
    <header className="about__nav">
      <Link to="/about" aria-label="U:NAVI 서비스 소개"><BrandLogo /></Link>
      <nav className="about__links" aria-label="서비스 소개 목차">
        <a href="#about-intro">서비스 소개</a><a href="#about-audience">학생과 선생님</a><a href="#about-faq">자주 묻는 질문</a>
      </nav>
      <Link className="about__cta about__cta--nav" to={START}>시작하기</Link>
    </header>

    <main>
      <section className="about__hero about__sec about__soft">
        <Eyebrow center>2028학년도 대입을 위한 진학 길잡이</Eyebrow>
        <h1 className="about__display">2028 대입,<br />나의 방향을<span className="about__pc-only"> </span><br className="about__mo-only" />찾는 시작.</h1>
        <p className="about__lead about__center">내신 5등급 세대의 대학 탐색부터{'\n'}수시 6장 설계와 선생님 상담까지.</p>
        <Cta />
        <div className="about__hero-row">
          <p className="about__body about__pc-only">나의 위치를 이해하고</p>
          <Mascot name="gilkong" size={300} className="about__hero-mascot" />
          <p className="about__body about__pc-only">다음 선택을 준비해요</p>
        </div>
        <p className="about__eyebrow about__eyebrow--ink about__center">SCROLL TO EXPLORE</p>
      </section>

      <section id="about-intro" className="about__sec">
        <div className="about__split about__split--intro">
          <Mascot name="gilkong-explore-v1" size={340} className="about__intro-mascot" />
          <div className="about__stack">
            <Eyebrow>ABOUT U:NAVI</Eyebrow>
            <h2 className="about__h2">막막한 진학 준비를,{'\n'}나의 다음 한 걸음으로.</h2>
            <p className="about__lead">2028학년도 대입을 준비하는{'\n'}학생과 선생님을 위한 U:NAVI.{'\n'}성적 해석부터 대학 탐색,{'\n'}지원 계획과 상담까지 함께해요.</p>
          </div>
        </div>
      </section>

      <section className="about__sec about__muted about__sec--features">
        <div className="about__stack about__center">
          <Eyebrow center>ONE PLACE, EVERY NEXT STEP</Eyebrow>
          <h2 className="about__h2">흩어져 있던 진학 준비,{'\n'}이제 한곳에서 이어가요.</h2>
          <p className="about__body">2028 전형계획부터 나만의 지원 계획과 상담까지.</p>
        </div>
        <ul className="about__features">
          {FEATURES.map(([k, t, d, n]) => <li key={k} className="about__feature">
            <Eyebrow>{k}</Eyebrow><h3 className="about__h3s">{t}</h3><p className="about__body">{d}</p><p className="about__small about__accent">{n}</p>
          </li>)}
        </ul>
      </section>

      <section id="about-audience" className="about__sec about__sec--audience">
        <div className="about__stack about__center">
          <Eyebrow center>FOR STUDENTS & TEACHERS</Eyebrow>
          <h2 className="about__h2">같은 목표,{'\n'}서로 다른 출발점.</h2>
          <p className="about__lead">학생에게는 탐색의 방향을, 선생님에게는 상담의 연결을.</p>
        </div>
        <div className="about__pair">
          {AUDIENCE.map(([k, t, m, d]) => <article key={k} className="about__audience">
            <Eyebrow>{k}</Eyebrow><h3 className="about__h3">{t}</h3><Mascot name={m} size={180} /><p className="about__body">{d}</p>
          </article>)}
        </div>
      </section>

      <section className="about__sec">
        <div className="about__split about__split--position">
          <div className="about__stack about__text-col">
            <Eyebrow>01  UNDERSTAND</Eyebrow>
            <h2 className="about__h2">등급 하나로는{'\n'}보이지 않던 나의 위치.</h2>
            <p className="about__lead">5등급 성적을 9등급 기준의 추정 범위로 살펴보세요.{'\n'}숫자 하나에 머물지 않고, 범위와 해석을 함께 읽어요.</p>
          </div>
          <div className="about__example about__example--position">
            <PositionPreview />
            <p className="about__small about__center">이해를 돕기 위한 예시 화면입니다.</p>
          </div>
        </div>
      </section>

      <section className="about__sec about__sec--explore">
        <div className="about__split about__split--explore">
          <div className="about__example about__example--explore">
            <Eyebrow>MY NEXT CHOICE</Eyebrow>
            <h2 className="about__h2">궁금한 대학부터,{'\n'}하나씩 가까이.</h2>
            {[['관심 대학 A', '모집 단위와 전형 정보를 살펴봐요.'], ['관심 대학 B', '입시 결과와 모집 요강을 함께 읽어요.']].map(([t, d]) =>
              <div key={t} className="about__univ"><Icon name="file-text" size={24} /><div><p className="about__title">{t}</p><p className="about__small">{d}</p></div></div>)}
            <div className="about__mascot-row">
              <p className="about__body">비교하며 좁혀가는{'\n'}나만의 선택</p>
              <Mascot name="gilkong-reason-v1" size={160} className="about__explore-mascot" />
            </div>
            <p className="about__small">대학 정보의 구성을 보여주는 예시입니다.</p>
          </div>
          <div className="about__stack about__text-col">
            <Eyebrow>02  EXPLORE & PLAN</Eyebrow>
            <h2 className="about__h2">정보는 차근차근,{'\n'}선택은 나답게.</h2>
            <p className="about__lead">관심 대학의 전형과 입시 결과를 살펴보고 비교해요.{'\n'}흩어져 있던 정보를 모아 나만의 지원 계획을 준비하세요.</p>
          </div>
        </div>
      </section>

      <section className="about__sec">
        <div className="about__split about__split--plan">
          <div className="about__story">
            <div className="about__stack">
              <Eyebrow>03  MY APPLICATION PLAN</Eyebrow>
              <h2 className="about__h2">여섯 번의 선택을,{'\n'}하나의 계획으로.</h2>
              <p className="about__body">대학 이름만 모아두는 데서 한 걸음 더.{'\n'}전형의 조건과 일정, 나의 고민을 함께 정리해요.</p>
            </div>
            <p className="about__body">01  관심 대학·전형을 카드로 담고{'\n'}02  조건과 일정을 나란히 살펴보고{'\n'}03  상담할 고민까지 함께 기록해요.</p>
            <p className="about__title about__accent">선택의 이유가 보이면, 상담도 더 구체적이 됩니다.</p>
          </div>
          <div className="about__board">
            <div className="about__board-head"><p className="about__title">나의 수시 6장</p><p className="about__small about__accent">구성 예시</p></div>
            <div className="about__plan-cards">
              {PLAN_CARDS.map(([k, t, d]) => <div key={k} className="about__plan-card">
                <Eyebrow>{k}</Eyebrow><p className="about__title">{t}</p><p className="about__small">{d}</p>
                <p className="about__small"><span className="about__pc-only">수능최저 · 고사 일정 확인</span><span className="about__mo-only">조건·일정 확인</span></p>
              </div>)}
            </div>
            <div className="about__check">
              <p className="about__title">지원 전에 한 번 더</p>
              <p className="about__small">전형별 지원 조건  ·  고사 일정 겹침{'\n'}수능최저 기준  ·  상담할 고민</p>
            </div>
            <p className="about__small">실제 대학 및 판정 결과가 아닌 구성 예시입니다.</p>
          </div>
        </div>
      </section>

      <section className="about__sec">
        <div className="about__split about__split--counsel">
          <div className="about__example about__example--counsel">
            <div className="about__board-head"><p className="about__title">우리 반 상담 준비</p><p className="about__small about__accent">화면 예시</p></div>
            {STUDENTS.map(([n, s, d]) => <div key={n} className="about__student">
              <div className="about__board-head"><p className="about__title">{n}</p><p className="about__small about__accent">{s}</p></div>
              <p className="about__body">{d}</p>
            </div>)}
            <div className="about__mascot-row about__mascot-row--counsel">
              <p className="about__title">자료를 모으는 시간에서{'\n'}함께 이야기하는 시간으로.</p>
              <Mascot name="gilkong-practice-v1" size={130} />
            </div>
            <p className="about__small">학생 번호·내용은 설명을 위한 가상 예시입니다.</p>
          </div>
          <div className="about__story">
            <div className="about__stack">
              <Eyebrow>04  BETTER TOGETHER</Eyebrow>
              <h2 className="about__h2">혼자 고민하던 선택을,{'\n'}함께 이야기할 수 있게.</h2>
              <p className="about__body">학생은 탐색한 내용을 정리하고,{'\n'}선생님은 학생별 자료를 바탕으로 상담을 이어가요.</p>
            </div>
            <p className="about__body">학생은  ·  성적, 관심 대학, 고민을 준비해요.{'\n'}선생님은  ·  지원 조건과 계획을 함께 검토해요.{'\n'}상담 후에는  ·  다음에 확인할 일을 정리해요.</p>
          </div>
        </div>
      </section>

      <section className="about__sec about__soft">
        <div className="about__stack about__center">
          <Eyebrow center>A GUIDE, NOT A GUARANTEE</Eyebrow>
          <h2 className="about__h2">판단의 근거까지,{'\n'}함께 살펴볼 수 있도록.</h2>
          <p className="about__lead">U:NAVI가 보여주는 성적 범위는 추정 정보예요.{'\n'}모집 요강과 입시 결과를 함께 확인하며{'\n'}나에게 맞는 선택을 준비할 수 있도록 도울게요.</p>
        </div>
      </section>

      <section className="about__sec about__muted about__sec--audience">
        <div className="about__stack about__center">
          <Eyebrow center>GET STARTED</Eyebrow>
          <h2 className="about__h2">처음이라도,{'\n'}한 걸음씩 시작해요.</h2>
          <p className="about__lead">지금 궁금한 것부터 차근차근 살펴보세요.</p>
        </div>
        <ol className="about__steps">
          {STEPS.map(([n, t, d]) => <li key={n} className="about__stack"><Eyebrow>{n}</Eyebrow><h3 className="about__h3">{t}</h3><p className="about__body">{d}</p></li>)}
        </ol>
      </section>

      <section id="about-faq" className="about__sec about__sec--faq">
        <div className="about__stack about__center">
          <Eyebrow center>FAQ</Eyebrow>
          <h2 className="about__h2">자주 묻는 질문</h2>
          <p className="about__body">처음 이용할 때 궁금한 내용을 모았어요.</p>
        </div>
        <ul className="about__faq">
          {FAQ.map(([q, a], i) => <li key={q}>
            <span className="about__badge">{String(i + 1).padStart(2, '0')}</span>
            <div><h3 className="about__title">{q}</h3><p className="about__body">{a}</p></div>
          </li>)}
        </ul>
      </section>

      <section className="about__sec about__soft about__final">
        <Mascot name="gilkong-open-v1" size={200} className="about__final-mascot" />
        <h2 className="about__display">2028 대입 준비,{'\n'}U:NAVI와 함께.</h2>
        <p className="about__body about__center">내신 5등급 세대의 다음 한 걸음을 함께 준비해요.</p>
        <Cta />
        <footer className="about__footer"><p className="about__title">U:NAVI</p><p className="about__small">나의 다음 방향을 찾다</p></footer>
      </section>
    </main>
  </div>;
}
