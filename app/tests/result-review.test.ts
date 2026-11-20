import { describe, expect, it } from 'vitest';
import { approve, buildRelease, emptyRecord, groupUnits, mergeRecord, parseRelease, parseResultCsv, reject, reviewStatus, setLicense, RESULT_COLUMNS } from '../src/domain/resultReview';

const head = RESULT_COLUMNS.join(',');
const line = (o: Record<string, string>) => RESULT_COLUMNS.map(c => o[c] ?? '').join(',');
const base = { university: '가나대학교', result_year: '2026', round: '수시', program: '교과', recruit_unit: '국어교육과', cut_50: '2.1', cut_70: '2.4', metric: '교과등급', source_url: 'https://ex.ac.kr/r.pdf' };
const csv = (...rows: Record<string, string>[]) => '\uFEFF' + [head, ...rows.map(line)].join('\n');

describe('입결 검수', () => {
  it('README 열 형식이 아니면 거부한다', () => {
    expect(() => parseResultCsv('a,b\n1,2')).toThrow('열 이름');
  });
  it('대학·학년도·원문 단위로 묶고 오류와 주의를 나눈다', () => {
    const units = groupUnits(parseResultCsv(csv(base, { ...base, recruit_unit: '수학교육과', cut_70: '1.5' }, { ...base, result_year: '2025', cut_50: '11', source_url: 'http://x' })));
    expect(units.map(u => [u.year, u.rows.length])).toEqual([['2026', 2], ['2025', 1]]);
    expect(units[0].errors).toEqual([]);
    expect(units[0].warnings).toEqual(['2행: 등급 지표인데 70% 컷이 50% 컷보다 좋아요.']);
    expect(units[1].errors).toEqual(['1행: 원문 주소가 https 링크가 아니에요.', '1행: 50% 컷 11가 등급 범위(1~9) 밖이에요.']);
  });
  it('서로 다른 2명이 승인하고 이용 허용일 때만 공개한다', () => {
    const [unit] = groupUnits(parseResultCsv(csv(base)));
    let rec = approve(unit, emptyRecord(unit.key), '관리자 A');
    expect(reviewStatus(rec)).toBe('1인 승인');
    expect(() => approve(unit, rec, '관리자 A')).toThrow('다른 검수자');
    expect(() => approve(unit, rec, '  ')).toThrow('이름');
    rec = approve(unit, rec, '관리자 B');
    expect(reviewStatus(rec)).toBe('검수 완료');
    expect(buildRelease([unit], new Map([[unit.key, rec]])).units).toEqual([]);
    rec = setLicense(rec, 'allowed', '관리자 B');
    const file = buildRelease([unit], new Map([[unit.key, rec]]));
    expect(file.units).toHaveLength(1);
    expect(parseRelease(JSON.parse(JSON.stringify(file)))).toHaveLength(1);
  });
  it('오류 자료는 승인할 수 없고 반려는 사유가 필요하며 승인을 지운다', () => {
    const [bad] = groupUnits(parseResultCsv(csv({ ...base, source_url: 'ftp://x' })));
    expect(() => approve(bad, emptyRecord(bad.key), 'A')).toThrow('오류');
    const [unit] = groupUnits(parseResultCsv(csv(base)));
    const rec = approve(unit, emptyRecord(unit.key), 'A');
    expect(() => reject(rec, 'B', ' ')).toThrow('사유');
    const r = reject(rec, 'B', '쪽수 확인');
    expect(reviewStatus(r)).toBe('반려');
    expect(r.approvals).toEqual([]);
    expect(reviewStatus(approve(unit, r, 'A'))).toBe('1인 승인');
  });
  it('공개 파일을 다시 검사해 조작된 단위를 버린다', () => {
    const [unit] = groupUnits(parseResultCsv(csv(base)));
    const unit2 = { university: unit.university, year: 2026, source_url: unit.source_url, license: 'allowed', rows: unit.rows };
    const two = [{ reviewer: 'A', at: 'x' }, { reviewer: 'B', at: 'y' }];
    const wrap = (u: object) => ({ format: 'jinhak-navi-released-results', version: 1, units: [u] });
    expect(parseRelease(wrap({ ...unit2, approvals: two }))).toHaveLength(1);
    expect(parseRelease(wrap({ ...unit2, approvals: [two[0], two[0]] }))).toEqual([]);
    expect(parseRelease(wrap({ ...unit2, approvals: two, license: 'unknown' }))).toEqual([]);
    expect(parseRelease(wrap({ ...unit2, approvals: two, rows: [{ ...unit.rows[0], cut_70: '12' }] }))).toEqual([]);
    expect(parseRelease(null)).toEqual([]);
  });
  it('다른 기기 기록을 합치면 승인을 모으고 반려는 최신을 따른다', () => {
    const a = { ...emptyRecord('k'), approvals: [{ reviewer: 'A', at: '1' }], updated_at: '1' };
    const b = { ...emptyRecord('k'), approvals: [{ reviewer: 'B', at: '2' }], updated_at: '2' };
    expect(reviewStatus(mergeRecord(a, b))).toBe('검수 완료');
    const rej = { ...emptyRecord('k'), rejection: { reviewer: 'C', reason: 'x', at: '3' }, updated_at: '3' };
    expect(reviewStatus(mergeRecord(mergeRecord(a, b), rej))).toBe('반려');
  });
});
import { parseCsv } from '../src/io/grades';
describe('parseCsv', () => {
  it('따옴표·줄바꿈·탭·빈 끝 칸을 처리한다', () => {
    expect(parseCsv('a,"b,""c""",d\r\n\n1\t2,\n"x\ny",z')).toEqual([['a', 'b,"c"', 'd'], ['1', '2', ''], ['x\ny', 'z']]);
    expect(() => parseCsv('"a')).toThrow('따옴표');
  });
});
