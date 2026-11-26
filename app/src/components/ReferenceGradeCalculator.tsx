import { useId, useMemo, useState } from 'react';
import { referenceConversion, referenceNote } from '../domain/referenceConversion';
import { GradeRange } from './GradeRange';
import '../styles/quick-calculator.css';

export function ReferenceGradeCalculator() {
  const id = useId();
  const [raw, setRaw] = useState('2.00');
  const result = useMemo(() => referenceConversion(raw), [raw]);
  const range = result?.grade9Range;
  return <div className="quick-calculator">
    <div className="quick-calculator__intro">
      <p>5등급제 평균 내신을 입력하면 참고 대표값과 범위를 바로 계산해요.</p>
      <p className="t-caption text-muted">성적 저장 없이 이용 · 자체 수치 모델 v0.4 · 기기에서 계산</p>
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
      <div className="quick-calculator__field"><label htmlFor={`${id}-nine`}>9등급제 참고 대표값</label>
        <div className="quick-calculator__number"><input id={`${id}-nine`} readOnly value={result?.estimate9?.toFixed(2) ?? ''} placeholder="—" /><span>등급</span></div>
        <span className="t-caption text-muted">모델의 참고 합성값 · 직접 입력하지 않아요</span></div>
      <div className="quick-calculator__field"><label htmlFor={`${id}-range`}>9등급제 참고 범위</label>
        <div className="quick-calculator__number"><input id={`${id}-range`} readOnly value={range ? `${range[0].toFixed(2)}~${range[1].toFixed(2)}` : ''} placeholder="—" /></div>
        <span className="t-caption text-muted">자료 차이와 검증잔차를 반영한 범위</span></div>
    </div>
    {!result && <p className="notice" id={`${id}-error`} role="alert">{raw.trim() ? '5등급제 평균은 1~5 사이의 숫자로 입력해 주세요.' : '계산할 값을 입력해 주세요.'}</p>}
    <div className="quick-calculator__result" role="status" aria-live="polite" aria-atomic="true">
      {result ? <><p>5등급제 <strong>{result.grade5.toFixed(2)}</strong> → 9등급제 참고 대표값 <strong>{result.estimate9?.toFixed(2) ?? '미산출'}</strong></p>
        {range && <p>참고 범위 <strong>{range[0].toFixed(2)}~{range[1].toFixed(2)}</strong></p>}
        {result.estimate9 === null && <p>일부 곡선의 지원 구간 밖이라 대표값 없이 범위만 표시해요.</p>}</>
        : <p>올바른 값을 입력하면 계산 결과가 여기에 나타나요.</p>}
    </div>
    {range && <GradeRange min={range[0]} max={range[1]} representative={result?.estimate9 ?? undefined} digits={2} />}
    <p className="t-caption text-muted">{referenceNote}</p>
    <details className="quick-calculator__method"><summary>계산 방법과 해석</summary>
      <p>미리 적합한 단조 곡선으로 계산하며, 같은 입력과 모델 버전에는 같은 결과가 나와요.</p>
      <p>평균 하나로는 반영 교과와 학점 구성을 확인할 수 없어 산식 미지정 참고 시나리오를 사용해요. 전국 석차나 대학의 합격 예측은 계산하지 않아요.</p>
      <p>자료별 성적 정의와 모집단이 달라 참고 범위로 봐 주세요. 현재 성적 참고자료는 3개 학기 기준이에요.</p>
    </details>
  </div>;
}
