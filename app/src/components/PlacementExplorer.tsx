import { useId, useState } from 'react';
import { admissionYear, programs, type ProgramData } from '../data/catalog';
import type { ComparisonBasis } from '../domain/comparison';
import { admissionSymbols, admissionTypes, canShowPosition, placementEntries, placementExtent, placementFields, type PlacementEntry, type PlacementMetric } from '../domain/placement';
import { Modal } from './Modal';
import { Icon } from './Icon';
import { SegmentedControl } from './SegmentedControl';
import '../styles/placement.css';

type View = '표' | '배치표' | '대학별 점';
type Range = { min: number; max: number };
export interface PlacementExplorerProps {
  onClose: () => void;
  combination: string;
  average: number | null;
  range?: Range;
  inputBasis?: ComparisonBasis;
  catalog?: readonly ProgramData[];
}
const rangeText = (r: Range) => `${(Math.floor(r.min * 10 + 1e-9) / 10).toFixed(1)}~${(Math.ceil(r.max * 10 - 1e-9) / 10).toFixed(1)}`;
const rowName = (r: PlacementEntry) => `${r.program.university} ${r.program.department} · ${r.program.program}`;

export function PlacementExplorer({ onClose, combination, average, range, inputBasis, catalog = programs }: PlacementExplorerProps) {
  const [view, setView] = useState<View>('배치표');
  const [type, setType] = useState('전체'), [region, setRegion] = useState('전체'), [field, setField] = useState('전체');
  const [year, setYear] = useState(admissionYear - 1), [metric, setMetric] = useState<PlacementMetric>('rank_grade');
  const descriptionId = useId();
  const released = placementEntries(catalog, year, metric);
  const regions = [...new Set(released.map(r => r.program.region!))].sort((a, b) => a.localeCompare(b, 'ko'));
  const rows = released.filter(r => (type === '전체' || r.program.admission_type === type)
    && (region === '전체' || r.program.region === region) && (field === '전체' || r.program.field === field));
  const overlay = canShowPosition(inputBasis, rows, range) ? range : undefined;
  const years = [...new Set([admissionYear - 1, ...catalog.flatMap(p => p.cut_basis && Number.isInteger(p.cut_basis.year)
    && p.cut_basis.year >= 2020 && p.cut_basis.year < admissionYear ? [p.cut_basis.year] : [])])].sort((a, b) => b - a);
  return <Modal label="작년 입결 기준 위치" wide onClose={onClose}>
    <div className="placement-explorer">
      <header className="placement-heading"><h2 className="t-heading-3">작년 입결 기준 위치</h2>
        <SegmentedControl label="입결 보기 방식" value={view} onChange={setView} options={(['표', '배치표', '대학별 점'] as const).map(value => ({ value, label: value }))} />
        <button className="placement-close" type="button" onClick={onClose} aria-label="입결 창 닫기"><Icon name="x" /></button></header>
      <p className="t-body-sm">{combination} · 내 5등급 평균 {average?.toFixed(2) ?? '입력 전'} → 환산 9등급 {range ? `약 ${rangeText(range)}` : '준비 중'}</p>
      <div className="placement-filters">
        <SegmentedControl label="입결 전형 유형" value={type} onChange={setType} options={[...admissionTypes, '전체'].map(value => ({ value, label: value }))} />
        <label>지역<select value={region} onChange={e => setRegion(e.target.value)}><option>전체</option>{regions.map(r => <option key={r}>{r}</option>)}</select></label>
        <label>계열<select value={field} onChange={e => setField(e.target.value)}><option>전체</option>{placementFields.map(f => <option key={f}>{f}</option>)}</select></label>
        <label>입결 학년도<select value={year} onChange={e => { setYear(Number(e.target.value)); setRegion('전체'); }}>{years.map(y => <option key={y} value={y}>{y}학년도</option>)}</select></label>
        <label>입결 지표<select value={metric} onChange={e => { setMetric(e.target.value as PlacementMetric); setRegion('전체'); }}><option value="rank_grade">원등급 평균</option><option value="converted_grade">환산 등급(추정)</option></select></label>
      </div>
      <div className="placement-meta"><p id={descriptionId} className="t-caption text-muted">{year}학년도 학과별 70% 컷 · 9등급 기준 · 올해 결과는 달라질 수 있어요</p>
        <div className="placement-legend" aria-label="전형 기호 범례">{admissionTypes.map(t => <span key={t}><span aria-hidden="true">{admissionSymbols[t]}</span> {t}</span>)}</div></div>
      <p className="sr-only" role="status">{rows.length}개 전형 · {view} 보기</p>
      {!released.length ? <div className="empty-state" role="status"><h3 className="t-heading-3">공식 입결 자료를 준비하고 있어요</h3><p>선택한 학년도·지표의 자료가 등록되면 표·배치표·점 그래프로 확인할 수 있어요.</p></div>
        : !rows.length ? <div className="empty-state" role="status"><h3 className="t-heading-3">고른 조건에 맞는 학과가 없어요</h3><p>전형 유형·계열·지역을 바꿔 보세요.</p><button type="button" className="button-outline" onClick={() => { setType('전체'); setRegion('전체'); setField('전체'); }}>필터 초기화</button></div>
        : <>
          {!overlay && <p className="notice">내 성적과 입결의 학년도·등급제·반영 교과·산식이 일치하기 전에는 내 위치선이나 점수 차이를 표시하지 않아요. 아래는 공식 발표 입결 자체의 위치예요.</p>}
          {overlay && <p className="placement-position">내 위치 · 환산 9등급 약 {rangeText(overlay)} (추정 범위)</p>}
          <div aria-describedby={descriptionId}>
            {view === '표' ? <PlacementTable rows={rows} /> : view === '배치표' ? <PlacementBoard rows={rows} range={overlay} field={field} /> : <PlacementDots rows={rows} range={overlay} />}
          </div>
        </>}
      <p className="t-caption text-muted">학과 이름을 누르면 입결 출처가 새 창으로 열려요. 전형별 지원 자격과 수능최저는 대학 공식 모집요강에서 확인해 주세요.</p>
    </div>
  </Modal>;
}

