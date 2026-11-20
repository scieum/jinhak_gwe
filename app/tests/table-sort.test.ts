import { expect, test } from 'vitest';
import { sortNumber, sortTableRows } from '../src/domain/tableSort';

test('숫자 전체를 읽고 소수·음수·천 단위를 정렬하며 빈 값과 해석 불가 값은 항상 뒤에 둔다', () => {
  const rows = ['10', '', '2.400', '1,200', '2~3', '—', '-0.30', '2.4'];
  const sorted = (direction: 'ascending' | 'descending') => sortTableRows(rows, { key: 'value', direction }, v => v, () => true);
  expect(sorted('ascending')).toEqual(['-0.30', '2.400', '2.4', '10', '1,200', '', '2~3', '—']);
  expect(sorted('descending')).toEqual(['1,200', '10', '2.400', '2.4', '-0.30', '', '2~3', '—']);
  expect(rows[0]).toBe('10');
  for (const value of ['1,2', '4명', 'NaN', 'Infinity', '3.5(참고)']) expect(sortNumber(value)).toBeNull();
  expect(sortNumber(' 0 ')).toBe(0);
  expect(sortNumber('.25')).toBe(0.25);
});

test('가나다순과 이름 안의 숫자 순서를 지원하며 같은 값의 원문 순서를 유지한다', () => {
  const rows = [{ id: 1, value: '나학과10' }, { id: 2, value: '가학과' }, { id: 3, value: '나학과2' }, { id: 4, value: '가학과' }, { id: 5, value: '' }];
  expect(sortTableRows(rows, { key: 'value', direction: 'ascending' }, r => r.value, () => false).map(r => r.id)).toEqual([2, 4, 3, 1, 5]);
  expect(sortTableRows(rows, { key: 'value', direction: 'descending' }, r => r.value, () => false).map(r => r.id)).toEqual([1, 3, 2, 4, 5]);
  expect(sortTableRows(rows, null, r => r.value, () => false)).toEqual(rows);
});
