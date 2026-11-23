import { describe, expect, test } from 'vitest';
import { RESULT_COLUMNS, type ReleasedUnit, type ResultRow } from './resultReview';
import { approveFields, buildWikiFile, editRows, emptyFieldDraft, fieldProblems, fieldRecordFile, fieldStatus, mergeFieldDraft, missingRows, parseFieldCsv } from './fieldReview';
import { parseWiki } from './univWiki';

const row = (university: string, unit: string): ResultRow => ({ ...Object.fromEntries(RESULT_COLUMNS.map(c => [c, ''])) as ResultRow,
  university, result_year: '2026', round: '수시', admission_type: '교과', program: '학생부교과', recruit_unit: unit, cut_70: '3.1', metric: '교과등급' });
const units: ReleasedUnit[] = [{ university: '경희대학교', year: 2026, source_url: 'https://x.ac.kr', license: 'allowed', approvals: [], rows: [row('경희대학교', '행정학과'), row('경희대학교', '정치외교학과')] }];
const full = [{ university: '경희대학교', unit: '행정학과', small: '행정·정책', mid: '사회과학' }];

describe('계열표 검수', () => {
  test('CSV를 읽고, 빈 칸·중복은 승인 전에 막는다', () => {
    const rows = parseFieldCsv('﻿대학,모집단위,소계열,중계열\n경희대학교,행정학과,행정·정책,사회과학\n경희대학교,행정학과,,\n');
    expect(rows).toHaveLength(2);
    expect(fieldProblems(rows)).toEqual(['2행 경희대학교 행정학과: 빈 칸이 있어요', '2행 경희대학교 행정학과: 같은 학과가 두 번 있어요']);
    expect(() => approveFields(editRows(emptyFieldDraft(), rows), '관리자 A')).toThrow('빈 칸');
    expect(() => parseFieldCsv('대학,학과\n')).toThrow('첫 줄');
  });
  test('서로 다른 2명이 승인해야 끝나고, 고치면 승인이 지워진다', () => {
    const one = approveFields(editRows(emptyFieldDraft(), full), '관리자 A');
    expect(fieldStatus(one)).toBe('1인 승인');
    expect(() => approveFields(one, '관리자 A')).toThrow('이미 승인');
    expect(() => buildWikiFile(null, one)).toThrow('2명');
    const two = approveFields(one, '관리자 B');
    expect(fieldStatus(two)).toBe('검수 완료');
    expect(fieldStatus(editRows(two, [{ ...full[0], mid: '인문' }]))).toBe('검수 대기');
  });
  test('공개 파일은 위키 본문을 지키고, parseWiki가 계열표를 받아들인다', () => {
    const two = approveFields(approveFields(editRows(emptyFieldDraft(), full), 'A'), 'B');
    const file = buildWikiFile({ format: 'jinhak-navi-univ-wiki', entries: [{ university: '경희대학교', sections: {} }] }, two);
    expect(file.entries).toHaveLength(1);
    expect(parseWiki(JSON.parse(JSON.stringify(file))).fields).toEqual(full);
  });
  test('검수 기록: 같은 표면 승인을 합치고, 다르면 null', () => {
    const a = approveFields(editRows(emptyFieldDraft(), full), 'A'), b = approveFields(editRows(emptyFieldDraft(), full), 'B');
    expect(fieldStatus(mergeFieldDraft(a, fieldRecordFile(b))!)).toBe('검수 완료');
    expect(mergeFieldDraft(a, fieldRecordFile(editRows(b, [{ ...full[0], small: '정치' }])))).toBeNull();
    expect(() => mergeFieldDraft(a, { rows: [] })).toThrow('검수 기록 파일');
  });
  test('공개 입결에서 계열표에 없는 학과만 빈 칸으로 추가한다', () => {
    expect(missingRows(units, full)).toEqual([{ university: '경희대학교', unit: '정치외교학과', small: '', mid: '' }]);
  });
});
