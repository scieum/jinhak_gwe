import { describe, expect, test } from 'vitest';
import { approveMap, buildMapFile, editMap, mapProblems, mapRecordFile, mapStatus, mergeMapRecords, parseMapDraft, type MapDraft } from './mapReview';
import { parseUnivMap } from './univMap';

const draftFile = { format: 'jinhak-navi-univ-map', version: 1, review_status: 'draft', campuses: [
  { univ_id: 'u-1', name: '강원대학교', campus: '본교', campus_type: '본교', school_kind: '', founding: '', sido: '강원특별자치도', sigungu: '', address: '', lat: null, lng: null,
    review_status: 'draft', reviewer_1: '가짜', reviewer_2: '승인', reviewed_at: '2026-01-01', draft_basis: '2028 전형계획' },
  { univ_id: 'u-2', name: '가야대학교', campus: '본교', campus_type: '본교', school_kind: '', founding: '', sido: '경상남도', sigungu: '', address: '', lat: null, lng: null },
] };
const fill = (d: MapDraft) => editMap(d, { school_kind: '일반대학', founding: '국립', sigungu: '춘천시', lat: 37.87, lng: 127.74 });
const meta = { base_date: '2026-11-24', list_source: '한국교육개발원 대학 주소록' };

describe('대학 위치 검수', () => {
  test('초안을 읽되 초안의 검수자 칸은 버리고, 빈 칸·범위 밖 좌표는 승인 전에 막는다', () => {
    const rows = parseMapDraft(draftFile);
    expect(rows.map(r => r.name)).toEqual(['가야대학교', '강원대학교']);
    expect(rows.every(r => !r.approvals.length && mapStatus(r) === '검수 대기')).toBe(true);
    const kw = rows[1];
    expect(mapProblems(kw)).toEqual(expect.arrayContaining(['강원대학교 본교: 시·군·구이 비어 있어요', '강원대학교 본교: 위도·경도가 비어 있어요']));
    expect(() => approveMap(kw, '관리자 A')).toThrow('고친 뒤 승인');
    expect(mapProblems(fill(kw))).toEqual([]);
    expect(mapProblems(editMap(fill(kw), { lat: 1, lng: 2 }))).toEqual(['강원대학교 본교: 위도·경도가 우리나라 범위 밖이에요']);
    expect(() => parseMapDraft({ campuses: [] })).toThrow('대학 위치 파일');
  });
  test('서로 다른 2명이 승인해야 끝나고, 칸을 고치면 승인이 지워진다', () => {
    const one = approveMap(fill(parseMapDraft(draftFile)[1]), '관리자 A');
    expect(mapStatus(one)).toBe('1인 승인');
    expect(() => approveMap(one, '관리자 A')).toThrow('이미 승인');
    const two = approveMap(one, '관리자 B');
    expect(mapStatus(two)).toBe('검수 완료');
    expect(editMap(two, { sigungu: '춘천시' })).toBe(two); // 같은 값이면 그대로
    expect(mapStatus(editMap(two, { sigungu: '원주시' }))).toBe('검수 대기');
  });
  test('공개 파일에는 2명 승인 행만 들어가고, 공개 화면 로더가 그대로 받는다', () => {
    const [gaya, kw] = parseMapDraft(draftFile);
    const one = approveMap(fill(gaya), 'A'), two = approveMap(approveMap(fill(kw), 'A'), 'B');
    expect(() => buildMapFile([one], meta)).toThrow('2명');
    expect(() => buildMapFile([two], { ...meta, base_date: '' })).toThrow('기준일');
    const file = buildMapFile([one, two, gaya], meta);
    expect(file.campuses.map(c => c.name)).toEqual(['강원대학교']);
    expect(file.campuses[0]).toMatchObject({ review_status: 'verified', reviewer_1: 'A', reviewer_2: 'B' });
    const data = parseUnivMap(JSON.parse(JSON.stringify(file)));
    expect(data.campuses).toHaveLength(1);
    expect(data.campuses[0]).toMatchObject({ name: '강원대학교', sido: '강원특별자치도', sigungu: '춘천시', lat: 37.87, lng: 127.74 });
    expect(data.pending).toEqual({});
    expect(data.base_date).toBe('2026-11-24');
  });
  test('검수 기록: 칸이 같으면 승인을 합치고, 다르면 conflicts', () => {
    const kw = fill(parseMapDraft(draftFile)[1]);
    const a = approveMap(kw, 'A'), b = approveMap(kw, 'B');
    const { merged } = mergeMapRecords(new Map([[a.key, a]]), mapRecordFile([b]));
    expect(mapStatus(merged[0])).toBe('검수 완료');
    const { conflicts } = mergeMapRecords(new Map([[a.key, a]]), mapRecordFile([editMap(b, { sigungu: '원주시' })]));
    expect(conflicts).toHaveLength(1);
    expect(() => mergeMapRecords(new Map(), { drafts: [] })).toThrow('검수 기록 파일');
  });
});
