import { expect, test } from 'vitest';
import { approveFields, buildWikiFile, editRows, emptyFieldDraft, fieldProblems, fieldRecordFile, mergeFieldDraft, parseFieldCsv } from '../src/domain/fieldReview';

test('계열표 CSV: 대계열 5열을 읽고, 4열 CSV도 그대로 읽는다', () => {
  const five = parseFieldCsv('﻿대학,모집단위,소계열,중계열,대계열\n경희대학교,행정학과,행정·정책,사회과학,인문\n경희대학교,물리학과,물리,자연과학,\n');
  expect(five).toEqual([
    { university: '경희대학교', unit: '물리학과', small: '물리', mid: '자연과학' },
    { university: '경희대학교', unit: '행정학과', small: '행정·정책', mid: '사회과학', major: '인문' },
  ]);
  expect(parseFieldCsv('대학,모집단위,소계열,중계열\n경희대학교,행정학과,행정·정책,사회과학\n')).toEqual([
    { university: '경희대학교', unit: '행정학과', small: '행정·정책', mid: '사회과학' },
  ]);
});

test('대계열은 비우거나 인문·자연만 받는다', () => {
  expect(fieldProblems([{ university: 'A대', unit: '간호학과', small: '간호', mid: '의약', major: '자연' }])).toEqual([]);
  expect(fieldProblems([{ university: 'A대', unit: '미술학과', small: '미술', mid: '예술', major: '예체능' }])[0]).toMatch(/대계열/);
});

test('대계열은 검수 기록 병합과 공개 파일 내보내기에 실린다', () => {
  const rows = [{ university: 'A대', unit: '행정학과', small: '행정', mid: '사회과학', major: '인문' }, { university: 'A대', unit: '물리학과', small: '물리', mid: '자연과학' }];
  const draft = editRows(emptyFieldDraft(), rows);
  const merged = mergeFieldDraft(emptyFieldDraft(), JSON.parse(JSON.stringify(fieldRecordFile(draft))))!;
  expect(merged.rows).toEqual(rows);
  const done = approveFields(approveFields(merged, '관리자 A'), '관리자 B');
  const file = buildWikiFile(null, done);
  expect(file.fields.rows).toEqual(rows);
  expect('major' in file.fields.rows[1]).toBe(false);
});
