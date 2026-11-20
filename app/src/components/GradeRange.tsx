/** Shared 1–9 ruler. Only reviewed conversion results supply the position. */
export function GradeRange({ min, max, representative }: { min: number; max: number; representative?: number }) {
  const position = (value: number) => `${Math.max(0, Math.min(100, (value - 1) / 8 * 100))}%`;
  return <div className="grade-range" role="img" aria-label={`9등급 환산 범위 ${min.toFixed(2)}~${max.toFixed(2)}`}>
    <div className="grade-range-colors">{Array.from({ length: 9 }, (_, i) => <span key={i} style={{ background: `var(--color-grade-${i + 1})` }} />)}</div>
    <div className="grade-range-bracket" style={{ left: position(min), width: `${Math.max(.5, (max - min) / 8 * 100)}%` }} />
    {representative !== undefined && <svg className="grade-range-marker" aria-hidden="true" viewBox="0 0 16 16" style={{ left: position(representative) }}><circle cx="8" cy="8" r="6" fill="var(--color-canvas)" stroke="var(--color-accent)" /><circle cx="8" cy="8" r="3" fill="var(--color-accent)" /></svg>}
    <div className="grade-range-labels">{[1,2,3,4,5,6,7,8,9].map(n => <span key={n}>{n}</span>)}</div>
  </div>;
}
