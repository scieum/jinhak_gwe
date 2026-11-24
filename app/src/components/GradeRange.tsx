/** range-bar-5to9(Figma 821:787): 1~9 등급 색 트랙 · 범위 괄호 · 대표값(말풍선 + 원 + 세로선). 검수된 환산 결과만 위치를 줘요. */
export function GradeRange({ min, max, representative, digits = 1 }: { min: number; max: number; representative?: number; digits?: number }) {
  const at = (value: number) => `calc(20px + (100% - 40px) * ${Math.max(0, Math.min(1, (value - 1) / 8))})`; // 트랙 양끝 20px 안쪽 = 1 · 9
  const one = (v: number) => (Math.round(v * 10) / 10).toFixed(1);
  return <div className="grade-range" role="img" aria-label={`환산 9등급 약 ${one(min)}에서 ${one(max)} 사이${representative === undefined ? '' : `, 대표값 ${one(representative)}`}`}>
    {/* 1·9는 반 칸, 2~8은 한 칸: 색이 눈금 숫자 가운데에 오게 */}
    <div className="grade-range-colors">{Array.from({ length: 9 }, (_, i) => <span key={i} style={{ background: `var(--color-grade-${i + 1})`, flexGrow: i === 0 || i === 8 ? 1 : 2 }} />)}</div>
    <div className="grade-range-bracket" style={{ left: at(min), width: `calc((100% - 40px) * ${Math.max(0.005, (max - min) / 8)})` }} />
    {representative !== undefined && <div className="grade-range-marker" aria-hidden="true" style={{ left: at(representative) }}><span className="num">{digits === 1 ? one(representative) : representative.toFixed(digits)}</span><svg viewBox="0 0 20 20" width="20" height="20"><circle cx="10" cy="10" r="9.5" fill="var(--color-canvas)" stroke="var(--color-ink)" /><circle cx="10" cy="10" r="6" fill="var(--color-accent)" /></svg></div>}
    <div className="grade-range-labels">{[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => <span key={n} style={{ left: at(n) }}>{n}</span>)}</div>
  </div>;
}
