import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { CollectedIndex } from '../domain/collectedResults';
import { placementCoverage, STATISTIC_LABELS, type CutField, type NationalPlacementRow, type PlacementFilters } from '../domain/nationalPlacement';
import { nextTableSort, sortTableRows, type TableSort } from '../domain/tableSort';
import { SortableHeader } from './SortableHeader';

type Key = 'university' | 'yearRows' | 'visible' | 'reason' | 'available' | 'years';
const PAGE = 20;
export function PlacementCoverage({ collection, rows, filters, year, onChoose }: {
  collection: CollectedIndex; rows: NationalPlacementRow[]; filters: PlacementFilters; year: string;
  onChoose: (university: string, cut: CutField) => void;
}) {
  const [page, setPage] = useState(0), [missingOnly, setMissingOnly] = useState(false), [sort, setSort] = useState<TableSort<Key>>(null);
  const coverage = useMemo(() => placementCoverage(collection, rows, filters), [collection, rows, filters]);
  const missing = coverage.filter(entry => !entry.visible).length;
  const displayed = sortTableRows(missingOnly ? coverage.filter(entry => !entry.visible) : coverage, sort, (entry, key) => key === 'available' ? entry.available.map(item => STATISTIC_LABELS[item.cut]).join(' · ') : key === 'years' ? entry.years.join(' · ') : entry[key], key => key === 'yearRows' || key === 'visible');
  const pages = Math.max(1, Math.ceil(displayed.length / PAGE)), current = Math.min(page, pages - 1);
  return <section aria-label="전국 수집 대학 연결 현황" className="national-coverage">
    <div className="section-row"><p role="status">수집 대학 {coverage.length}곳 · 현재 좌표 {coverage.length - missing}곳 · 좌표 미표시 {missing}곳</p>
      <label><input type="checkbox" checked={missingOnly} onChange={event => { setMissingOnly(event.target.checked); setPage(0); }} /> 좌표 미표시 대학만</label></div>
    <p className="t-caption text-muted">대학 검색에 맞는 수집 대학을 모두 보여줘요. 행 수와 표시 사유는 {year}학년도·현재 조회 조건 기준이에요. 통계를 누르면 해당 대학과 통계로 이동하고 등급 범위는 1~9로 바뀌어요.</p>
    <div className="table-scroll"><table className="data-table national-coverage-table"><caption className="sr-only">좌표가 없는 대학을 포함한 수집 대학 목록</caption><thead><tr>
      {([['university', '대학·캠퍼스'], ['yearRows', '해당 연도 수집 행'], ['visible', '현재 좌표 행'], ['reason', '표시 상태'], ['available', '조회 가능한 통계'], ['years', '원문·수집 학년도']] as [Key, string][]).map(([key, label]) => <SortableHeader key={key} column={key} label={label} sort={sort} onSort={value => { setSort(previous => nextTableSort(previous, value)); setPage(0); }} />)}
      </tr></thead><tbody>
      {displayed.slice(current * PAGE, (current + 1) * PAGE).map(entry => <tr key={entry.university}>
        <th scope="row">{entry.university}</th><td>{entry.yearRows.toLocaleString()}</td><td>{entry.visible.toLocaleString()}</td><td>{entry.reason}</td>
        <td><div className="national-statistic-actions">{entry.available.length ? entry.available.map(item => <button key={item.cut} className="button-outline" onClick={() => onChoose(entry.university, item.cut)} aria-label={`${entry.university} ${STATISTIC_LABELS[item.cut]} ${item.count}행 보기`}>{STATISTIC_LABELS[item.cut]} · {item.count}행</button>) : '원문에서 확인'}</div></td>
        <td><Link to={`/admission-results?view=collected&cu=${encodeURIComponent(entry.university)}`}>{entry.university} 수집 원문</Link><p className="t-caption text-muted">{entry.years.join(' · ')}</p></td>
      </tr>)}</tbody></table></div>
    {!displayed.length && <p role="status">조건에 맞는 수집 대학이 없어요.</p>}
    <nav className="toolbar national-pagination" aria-label="수집 대학 페이지"><button className="button-outline" disabled={!current} onClick={() => setPage(current - 1)}>이전</button><span>{current + 1} / {pages} 페이지 · {displayed.length}곳</span><button className="button-outline" disabled={current + 1 >= pages} onClick={() => setPage(current + 1)}>다음</button></nav>
  </section>;
}
