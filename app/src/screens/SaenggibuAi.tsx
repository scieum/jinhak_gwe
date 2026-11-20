import { useMemo, useState } from 'react';
import { ButtonOutline, ButtonPrimary } from '../components/Buttons';
import { COMPETENCIES, competencyOf } from '../data/competency-items';
import { AREA_MAX, RECORD_AREAS, aiProxyUrl, applyMask, autoMaskWords, keywordClassify, requestAnalysis, splitSentences, summary,
  type Analysis, type RecordArea } from '../domain/saenggibu';
import '../styles/saenggibu.css';

type Step = 'paste' | 'mask' | 'result';
const STEPS: [Step, string][] = [['paste', '1 붙여넣기'], ['mask', '2 가림 확인'], ['result', '3 결과']];

export function SaenggibuAi() {
  const [step, setStep] = useState<Step>('paste'), [major, setMajor] = useState(''), [areas, setAreas] = useState<Partial<Record<RecordArea, string>>>({});
  const [extra, setExtra] = useState(''), [removed, setRemoved] = useState<string[]>([]), [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [result, setResult] = useState<Analysis | null>(null);
  const all = RECORD_AREAS.map(a => areas[a] ?? '').join('\n');
  const words = useMemo(() => [...new Set([...autoMaskWords(all), ...extra.split(',').map(w => w.trim()).filter(w => w.length > 1)])].filter(w => !removed.includes(w)), [all, extra, removed]);
  const masked = useMemo(() => Object.fromEntries(RECORD_AREAS.map(a => [a, applyMask(areas[a] ?? '', words)])) as Record<RecordArea, string>, [areas, words]);
  const sentences = useMemo(() => splitSentences(masked), [masked]);
  const canNext = !!major.trim() && !!areas['교과 세특']?.trim();
  const send = async () => {
    setBusy(true); setError('');
    try { setResult(await requestAnalysis(major.trim(), sentences)); setStep('result'); }
    catch (e) { setError(e instanceof Error ? e.message : '결과를 받지 못했어요'); }
    finally { setBusy(false); }
  };
  const local = () => { setResult(keywordClassify(sentences)); setError(''); setStep('result'); };
  const restart = () => { setStep('paste'); setResult(null); setConfirmed(false); setError(''); };

  return <section className="student-screen saenggibu" data-slug="saenggibu-ai" aria-label="생기부 AI">
    <div className="screen-heading"><h2 className="t-heading-1">생기부 AI</h2>{step !== 'paste' && <ButtonOutline onClick={restart}>새로 분석</ButtonOutline>}</div>
    <p className="t-caption">{STEPS.map(([s, l], i) => <span key={s} className={s === step ? 'step-current' : 'text-muted'}>{i ? ' · ' : ''}{l}</span>)}</p>

    {step === 'paste' && <>
      <h3 className="t-heading-2">생기부를 영역별로 붙여넣어 주세요</h3>
      <p className="text-muted">붙여넣은 글은 보내기 전에 이름·학교명을 먼저 가려요.</p>
      <label>희망 계열·학과<input value={major} maxLength={40} onChange={e => setMajor(e.target.value)} placeholder="예: 화학공학과" /></label>
      {RECORD_AREAS.map(a => <div key={a}><label>{a}<textarea rows={4} maxLength={AREA_MAX} value={areas[a] ?? ''} onChange={e => setAreas({ ...areas, [a]: e.target.value })} /></label>
        <span className="t-caption text-muted num saenggibu__count">{(areas[a] ?? '').length}/{AREA_MAX}</span></div>)}
      <ButtonPrimary disabled={!canNext} onClick={() => { setConfirmed(false); setStep('mask'); }}>가림 확인으로</ButtonPrimary>
      {!canNext && <p className="t-caption text-muted">희망 학과와 교과 세특을 적으면 다음으로 갈 수 있어요.</p>}
    </>}

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

    {step === 'result' && result && <Result result={result} major={major} />}
  </section>;
}

function Result({ result, major }: { result: Analysis; major: string }) {
  const [focus, setFocus] = useState<string | null>(null);
  const s = summary(result), total = result.sentences.length;
  const label = result.mode === 'ai' ? <span className="ai-label">AI 분석 · 참고용</span> : <span className="t-caption text-muted">자동 · 낱말로 나눴어요 · 참고용</span>;
  return <>
    <h3 className="t-heading-2">{result.mode === 'ai' ? 'AI가 읽은 내 기록이에요' : '낱말로 나눠 본 내 기록이에요'}</h3>
    <p className="text-muted">희망 학과 {major} 기준으로 나눴어요. {label}</p>
    {!s.counts.some(c => c.total) ? <div className="empty-state"><h3 className="t-heading-3">나눌 수 있는 문장이 없어요</h3><p>교과 세특이나 창체 글을 더 붙여넣어 주세요.</p></div> : <>
      <div className="competency-bar" aria-hidden="true">{s.counts.map(c => <i key={c.key} className={`comp-${c.key}`} style={{ flexGrow: c.total }} />)}</div>
      <p className="t-caption">{s.counts.map(c => `${c.name.replace('역량', '')} ${c.total}`).join(' · ')} · 전체 {total}문장</p>
      <p className="t-caption text-muted">문장 수는 나눈 문장의 개수예요. 평가 점수가 아니에요.</p>
      {s.missingLabel && <p className="notice">{s.missingLabel}</p>}
      <div className="competency-cards">{s.counts.map(c => <article key={c.key} className="univ-card"><h4 className="t-heading-4"><i className={`comp-dot comp-${c.key}`} /> {c.name} <span className="num">{c.total}</span></h4>
        <ul>{c.items.map(i => <li key={i.name}><button className={`text-button${focus === i.name ? ' is-selected' : ''}`} onClick={() => setFocus(focus === i.name ? null : i.name)}>{i.name} <span className="num">{i.count}</span></button></li>)}</ul></article>)}</div>
    </>}
    <h3 className="t-heading-3">원문 문장</h3>
    <ol className="sentence-list">{result.sentences.filter(x => !focus || x.item === focus).map(x => { const c = x.item ? competencyOf(x.item) : null;
      return <li key={x.index} className={c ? `tint-${c.key}` : ''}><p>{x.text}</p><p className="t-caption text-muted">{x.area} · {x.item ? `${x.item} · ${c!.name}` : '나누지 않음'}</p></li>; })}</ol>
    <h3 className="t-heading-3">면접 예상 질문 {result.questions.length ? result.questions.length + '개' : ''}</h3>
    {result.questions.length ? <div className="question-list">{result.questions.map((q, i) => <details key={i}><summary>{q.question}</summary><p className="t-caption text-muted">질문 의도</p><p>{q.intent}</p><blockquote className="evidence-quote">{q.quote}</blockquote></details>)}</div>
      : <div className="empty-state"><h3 className="t-heading-3">면접 질문은 AI 분석에서 만들어요</h3><p>AI 연결이 준비되면 근거 문장과 함께 보여 줘요.</p></div>}
    {result.gaps.length > 0 && <><h3 className="t-heading-3">남은 학기에 해볼 수 있는 것</h3><ul>{result.gaps.map(g => <li key={g}>{g}</li>)}</ul></>}
    <p className="disclaimer-note">ⓘ {result.mode === 'ai' ? 'AI 진단은' : '낱말로 나눈 결과는'} 참고용이며 실제 평가와 다를 수 있어요 · 생기부 내용을 바꾸라는 지시가 아니에요 · 붙여넣은 글은 이 기기 밖에 저장하지 않아요</p>
    <p className="t-caption text-muted">평가항목: {COMPETENCIES.map(c => `${c.name}(${c.items.map(i => i.name).join('·')})`).join(' / ')}</p>
  </>;
}
