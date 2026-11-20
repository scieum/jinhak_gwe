import { useMemo, useState } from 'react';
import { ButtonOutline, ButtonPrimary } from '../components/Buttons';
import { Icon } from '../components/Icon';
import { SegmentedControl } from '../components/SegmentedControl';
import { COMPETENCIES, competencyOf } from '../data/competency-items';
import { AREA_MAX, MASK, RECORD_AREAS, aiProxyUrl, applyMask, autoMaskWords, keywordClassify, requestAnalysis, splitSentences, summary,
  type Analysis, type RecordArea } from '../domain/saenggibu';
import '../styles/saenggibu.css';

type Step = 'paste' | 'mask' | 'result';
const STEPS: [Step, string][] = [['paste', '1 붙여넣기'], ['mask', '2 가림 확인'], ['result', '3 결과']];

export function SaenggibuAi() {
  const [step, setStep] = useState<Step>('paste'), [major, setMajor] = useState(''), [areas, setAreas] = useState<Partial<Record<RecordArea, string>>>({});
  const [extra, setExtra] = useState(''), [removed, setRemoved] = useState<string[]>([]), [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [result, setResult] = useState<Analysis | null>(null), [analyzedAt, setAnalyzedAt] = useState(new Date());
  const all = RECORD_AREAS.map(a => areas[a] ?? '').join('\n');
  const words = useMemo(() => [...new Set([...autoMaskWords(all), ...extra.split(',').map(w => w.trim()).filter(w => w.length > 1)])].filter(w => !removed.includes(w)), [all, extra, removed]);
  const masked = useMemo(() => Object.fromEntries(RECORD_AREAS.map(a => [a, applyMask(areas[a] ?? '', words)])) as Record<RecordArea, string>, [areas, words]);
  const sentences = useMemo(() => splitSentences(masked), [masked]);
  const canNext = !!major.trim() && !!areas['교과 세특']?.trim();
  const send = async () => {
    setBusy(true); setError('');
    try { setResult(await requestAnalysis(major.trim(), sentences)); setAnalyzedAt(new Date()); setStep('result'); }
    catch (e) { setError(e instanceof Error ? e.message : '결과를 받지 못했어요'); }
    finally { setBusy(false); }
  };
  const local = () => { setResult(keywordClassify(sentences)); setAnalyzedAt(new Date()); setError(''); setStep('result'); };
  const restart = () => { setStep('paste'); setResult(null); setConfirmed(false); setError(''); };

  return <section className="student-screen saenggibu" data-slug="saenggibu-ai" aria-label="생기부 AI">
    <div className="screen-heading"><h2 className="t-heading-1">생기부 AI</h2>{step !== 'paste' && <ButtonOutline onClick={restart}>새로 분석</ButtonOutline>}</div>
    <p className="t-caption">{STEPS.map(([s, l], i) => <span key={s} className={s === step ? 'step-current' : 'text-muted'}>{i ? ' · ' : ''}{l}</span>)}</p>

    {step === 'paste' && <section className="result-panel" aria-label="생기부 입력">
      <h3 className="t-heading-2">생기부를 영역별로 붙여넣어 주세요</h3>
      <p className="text-muted">붙여넣은 글은 보내기 전에 이름·학교명을 먼저 가려요.</p>
      <label>희망 계열·학과<input value={major} maxLength={40} onChange={e => setMajor(e.target.value)} placeholder="예: 화학공학과" /></label>
      {RECORD_AREAS.map(a => <div key={a}><label>{a}<textarea rows={4} maxLength={AREA_MAX} value={areas[a] ?? ''} onChange={e => setAreas({ ...areas, [a]: e.target.value })} /></label>
        <span className="t-caption text-muted num saenggibu__count">{(areas[a] ?? '').length}/{AREA_MAX}</span></div>)}
      <ButtonPrimary disabled={!canNext} onClick={() => { setConfirmed(false); setStep('mask'); }}>가림 확인으로</ButtonPrimary>
      {!canNext && <p className="t-caption text-muted">희망 학과와 교과 세특을 적으면 다음으로 갈 수 있어요.</p>}
    </section>}

    {step === 'mask' && <>
      <h3 className="t-heading-2">보내기 전에 가린 내용을 확인해 주세요</h3>
      <label>더 가릴 낱말(쉼표로 구분, 내 이름·학교·선생님 이름)<input value={extra} onChange={e => setExtra(e.target.value)} placeholder="예: 홍길동, 한빛" /></label>
      <div className="mask-words" aria-label="가린 낱말">{words.length ? words.map(w => <button key={w} className="data-status-badge" onClick={() => setRemoved([...removed, w])} aria-label={`${w} 가림 풀기`}>{w} ✕</button>)
        : <span className="text-muted t-caption">자동으로 가린 낱말이 없어요. 이름 등을 위 칸에 적어 주세요.</span>}
        {removed.length > 0 && <button className="text-button" onClick={() => setRemoved([])}>푼 가림 되돌리기</button>}</div>
      <div className="mask-preview">{RECORD_AREAS.filter(a => masked[a].trim()).map(a => <div key={a}><p className="t-caption text-muted">{a}</p><p>{masked[a]}</p></div>)}</div>
      <label className="checkbox-label"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} /> 가린 내용을 확인했어요</label>
      {error && <div role="alert" className="error-note"><p>{error}</p><ButtonOutline onClick={local}>낱말로 나눠 보기</ButtonOutline></div>}
      <div className="toolbar"><ButtonOutline onClick={() => setStep('paste')}>뒤로</ButtonOutline>
        <ButtonPrimary disabled={!confirmed || busy || !sentences.length} onClick={send}>{busy ? 'AI가 읽고 있어요' : 'AI 분석 보내기'}</ButtonPrimary></div>
      <p className="notice">가린 뒤의 글만 보내고, 서버에는 저장하지 않아요.{!aiProxyUrl() && ' 지금은 AI 연결을 준비하고 있어서, 이 기기 안에서 낱말로 나눠 볼 수 있어요.'}</p>
      {!aiProxyUrl() && <ButtonOutline disabled={!confirmed || !sentences.length} onClick={local}>낱말로 나눠 보기</ButtonOutline>}
    </>}

    {step === 'result' && result && <Result result={result} major={major} analyzedAt={analyzedAt} onRestart={restart} />}
  </section>;
}