function PlacementTable({ rows }: { rows: readonly PlacementEntry[] }) {
  return <div className="table-scroll"><table className="data-table placement-table"><caption className="sr-only">공식 입결 70% 컷 목록</caption><thead><tr>{['대학·학과', '전형', '계열', '지역', '70% 컷', '반영 교과'].map(h => <th key={h} scope="col">{h}</th>)}</tr></thead><tbody>
    {rows.map(r => <tr key={r.program.id}><th scope="row"><a href={r.source} target="_blank" rel="noreferrer">{r.program.university} {r.program.department} ↗</a></th><td>{admissionSymbols[r.program.admission_type!]} {r.program.admission_type} · {r.program.program}</td><td>{r.program.field}</td><td>{r.program.region}</td><td>{r.value.toFixed(2)}</td><td>{r.basis.subject_scope.join('·')}</td></tr>)}
  </tbody></table></div>;
}

function PlacementBoard({ rows, range, field }: { rows: readonly PlacementEntry[]; range?: Range; field: string }) {
  const fields = field === '전체' ? placementFields : placementFields.filter(f => f === field);
  const { min, max } = placementExtent(rows, range);
  const maxRows = Math.max(...fields.map(f => rows.filter(r => r.program.field === f).length));
  const height = Math.max(420, Math.round((max - min) * 200), maxRows * 28 + 24);
  const y = (value: number) => (value - min) / (max - min) * height;
  const ticks = Array.from({ length: Math.round((max - min) * 10) + 1 }, (_, i) => Math.round((min + i / 10) * 10) / 10);
  return <div className="placement-board-scroll" tabIndex={0} aria-label="계열별 배치표, 가로·세로 스크롤 가능">
    <div className="placement-board" style={{ gridTemplateColumns: `56px repeat(${fields.length}, minmax(140px, 1fr))`, minWidth: fields.length === 1 ? 280 : fields.length * 140 + 56 }}>
      <div className="placement-axis-title">등급</div>{fields.map(f => <div key={f} className="placement-column-title">{f}</div>)}
      <div className="placement-axis" style={{ height }}>{ticks.map(t => <span key={t} style={{ top: y(t) }}>{t.toFixed(1)}</span>)}</div>
      {fields.map(f => {
        const entries = rows.filter(r => r.program.field === f);
        // Keep point positions exact; move only their labels and connect them with a leader.
        const labels: number[] = [];
        entries.forEach((r, i) => labels.push(Math.max(0, y(r.value) - 12, i ? labels[i - 1] + 28 : 0)));
        if (labels.length) { labels[labels.length - 1] = Math.min(labels[labels.length - 1], height - 24); for (let i = labels.length - 2; i >= 0; i--) labels[i] = Math.min(labels[i], labels[i + 1] - 28); }
        return <div key={f} className="placement-column" style={{ height }}>
          {ticks.filter(t => Math.round(t * 10) % 5 === 0).map(t => <div key={t} className="placement-gridline" style={{ top: y(t) }} />)}
          {range && <><div className="placement-band" style={{ top: y(range.min), height: Math.max(2, y(range.max) - y(range.min)) }} /><div className="placement-my-line" style={{ top: y((range.min + range.max) / 2) }} /></>}
          {!entries.length && <p className="placement-column-empty">공개 자료 없음</p>}
          <svg className="placement-leaders" width="28" height={height} aria-hidden="true">{entries.map((r, i) => <line key={r.program.id} x1="15" x2="27" y1={y(r.value)} y2={labels[i] + 12} stroke="var(--color-hairline)" />)}</svg>
          {entries.map((r, i) => <div key={r.program.id}>
            <span className="placement-symbol" style={{ top: y(r.value) }} aria-hidden="true">{admissionSymbols[r.program.admission_type!]}</span>
            <a className="placement-tag" style={{ top: labels[i] }} href={r.source} target="_blank" rel="noreferrer" title={`${rowName(r)} · ${r.value.toFixed(2)}등급`} aria-label={`${rowName(r)}, ${r.program.admission_type}, 70% 컷 ${r.value.toFixed(2)}등급, 출처 새 창`}>{r.program.university} {r.program.department}</a>
          </div>)}
        </div>;
      })}
    </div>
  </div>;
}

