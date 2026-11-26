import { useId, useMemo, useState } from 'react';
import { referenceConversion, referenceNote } from '../domain/referenceConversion';
import { formatScenarioRange, scenarioLabels, type Scenario } from '../engine/scenarioReference';
import { GradeRange } from './GradeRange';
import '../styles/quick-calculator.css';

export function ReferenceGradeCalculator() {
  const id = useId();
  const [raw, setRaw] = useState('2.00');
  const result = useMemo(() => referenceConversion(raw), [raw]);
  const range = result?.grade9Range;
  return <div className="quick-calculator">
    <div className="quick-calculator__intro">
      <p>5등급제 평균 내신을 입력하면 낙관·보수 시나리오를 따로 계산해요.</p>
      <p className="t-caption text-muted">성적 저장 없이 이용 · 자체 수치 모델 v0.5 · 기기에서 계산</p>
    </div>
    <div className="quick-calculator__fields">
      <div className="quick-calculator__field quick-calculator__field--active">
        <label htmlFor={`${id}-five`}>5등급제 평균</label>
        <div className="quick-calculator__number"><input id={`${id}-five`} type="text" inputMode="decimal"
          value={raw} autoComplete="off" spellCheck={false} aria-invalid={!result}
          aria-describedby={`${id}-hint${!result ? ` ${id}-error` : ''}`} onChange={e => setRaw(e.target.value)} /><span>등급</span></div>
        <span id={`${id}-hint`} className="t-caption text-muted">1~5등급 · 입력 기준</span>
        <input type="range" aria-label="5등급제 평균 슬라이더" min={1} max={5} step={.01}
          value={result?.grade5 ?? 1} onChange={e => setRaw(e.target.value)} />
        <div className="quick-calculator__presets" role="group" aria-label="5등급제 평균 빠른 선택">
          {[1, 1.3, 1.5, 2, 3].map(n => <button type="button" className="button-outline" key={n} onClick={() => setRaw(String(n))}>{n}등급</button>)}
        </div>
      </div>
      {(['optimistic', 'conservative'] as Scenario[]).map(name => <div className="quick-calculator__field" key={name}>
        <label htmlFor={`${id}-${name}`}>{scenarioLabels[name]}</label>
        <div className="quick-calculator__number"><input id={`${id}-${name}`} readOnly value={result ? formatScenarioRange(result.scenarios[name].range9) : ''} placeholder="—" /></div>
        <span className="t-caption text-muted">9등급제 대응 · 표의 반올림 포함</span></div>)}
    </div>
    {!result && <p className="notice" id={`${id}-error`} role="alert">{raw.trim() ? '5등급제 평균은 1~5 사이의 숫자로 입력해 주세요.' : '계산할 값을 입력해 주세요.'}</p>}
    <div className="quick-calculator__result" role="status" aria-live="polite" aria-atomic="true">
      {result ? <><p>5등급제 평균 <strong>{result.grade5.toFixed(2)}</strong></p>
        {(['optimistic', 'conservative'] as Scenario[]).map(name => <p key={name}>{scenarioLabels[name]} <strong>{formatScenarioRange(result.scenarios[name].range9)}</strong></p>)}
        {result.status !== 'source_scenarios' && <p>자료 지원 구간 밖의 값은 계산하지 않아요.</p>}
        {Object.values(result.scenarios).some(s => s.range9 && s.supportTruncated) && <p>자료 끝에 걸친 구간이에요. 확인된 범위만 표시해요.</p>}
        {Object.values(result.scenarios).some(s => s.maxSourceGap9 > .25) && <p>인접 대응점 간격이 넓어 세밀한 해석은 어려워요.</p>}</>
        : <p>올바른 값을 입력하면 계산 결과가 여기에 나타나요.</p>}
    </div>
    {range && <GradeRange min={range[0]} max={range[1]} representative={result?.estimate9 ?? undefined} digits={2} />}
    <p className="t-caption text-muted">{referenceNote}</p>
    <details className="quick-calculator__method"><summary>계산 방법과 해석</summary>
      <p>대응표의 단조 관계를 유지하고 인접 점 사이만 선형 보간해요. 같은 입력과 모델 버전에는 같은 결과가 나와요.</p>
      <p>낙관·보수는 서로 다른 가정이며 평균내어 대표값을 만들지 않아요. 표시 범위에는 원표의 소수 둘째 자리 반올림을 반영해요.</p>
      <p>실제 학생의 개인차나 합격 여부로 검증한 범위는 아니에요. 반영 교과·학점·학기 차이는 별도 확인이 필요해요.</p>
    </details>
  </div>;
}