type ResultTab = 'text' | 'questions' | 'gaps';
const hlClass = (item: string | null, focus: string | null) => !item ? '' : focus && focus !== item ? ' is-dim' : ` hl-${competencyOf(item).key}`;

/** 결과 단계(work/saenggibu-ai/02-spec.md v2): 왼쪽 원문 색칠·면접 질문·보완점 탭 + 오른쪽 평가 항목 패널. 모바일은 패널이 먼저예요. */
function Result({ result, major, analyzedAt, onRestart }: { result: Analysis; major: string; analyzedAt: Date; onRestart: () => void }) {
  const [tab, setTab] = useState<ResultTab>('text'), [focus, setFocus] = useState<string | null>(null), [bubble, setBubble] = useState<number | null>(null), [flash, setFlash] = useState<number | null>(null);
  const s = summary(result), total = result.sentences.length, ai = result.mode === 'ai';
  const label = ai ? <span className="ai-label">AI 분석 · 참고용</span> : <span className="t-caption text-muted">자동 · 낱말로 나눴어요 · 참고용</span>;
  const focused = focus ? result.sentences.filter(x => x.item === focus) : [];
  const inFocus = (quote: string) => !focus || focused.some(x => x.text.includes(quote) || quote.includes(x.text));
  const questions = result.questions.filter(q => inFocus(q.quote));
  const pick = (item: string) => { const next = focus === item ? null : item; setFocus(next); setBubble(null);
    const first = next && result.sentences.find(x => x.item === next); if (first && tab === 'text') document.getElementById(`sg-s${first.index}`)?.scrollIntoView?.({ block: 'center', behavior: 'smooth' }); };
  const showInText = (quote: string) => { const hit = result.sentences.find(x => x.text.includes(quote)); setTab('text'); setFocus(null);
    if (hit) { setFlash(hit.index); requestAnimationFrame(() => document.getElementById(`sg-s${hit.index}`)?.scrollIntoView?.({ block: 'center', behavior: 'smooth' })); window.setTimeout(() => setFlash(null), 1200); } };
  const when = analyzedAt.toLocaleString('sv-SE').slice(0, 16);
  const textWithMask = (t: string) => t.split(MASK).flatMap((part, i) => i ? [<span key={`m${i}`} className="mask-block" aria-label="가린 낱말">■■■</span>, part] : [part]);

  const panel = <aside className="sg-panel" aria-label="평가 항목">
    <div className="section-row"><h3 className="t-heading-4">평가 항목 <span className="t-caption text-muted num">{total}문장{ai ? '' : ' · 자동'}</span></h3>{ai && label}</div>
    {!s.counts.some(c => c.total) ? <div className="empty-state"><h3 className="t-heading-4">나눌 수 있는 문장이 없어요</h3><p>교과 세특이나 창체 글을 더 붙여넣어 주세요.</p><ButtonPrimary onClick={onRestart}>다시 붙여넣기</ButtonPrimary></div> : <>
      <div className="competency-bar" aria-hidden="true">{s.counts.map(c => <i key={c.key} className={`comp-${c.key}`} style={{ flexGrow: c.total }} />)}</div>
      <p className="t-caption num">{s.counts.map(c => `${c.name.replace('역량', '')} ${c.total}`).join(' · ')}</p>
      <p className="t-caption text-muted">문장 수는 나눈 문장의 개수예요. 평가 점수가 아니에요.</p>
      {s.missingLabel && <p className="t-body-sm"><span className="t-caption text-muted">빠진 항목</span> {s.missingLabel}</p>}
      <div className="sg-cards">{s.counts.map(c => <section key={c.key} className="sg-card" aria-label={c.name}>
        <h4 className="sg-card__head"><span><i className={`comp-dot comp-${c.key}`} /> {c.name}</span><span className="t-caption num">{c.total}문장</span></h4>
        <ul>{c.items.map(i => <li key={i.name}><button type="button" className={`sg-item${focus === i.name ? ' is-selected' : ''}`} disabled={!i.count} aria-pressed={focus === i.name} onClick={() => pick(i.name)}>
          <span>{i.name}</span><span className="num">{i.count}</span></button></li>)}</ul></section>)}</div>
    </>}
    <p className="disclaimer-note">ⓘ {ai ? 'AI 진단은' : '낱말로 나눈 결과는'} 참고용이며 실제 평가와 다를 수 있어요 · 문장 수는 평가 점수가 아니에요 · 생기부 내용을 바꾸라는 지시가 아니에요 · 결과는 저장하지 않아요(화면을 닫으면 사라져요)</p>
  </aside>;

  return <div className="sg-result">
    <div className="sg-head">
      <h3 className="t-heading-1">내 기록을 역량별로 나눴어요</h3>
      <p className="t-body-lg text-muted">희망 학과 {major} 기준으로 나눴어요.</p>
      <p className="t-caption">{label} <span className="text-muted num">{when} {ai ? '분석' : '나눔'}</span></p>
      {ai && <p className="t-caption text-muted">AI 진단은 참고용이며 실제 평가와 다를 수 있어요.</p>}
      <button type="button" className="button-pill-soft sg-jump" onClick={() => document.getElementById('sg-text')?.scrollIntoView?.({ behavior: 'smooth' })}>원문 보기 ↓</button>
    </div>
    {panel}
    <div className="sg-body">
      <div id="sg-text"><SegmentedControl label="결과 보기" value={tab} onChange={setTab} options={[{ value: 'text', label: '원문 색칠' }, { value: 'questions', label: `면접 질문${ai ? ` ${result.questions.length}` : ''}` }, { value: 'gaps', label: '보완점' }]} /></div>

      {tab === 'text' && <section className="sg-text" aria-label="보낸 원문">
        <h4 className="t-heading-4">보낸 원문</h4><p className="t-caption text-muted">가린 뒤 보낸 내용이에요 · 이 기기에만 있어요</p>
        {focus ? <p className="section-row t-caption"><span>{focus} · {competencyOf(focus).name} 문장만 칠했어요 · {focused.length}문장</span><button type="button" className="button-pill-soft" onClick={() => setFocus(null)}>전체 보기</button></p>
          : <p className="section-row t-caption"><span className="sg-legend">{COMPETENCIES.map(c => <span key={c.key}><i className={`comp-dot comp-${c.key}`} /> {c.name}</span>)}</span><span className="text-muted">문장을 누르면 평가항목이 보여요</span></p>}
        {RECORD_AREAS.filter(a => result.sentences.some(x => x.area === a)).map(a => <div key={a} className="sg-area"><p className="t-caption text-muted">{a}</p>
          <p className="sg-para">{result.sentences.filter(x => x.area === a).map(x => <span key={x.index} id={`sg-s${x.index}`} role="button" tabIndex={0}
            className={`sg-sentence${hlClass(x.item, focus)}${flash === x.index ? ' is-flash' : ''}`} aria-label={`${x.text} · ${x.item ?? '나누지 않음'}`}
            onClick={() => setBubble(bubble === x.index ? null : x.index)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setBubble(bubble === x.index ? null : x.index); } }}>
            {textWithMask(x.text)}{bubble === x.index && <span className="sg-bubble">{x.item ? <><i className={`comp-dot comp-${competencyOf(x.item).key}`} /> {x.item} · {competencyOf(x.item).name}</> : '나누지 않은 문장이에요'}</span>}</span>)
            .flatMap((node, i) => i ? [' ', node] : [node])}</p></div>)}
        <p className="t-caption text-muted"><Icon name="lock" size={16} /> 가린 내용을 확인하고 보냈어요</p>
      </section>}

      {tab === 'questions' && (!ai ? <div className="empty-state"><h3 className="t-heading-4">면접 질문은 AI 분석에서 만들어요</h3><p>{aiProxyUrl() ? '내일 다시 AI 분석을 쓸 수 있어요.' : 'AI 연결이 준비되면 근거 문장과 함께 보여 줘요.'}</p></div>
        : <section aria-label="면접 질문"><p className="section-row t-caption"><span className="ai-label">AI 분석 · 참고용</span>{focus && <span>{focus} 문장에 연결된 질문만 보여요 · {questions.length}개</span>}</p>
          {!questions.length ? <p className="text-muted">{focus ? '이 항목에 연결된 질문이 없어요.' : '만들어진 면접 질문이 없어요.'}</p>
            : <div className="question-list">{questions.map((q, i) => <details key={i}><summary>{q.question}</summary><p className="t-caption text-muted">질문 의도</p><p>{q.intent}</p>
              <blockquote className="evidence-quote">{q.quote}</blockquote><button type="button" className="button-pill-soft" onClick={() => showInText(q.quote)}>원문에서 보기</button></details>)}</div>}</section>)}

      {tab === 'gaps' && (!ai ? <div className="empty-state"><h3 className="t-heading-4">보완점은 AI 분석에서 만들어요</h3><p>{s.missingLabel || '빠진 항목이 없어요.'}</p></div>
        : <section aria-label="보완점"><p className="t-caption"><span className="ai-label">AI 분석 · 참고용</span></p>
          {!result.gaps.length ? <p className="text-muted">제안할 보완점이 없어요.</p> : <ul className="sg-gaps">{result.gaps.map(g => <li key={g}>{g}</li>)}</ul>}</section>)}

      <ButtonOutline onClick={onRestart}>다른 학과로 다시 분석하기</ButtonOutline>
    </div>
  </div>;
}
