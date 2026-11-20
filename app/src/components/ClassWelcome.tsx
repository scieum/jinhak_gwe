import { ButtonPrimary } from './Buttons';
import { Icon } from './Icon';
import '../styles/class-welcome.css';

const nextSteps = [
  { title: '학급 코드 안내', description: '만든 학급 코드를 학생에게 알려 주세요.' },
  { title: '학생 자료 모으기', description: '학생이 전달한 .jnavi 파일 또는 QR을 불러와요.' },
  { title: '상담 기록', description: '학생별 성적·지원 계획을 보며 상담을 남겨요.' },
];

export function ClassWelcome({ onCreate }: { onCreate: () => void }) {
  return <div className="class-welcome">
    <section className="class-welcome__hero" aria-labelledby="class-welcome-title">
      <div className="class-welcome__main">
        <div className="class-welcome__intro">
          <p className="class-welcome__label"><Icon name="users" /><span>학급 설정</span></p>
          <h2 id="class-welcome-title">우리 반 시작하기</h2>
          <p className="class-welcome__description">반 이름과 번호·별칭 명단만 준비해 주세요.<br />학급을 만들면 학생 자료와 상담 기록을 한곳에 모을 수 있어요.</p>
        </div>
        <div className="class-welcome__action"><ButtonPrimary onClick={onCreate}><Icon name="plus" size={20} />학급 만들기</ButtonPrimary><p className="t-caption text-muted">새 학급은 이 기기에 저장돼요.</p></div>
      </div>
      <aside className="class-welcome__prepare" aria-labelledby="class-prepare-title">
        <h3 id="class-prepare-title">준비할 정보</h3>
        <div><p>반 이름</p><p>예: 3학년 2반</p></div>
        <div><p>번호·별칭 명단</p><p>입력 예시: 1 구름 / 2 바람 / 3 솔</p></div>
        <p className="t-body-sm text-muted">한 줄에 한 명씩, 실명 대신 별칭을 적어요.</p>
      </aside>
    </section>
    <section className="class-welcome__next" aria-labelledby="class-next-title"><h3 id="class-next-title" className="t-heading-3">학급을 만든 다음에는</h3>
      <ol className="class-welcome__steps">{nextSteps.map((step, i) => <li key={step.title}><span className="t-caption text-muted" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span><h4>{step.title}</h4><p>{step.description}</p></li>)}</ol>
    </section>
  </div>;
}