function PlacementDots({ rows, range }: { rows: readonly PlacementEntry[]; range?: Range }) {
  const { min, max } = placementExtent(rows, range), x = (value: number) => (value - min) / (max - min) * 100;
  return <div className="placement-dots-scroll" tabIndex={0} aria-label="대학별 입결 점 그래프">
    <div className="placement-dots">
      <div className="placement-dot-heading"><span>대학·학과</span><div><span>{min.toFixed(1)}등급</span><span>{max.toFixed(1)}등급</span></div></div>
      {[...rows].sort((a, b) => a.program.university.localeCompare(b.program.university, 'ko') || a.value - b.value).map(r => <div key={r.program.id} className="placement-dot-row">
        <a href={r.source} target="_blank" rel="noreferrer">{r.program.university}<br /><span className="text-muted">{r.program.department} · {r.program.admission_type}</span></a>
        <div className="placement-dot-track">
          {range && <div className="placement-band" style={{ left: `${x(range.min)}%`, width: `${Math.max(.3, x(range.max) - x(range.min))}%` }} />}
          <span className="placement-dot" style={{ left: `${x(r.value)}%` }} aria-label={`${rowName(r)}, 70% 컷 ${r.value.toFixed(2)}등급`}><span aria-hidden="true">{admissionSymbols[r.program.admission_type!]}</span><small>{r.value.toFixed(2)}</small></span>
        </div>
      </div>)}
    </div>
  </div>;
}
