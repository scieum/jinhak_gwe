export type SortDirection = 'ascending' | 'descending';
export type TableSort<K extends string> = { key: K; direction: SortDirection } | null;
export type SortValue = string | number | null | undefined;

const collator = new Intl.Collator('ko', { numeric: true, sensitivity: 'base' });
const missing = (value: SortValue) => value == null || (typeof value === 'string' && /^(?:\s*|—|–|-|미기재)$/.test(value.trim()));

/** Parse the whole value, never a numeric prefix of a note/range. Keep the original display value. */
export function sortNumber(value: SortValue): number | null {
  if (missing(value)) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const text = String(value).trim();
  if (!/^[+-]?(?:(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d*)?|\.\d+)$/.test(text)) return null;
  const number = Number(text.replaceAll(',', ''));
  return Number.isFinite(number) ? number : null;
}

export function nextTableSort<K extends string>(current: TableSort<K>, key: K): TableSort<K> {
  return { key, direction: current?.key === key && current.direction === 'ascending' ? 'descending' : 'ascending' };
}

/** Missing/unparseable numbers stay last in both directions. Equal values preserve source order. */
export function sortTableRows<T, K extends string>(rows: readonly T[], sort: TableSort<K>, value: (row: T, key: K) => SortValue, numeric: (key: K) => boolean): T[] {
  if (!sort) return [...rows];
  const isNumeric = numeric(sort.key), sign = sort.direction === 'ascending' ? 1 : -1;
  return rows.map((row, index) => ({ row, index, value: isNumeric ? sortNumber(value(row, sort.key)) : value(row, sort.key) }))
    .sort((a, b) => {
      const aMissing = missing(a.value), bMissing = missing(b.value);
      if (aMissing !== bMissing) return aMissing ? 1 : -1;
      if (aMissing) return a.index - b.index;
      const compared = isNumeric ? (a.value as number) - (b.value as number) : collator.compare(String(a.value), String(b.value));
      return compared * sign || a.index - b.index;
    }).map(item => item.row);
}
