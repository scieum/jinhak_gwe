import type { TableSort } from '../domain/tableSort';
import './sortable-header.css';

export function SortableHeader<K extends string>({ column, label, sort, onSort, className }: {
  column: K; label: string; sort: TableSort<K>; onSort: (key: K) => void; className?: string;
}) {
  const direction = sort?.key === column ? sort.direction : undefined;
  const next = direction === 'ascending' ? '내림차순' : '오름차순';
  return <th scope="col" className={className} aria-sort={direction ?? 'none'}>
    <button type="button" className="sort-header-button" onClick={() => onSort(column)} aria-label={`${label} ${next} 정렬`}>
      <span>{label}</span><span className="sort-header-arrow" aria-hidden="true">{direction === 'ascending' ? '↑' : direction === 'descending' ? '↓' : '↕'}</span>
    </button>
  </th>;
}
