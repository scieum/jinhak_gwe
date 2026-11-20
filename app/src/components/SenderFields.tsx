import type { Sender } from '../io/exchange';

/** 학생 → 교사 파일에 붙는 이름표(R-PRIV-003: 실명 대신 번호·별칭). */
export function SenderFields({ value, onChange }: { value: Partial<Sender>; onChange: (v: Partial<Sender>) => void }) {
  return <fieldset className="form-grid"><legend className="t-caption text-muted">선생님이 알아볼 이름표 · 실명은 넣지 않아요</legend>
    <label>학급 코드<input value={value.class_code ?? ''} maxLength={4} autoCapitalize="characters" onChange={e => onChange({ ...value, class_code: e.target.value })} placeholder="예: 7Q4K" /></label>
    <label>번호<input inputMode="numeric" value={value.number ?? ''} maxLength={2} onChange={e => onChange({ ...value, number: e.target.value })} /></label>
    <label>별칭<input value={value.alias ?? ''} maxLength={10} onChange={e => onChange({ ...value, alias: e.target.value })} placeholder="예: 하늘" /></label>
  </fieldset>;
}
