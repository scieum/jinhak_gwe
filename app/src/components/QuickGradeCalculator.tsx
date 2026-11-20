import { useId, useState, type CSSProperties } from 'react';
import { quickBands, quickConvert, quickLimits, type QuickAxis } from '../engine/quickConversion';
import '../styles/quick-calculator.css';

const fields: { axis: QuickAxis; label: string; unit: string; presets: number[] }[] = [
  { axis: 'five', label: '5등급제 평균', unit: '등급', presets: [1, 2, 3, 4, 5] },
  { axis: 'nine', label: '9등급제 평균', unit: '등급', presets: [1, 3, 5, 7, 9] },
  { axis: 'percent', label: '상위 누적 비율', unit: '%', presets: [4, 10, 25, 50, 75] },
];

export function QuickGradeCalculator() {
  const id = useId();
  const [input, setInput] = useState<{ axis: QuickAxis; raw: string }>({ axis: 'five', raw: '2.00' });
  const result = quickConvert(input.axis, input.raw);
  const edit = (axis: QuickAxis, raw: string) => setInput({ axis, raw });
  return <div className="quick-calculator">
    <div className="quick-calculator__intro">
      <p>평균 등급 하나만 입력해 보세요. 세 값 중 어느 것을 바꿔도 바로 계산해요.</p>
      <p className="t-caption text-muted">성적 저장 없이 이용 · 등급 구간 중앙값으로 계산한 참고용 추정</p>
    </div>
    <div className="quick-calculator__fields">
      {fields.map(({ axis, label, unit, presets }) => {
        const [min, max] = quickLimits[axis];
        const value = axis === input.axis ? input.raw : result ? result[axis].toFixed(2) : '';
        const invalid = axis === input.axis && !result;
        return <div key={axis} className={`quick-calculator__field${input.axis === axis ? ' quick-calculator__field--active' : ''}`}>
          <label htmlFor={`${id}-${axis}`}>{label}</label>
          <div className="quick-calculator__number">
            <input id={`${id}-${axis}`} type="text" inputMode="decimal" value={value}
              autoComplete="off" spellCheck={false} aria-invalid={invalid}
              aria-describedby={`${id}-${axis}-hint${invalid ? ` ${id}-error` : ''}`}
              onChange={e => edit(axis, e.target.value)} />
            <span>{unit}</span>
          </div>
          <span id={`${id}-${axis}-hint`} className="t-caption text-muted">{min}~{max}{unit}{axis === input.axis ? ' · 입력 기준' : ' · 변환값'}</span>
          <input type="range" aria-label={`${label} 슬라이더`} min={min} max={max} step={0.01}
            value={result?.[axis] ?? min} onChange={e => edit(axis, e.target.value)} />
          <div className="quick-calculator__presets" role="group" aria-label={`${label} 빠른 선택`}>
            {presets.map(n => <button type="button" className="button-outline" key={n}
              onClick={() => edit(axis, String(n))}>{n}{unit}</button>)}
          </div>
        </div>;
      })}
    </div>
    {!result && <p className="notice" id={`${id}-error`} role="alert">{input.raw.trim() === '' ? '계산할 값을 입력해 주세요.' : `${fields.find(f => f.axis === input.axis)!.label}은 ${quickLimits[input.axis][0]}~${quickLimits[input.axis][1]} 사이의 숫자로 입력해 주세요.`}</p>}
    <div className="quick-calculator__result" role="status" aria-live="polite" aria-atomic="true">
      {result ? <>
        <span className="t-caption">구간 중앙값 기준 · 추정 결과</span>
        <p className="quick-calculator__equation"><span>5등급제 <strong>{result.five.toFixed(2)}</strong></span><span aria-hidden="true">↔</span><span>9등급제 <strong>{result.nine.toFixed(2)}</strong></span></p>
        <p>상위 누적 비율 약 <strong>{result.percent.toFixed(2)}%</strong></p>
      </> : <p>올바른 값을 입력하면 변환 결과가 여기에 나타나요.</p>}
    </div>
    {result && <>
      {result.capped && <p className="t-caption">끝 구간에서는 평균 등급을 최저·최고 등급으로 제한해요. 이때 등급만으로 원래 누적 비율을 되돌릴 수는 없어요.</p>}
      <div className="quick-calculator__scales" aria-label="등급제별 명목 누적 비율 구간">
        {(['five', 'nine'] as const).map(axis => <div key={axis}>
          <p className="t-caption">{axis === 'five' ? '5' : '9'}등급제 구간</p>
          <div className="quick-calculator__scale" role="img" aria-label={`${axis === 'five' ? '5' : '9'}등급제 명목 구간에서 상위 ${result.percent.toFixed(2)}% 위치`}>
            {quickBands[axis].slice(1).map((end, i) => <span key={end} style={{ flex: end - quickBands[axis][i], '--band-color': `var(--color-grade-${i + 1})` } as CSSProperties}
              title={`${i + 1}등급: 상위 ${quickBands[axis][i]}~${end}%`}>{i + 1}</span>)}
            <i style={{ left: `${result.percent}%` }} aria-hidden="true" />
          </div>
        </div>)}
        <div className="quick-calculator__scale-labels t-caption text-muted"><span>상위 0%</span><span>50%</span><span>100%</span></div>
      </div>
    </>}
    <p className="t-caption text-muted">누적 비율은 계산을 위한 이론값이며 실제 전국 석차가 아니에요. 대학이 정한 공식 환산점수와도 다를 수 있어요.</p>
    <details className="quick-calculator__method">
      <summary>계산 방법과 참고 사이트의 차이</summary>
      <p>5등급 구간의 중앙값 5·22·50·78·95%와 9등급 구간의 중앙값 2·7.5·17·31.5·50·68.5·83·92.5·98%를 연결하고, 사이 값은 직선으로 계산해요. 예를 들어 5등급제 평균 2.00은 누적 22%, 9등급제 약 3.34로 변환해요.</p>
      <p>막대는 과목별 명목 등급 비율이에요. 여러 과목 평균의 실제 학생 분포를 뜻하지 않으며, 학점·동석차·수강자수는 반영하지 않아요.</p>
      <p>참고 사이트는 이론값 외에 부산교육청 예상 보정과 경기진학지도협의회 실측 분포도 제공해요. 표본과 학기가 다른 방식이므로 이 계산기의 결과와 다를 수 있어요. 여기서는 구간 중앙값 방식만 사용해요.</p>
      <div className="toolbar"><a href="https://www.moe.go.kr/boardCnts/viewRenew.do?boardID=294&boardSeq=96578&lev=0" target="_blank" rel="noreferrer">교육부 등급제 개편 자료 ↗</a><a href="https://jaehyung.kr/gradeCalculator" target="_blank" rel="noreferrer">참고 계산기 ↗</a></div>
    </details>
  </div>;
}
