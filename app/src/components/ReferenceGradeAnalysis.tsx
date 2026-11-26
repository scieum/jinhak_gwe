import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useStudent } from '../store/studentDb';
import { combinations, fiveToNineFor } from '../domain/results';
import { referenceNote } from '../domain/referenceConversion';
import { SegmentedControl } from './SegmentedControl';
import { TraceAccordion } from './CalculationDetails';
import { GradeRange } from './GradeRange';
import { Icon } from './Icon';

export function ReferenceGradeAnalysis({ viewTabs, desktop }: { viewTabs: ReactNode; desktop: boolean }) {
  const state = useStudent(), data = state?.data;
  const [combo, setCombo] = useState('전 교과');
  const r = useMemo(() => data ? fiveToNineFor(data.grades, combo) : null, [data, combo]);
  const comboTabs = <SegmentedControl label="반영 교과" value={combo} onChange={setCombo} options={Object.keys(combinations).map(value => ({ value, label: value }))} />;
  if (!state) return <>{viewTabs}<p role="status">기기에 저장된 성적을 읽고 있어요.</p></>;
  if (!data) return <>{viewTabs}<div className="f2n-card f2n-error" role="alert"><p>{state.error}</p></div></>;
  if (!r || r.min === null || r.max === null) return <div className="f2n-layout"><div className="f2n-main">{viewTabs}{comboTabs}
    <div className="empty-state"><Icon name="chart-column" size={48} /><h3 className="t-heading-4">{data.grades.length ? '환산할 수 있는 과목이 없어요' : '아직 입력한 성적이 없어요'}</h3>
      <p>선택한 교과에 석차등급이 있고 수강자 6명 이상인 과목을 입력해 주세요.</p><Link className="button-primary" to="/grade-input">성적 입력하기</Link></div></div></div>;
  const range = `${r.min.toFixed(2)}~${r.max.toFixed(2)}`;
  const representative = r.representative === null ? '미산출' : r.representative.toFixed(2);
  const at = (n: number) => Math.min(9, Math.max(1, n)).toFixed(1);
  const entry = <div className="f2n-entry"><Link className="button-outline" to={`/national-placement?min=${at(r.min - .5)}&max=${at(r.max + .5)}`}><Icon name="chart-column" size={20} />이 등급대 입결 보기</Link>
    <p className="t-caption text-muted">과거 입결과 비교하는 목록이며 합격할 대학을 뜻하지 않아요.</p></div>;
  const tile = <div className="stat-tile f2n-tile"><span className="t-caption text-muted">내 환산 9등급 (참고 추정)</span>
    <strong className="t-display num f2n-range">약 {range}</strong>
    {!desktop && <p className="num">5등급 평균 {r.g5?.toFixed(2)} → 참고 대표값 {representative}</p>}</div>;
  const rangeCard = <section className="f2n-card" aria-label="5 to 9 내 위치"><h3 className="t-title">5 to 9 내 위치</h3>
    <GradeRange min={r.min} max={r.max} representative={r.representative ?? undefined} digits={2} />
    <span className="data-status-badge">참고 추정 · v{r.modelVersion}</span>{entry}</section>;
  const methodCard = <section className="f2n-card" aria-label="수치 모델 계산"><h3 className="t-heading-4">수치 모델 계산</h3>
    <table className="data-table f2n-methods f2n-reference-methods"><thead><tr><th scope="col">항목</th><th scope="col">값</th></tr></thead><tbody>
      <tr><th scope="row">학점 가중 5등급 평균</th><td className="num">{r.g5?.toFixed(2)}</td></tr>
      <tr><th scope="row">9등급 참고 대표값</th><td className="num">{representative}</td></tr>
      <tr><th scope="row">9등급 참고 범위</th><td className="num">{range}</td></tr>
    </tbody></table><p className="t-body-sm text-muted">대표값은 자료 계열을 같은 비중으로 결합한 참고값이에요. 범위에는 자료 차이와 검증잔차를 반영했어요.</p></section>;
  const reasonCard = <section className="f2n-card" aria-label="환산 해석 기준"><h3 className="t-heading-4">환산 해석 기준</h3>
    <table className="data-table f2n-reasons"><tbody><tr><th scope="row">반영 과목</th><td>{r.stats.rankedCount}개</td></tr>
      <tr><th scope="row">환산 제외 과목</th><td>{r.stats.excludedCount}개</td></tr>
      <tr><th scope="row">입력 학기</th><td>{r.semesters}개 학기</td></tr></tbody></table>
    {r.basisNotes.map(note => <p key={note} className="t-body-sm text-muted">{note}</p>)}</section>;
  const trace = <TraceAccordion trace={[]} open={desktop} note="중간 단계는 반올림하지 않아요. 실제 학생의 환산 정확도를 검증한 확정식은 아니에요.">
    <ol className="f2n-steps">{r.trace.filter(t => !t.id.startsWith('basis-')).map(t => <li key={t.id}>
      <span>{t.label}</span><span>{typeof t.value === 'number' ? (t.id === 'excluded' ? String(t.value) : t.value.toFixed(2)) : t.value}</span>
    </li>)}</ol></TraceAccordion>;
  const note = <p className="disclaimer-note t-caption text-muted f2n-note"><Icon name="info" size={16} /><span>{referenceNote}</span></p>;
  return desktop ? <div className="f2n-layout"><div className="f2n-main">{viewTabs}{comboTabs}{tile}
    <p className="num f2n-summary">5등급 평균 {r.g5?.toFixed(2)} · 대표값 {representative} · 반영 과목 {r.stats.rankedCount}개</p>{rangeCard}{methodCard}</div>
    <aside className="f2n-aside" aria-label="환산 해석과 근거">{reasonCard}{trace}</aside>{note}</div>
    : <div className="f2n-layout">{viewTabs}{tile}{comboTabs}{rangeCard}{methodCard}<aside className="f2n-aside" aria-label="환산 해석과 근거">{reasonCard}{trace}</aside>{note}</div>;
}
