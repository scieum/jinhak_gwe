import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { STYLE_OPTIONS, STYLE_PROFILES, STYLE_QUESTIONS, summarizeStyle, type StyleAnswers, type StyleId } from '../domain/admissionStyle';
import '../styles/admission-style.css';
import { StyleMascot } from '../components/StyleMascot';
import { Icon } from '../components/Icon';
import { Modal } from '../components/Modal';
import { useDesktop } from '../components/TeacherBoard';

export function AdmissionStyle() {
  const [step, setStep] = useState<'intro' | 'quiz' | 'result'>('intro');
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<StyleAnswers>({});
  const [sheet, setSheet] = useState<StyleId | null>(null);
  const sheetProfile = STYLE_PROFILES.find(p => p.id === sheet);
  // v2 page-header(PC): 리드 + 체험판 배지 / app-bar(모바일): 체험판 배지
  const desktop = useDesktop();
  const [slots, setSlots] = useState<{ head: Element | null; badge: Element | null }>({ head: null, badge: null });
  useEffect(() => { setSlots({ head: desktop ? document.querySelector('.topbar__heading') : null, badge: document.getElementById(desktop ? 'topbar-screen-actions' : 'appbar-actions') }); }, [desktop]);
  const title = useRef<HTMLHeadingElement>(null);
  const section = useRef<HTMLElement>(null);
  useEffect(() => {
    if (step !== 'intro') title.current?.focus({ preventScroll: true });
    section.current?.scrollIntoView?.({ block: 'start', behavior: 'instant' });
  }, [step, index]);
  const question = STYLE_QUESTIONS[index];
  const answered = Object.hasOwn(answers, question.id);
  const mascot = <StyleMascot />;
  const result = step === 'result' ? summarizeStyle(answers) : null;
  return <section ref={section} className="admission-style" data-slug="admission-style" aria-label="대입 전형 성향 탐색">
    {slots.head && createPortal(<p className="as-lead">15개 질문으로 나의 준비 방식을 살펴보고, 함께 알아볼 전형을 찾아요</p>, slots.head)}
    {slots.badge && createPortal(<span className="data-status-badge as-badge">체험판 v0.1</span>, slots.badge)}
    {step === 'intro' && <>
      <div className="as-intro">
        <div className="as-intro__mascot">{mascot}</div>
        <div className="as-intro__text">
          <p className="t-label text-muted">성적표 밖의 나도 만나볼까요?</p>
          <h2 className="t-heading-2">나의 준비 방식을 살펴봐요</h2>
          <p className="t-body-lg as-intro__lead">꾸준히 쌓는 편인가요, 깊이 파고드는<br className="as-br-m" /> 편인가요? 나의 준비<br className="as-br-pc" /> 방식을 발견해 보세요.</p>
          <p className="t-title as-intro__facts">15문항 · 약 3분 · 가입 없이</p>
          <button type="button" className="button-primary" onClick={() => setStep('quiz')}>나의 전형 성향 알아보기 ↗</button>
          <p className="t-caption text-muted">답변은 서버에 보내거나 저장하지 않아요. 화면을 떠나면 초기화돼요.</p>
        </div>
      </div>
      <div className="as-styles">
        <div className="as-styles__head"><h3 className="t-heading-3">나는 어떤 방식으로 준비할까요?</h3><p className="t-body-sm">한 가지 유형에 나를 가두지 않아요. 여러 준비 방식이 함께 나타날 수도 있어요.</p></div>
        <div className="as-styles__cards">{STYLE_PROFILES.map((p, i) => <button type="button" key={p.id} className="as-style-card" aria-haspopup="dialog" aria-label={`0${i + 1} ${p.short}, ${p.name}, 설명 보기`} onClick={() => setSheet(p.id)}>
          <StyleMascot kind={p.id} />
          <span className="as-style-card__text"><span className="as-style-card__name"><span className="t-label text-muted">0{i + 1}</span><strong className="t-heading-4">{p.short}</strong></span><span className="t-body-sm text-muted">{p.name}</span></span>
          <Icon name="chevron-right" size={24} />
        </button>)}</div>
      </div>
      <p className="disclaimer-note t-caption text-muted"><Icon name="info" size={16} /><span>직접 만든 자기탐색 질문이에요 · MBTI나 표준화된 심리검사가 아니에요 · 답변만으로 지원 자격이나 입학 결과를 판단하지 않아요</span></p>
      {sheetProfile && <Modal label={`${sheetProfile.short} 설명`} onClose={() => setSheet(null)}>
        <div className="as-sheet">
          <p className="t-label">0{STYLE_PROFILES.indexOf(sheetProfile) + 1} {sheetProfile.short}</p>
          <h3 className="t-heading-3">{sheetProfile.name}</h3>
          <p className="t-body">{sheetProfile.description}</p>
          <p className="t-label text-muted">이런 문항으로 살펴봐요</p>
          <ul className="t-body-sm">{STYLE_QUESTIONS.filter(q => q.axis === sheetProfile.id).map(q => <li key={q.id}>{q.text}</li>)}</ul>
          <p className="t-body-sm">함께 살펴볼 전형 · {sheetProfile.route}</p>
          <p className="t-body-sm"><strong>다음 확인</strong> {sheetProfile.check}</p>
          <button type="button" className="button-outline" onClick={() => setSheet(null)}>닫기</button>
        </div>
      </Modal>}
    </>}
    {step === 'quiz' && <div className="style-question-layout">
      <aside className="style-guide">{mascot}<p>멋진 답보다<br /><strong>지금의 나와 가까운 답.</strong></p><small>경험이 없다면 마지막 선택지를 골라도 괜찮아요.</small></aside>
      <div className="style-question-panel"><div className="style-progress-label"><span>나를 알아가는 중</span><span>{index + 1} / {STYLE_QUESTIONS.length}</span></div>
        <progress aria-label="문항 진행" value={index + 1} max={STYLE_QUESTIONS.length} />
        <h2 ref={title} tabIndex={-1} id="style-question-title">{question.text}</h2>
        <fieldset className="style-options" aria-labelledby="style-question-title"><legend className="sr-only">나와 가까운 정도</legend>{STYLE_OPTIONS.map((option, optionIndex) => <label className={`style-option${answered && answers[question.id] === option.value ? ' is-selected' : ''}`} key={optionIndex}>
          <input type="radio" name={question.id} checked={answered && answers[question.id] === option.value} onChange={() => setAnswers(previous => ({ ...previous, [question.id]: option.value }))} />
          <span>{option.label}</span><span className="style-option-mark" aria-hidden="true">{answered && answers[question.id] === option.value ? '✓' : String(optionIndex + 1).padStart(2, '0')}</span>
        </label>)}</fieldset>
        <div className="style-controls"><button className="style-secondary" onClick={() => index === 0 ? setStep('intro') : setIndex(index - 1)}>{index === 0 ? '소개로' : '이전 문항'}</button>
          <button className="style-primary" disabled={!answered} onClick={() => index === STYLE_QUESTIONS.length - 1 ? setStep('result') : setIndex(index + 1)}>{index === STYLE_QUESTIONS.length - 1 ? '내 성향 보기' : '다음 문항'} <span aria-hidden="true">→</span></button></div>
        <p className="style-small">이전으로 돌아가 답변을 바꿀 수 있어요. 특정 전형을 선택해야 하는 검사는 아니에요.</p>
      </div>
    </div>}
    {result && <>
      <div className="style-result-hero"><div><p className="style-eyebrow">지금 답변에서 발견한 나</p><h2 ref={title} tabIndex={-1}>{result.title}</h2>
        <p>{result.kind === 'insufficient' ? '아직 경험이 적거나 판단하기 어려운 영역이 있어요. 전형의 순위를 정하지 않고, 활동을 먼저 살펴볼게요.' : result.kind === 'open' ? '이번 답변에서 뚜렷하게 선호하는 방식은 나타나지 않았어요. 짧은 활동부터 경험해 보고 다시 탐색해도 좋아요.' : result.kind === 'mixed' ? '비슷하게 관심을 보인 준비 방식이 여러 개예요. 하나로 고르지 말고 함께 살펴보세요.' : result.candidates[0].description}</p></div><StyleMascot kind={result.kind === 'focused' ? result.candidates[0].id : result.kind} /></div>
      <div className="style-result-heading"><span className="style-eyebrow">NEXT STEP</span><h3>{result.candidates.length ? '함께 살펴볼 전형' : '경험해 볼 준비 방식'}</h3><p>성향은 탐색의 출발점이에요. 실제 성적·지원 자격·전형요소 확인은 별도로 필요해요.</p></div>
      <div className="style-result-grid">{(result.candidates.length ? result.candidates : result.axes).map(profile => <article className={`style-result-card style-swatch--${profile.id}`} key={profile.id}>
        <span className="style-eyebrow">{result.candidates.length ? '탐색 추천' : '아직 열려 있는 길'}</span><h4>{profile.route}</h4><p>{profile.description}</p>
        {profile.evidence.length > 0 && <div className="style-evidence"><strong>이 답변을 참고했어요</strong><ul>{profile.evidence.map(text => <li key={text}>{text}</li>)}</ul></div>}
        <p className="style-next-check"><strong>다음 확인</strong> {profile.check}</p>
      </article>)}</div>
      <details className="style-method"><summary>결과는 어떻게 정했나요?</summary><p>5가지 준비 방식마다 3문항을 묶었어요. 응답은 0~3으로 더하고, ‘잘 모르겠어요’는 제외합니다. 각 영역에 2개 이상 응답해야 비교하며, 평균 2 이상인 영역 중 가장 높은 평균과 0.5 이내인 영역을 모두 보여줘요. 이 기준은 체험판의 임시 규칙이며 심리측정 검증을 거치지 않았어요.</p><p>내향·외향으로 면접 적합성을 정하지 않으며, 결과를 성적이나 합격확률로 바꾸지 않습니다.</p></details>
      <div className="style-result-actions"><Link className="style-primary" to="/grade-input">실제 성적 확인하기 ↗</Link><Link className="style-secondary" to="/univ-score">대학별 환산 살펴보기</Link><button className="style-secondary" onClick={() => { setIndex(0); setStep('quiz'); }}>답변 돌아보기</button><button className="style-secondary" onClick={() => { setAnswers({}); setIndex(0); setStep('intro'); }}>처음부터 다시</button></div>
      <p className="style-disclaimer">전형 추천은 준비 방식에 대한 탐색 안내입니다. 검증된 심리검사·능력 평가·입학 상담을 대신하지 않아요. 응답이나 결과는 서버에 전송되지 않습니다.</p>
    </>}
  </section>;
}
