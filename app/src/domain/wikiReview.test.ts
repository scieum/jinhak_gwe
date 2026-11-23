import { describe, expect, test } from 'vitest';
import { approveWiki, buildWikiEntries, editItems, itemProblems, mergeWikiRecords, newWikiDraft, wikiRecordFile, wikiStatus } from './wikiReview';
import { parseWiki } from './univWiki';

const item = { text: '학생부교과는 교과 100%로 뽑아요', source_label: '2028 수시 모집요강 12쪽', source_url: 'https://example.ac.kr/guide.pdf' };
const done = () => approveWiki(approveWiki(editItems(newWikiDraft('경희대학교', 'method'), [item]), 'A'), 'B');

describe('위키 요약 검수', () => {
  test('빈 칸·https 아닌 출처·금지 표현은 승인을 막는다', () => {
    const bad = [{ ...item, source_url: 'http://x.kr' }, { ...item, text: '합격 ' + '확률이 높아요' }, { ...item, source_label: ' ' }];
    expect(itemProblems(bad)).toEqual(['1번 요약: 출처 주소는 https://로 시작해야 해요', '2번 요약: 쓸 수 없는 표현 ‘합격' + '확률’이 있어요', '3번 요약: 출처 이름이 비어 있어요']);
    expect(() => approveWiki(editItems(newWikiDraft('경희대학교', 'method'), bad), 'A')).toThrow('고친 뒤');
    expect(itemProblems([])).toEqual(['요약이 하나도 없어요']);
  });
  test('서로 다른 2명이 승인해야 끝나고, 고치면 승인이 지워진다', () => {
    const one = approveWiki(editItems(newWikiDraft('경희대학교', 'method'), [item]), 'A');
    expect(() => approveWiki(one, 'A')).toThrow('이미 승인');
    expect(wikiStatus(approveWiki(one, 'B'))).toBe('검수 완료');
    expect(wikiStatus(editItems(done(), [{ ...item, text: '바꿈' }]))).toBe('검수 대기');
  });
  test('공개 파일: 계열표·다른 섹션은 지키고 검수 완료 섹션만 넣으며, parseWiki가 받아들인다', () => {
    const fields = { reviewed_at: '2026-11-20', approvals: [{ reviewer: 'a', at: 'x' }, { reviewer: 'b', at: 'x' }], rows: [{ university: '경희대학교', unit: '행정학과', small: '행정', mid: '사회' }] };
    const pending = editItems(newWikiDraft('경희대학교', 'notes'), [item]);
    const { file, count } = buildWikiEntries({ format: 'jinhak-navi-univ-wiki', fields, entries: [{ university: '건국대학교', sections: {} }] }, [done(), pending]);
    expect(count).toBe(1);
    const wiki = parseWiki(JSON.parse(JSON.stringify(file)));
    expect(wiki.fields).toHaveLength(1);
    expect(Object.keys(wiki.sections.get('경희대학교')!)).toEqual(['method']);
    expect(wiki.sections.has('건국대학교')).toBe(true);
    expect(() => buildWikiEntries(null, [pending])).toThrow('2명');
  });
  test('검수 기록: 같은 요약은 승인을 합치고, 다른 요약은 conflicts', () => {
    const a = approveWiki(editItems(newWikiDraft('경희대학교', 'method'), [item]), 'A'), b = approveWiki(editItems(newWikiDraft('경희대학교', 'method'), [item]), 'B');
    const r = mergeWikiRecords(new Map([[a.key, a]]), wikiRecordFile([b, editItems(newWikiDraft('경희대학교', 'notes'), [item])]));
    expect(r.merged.map(wikiStatus)).toEqual(['검수 완료', '검수 대기']);
    expect(mergeWikiRecords(new Map([[a.key, a]]), wikiRecordFile([editItems(b, [{ ...item, text: '다름' }])])).conflicts).toHaveLength(1);
    expect(() => mergeWikiRecords(new Map(), {})).toThrow('기록 파일');
  });
  test('parseWiki는 검수를 거쳐도 금지 표현이 든 섹션을 버린다', () => {
    const s = { reviewed_at: '2026-11-20', approvals: [{ reviewer: 'a', at: 'x' }, { reviewer: 'b', at: 'x' }], items: [{ ...item, text: '합격' + '보장' }] };
    expect(parseWiki({ format: 'jinhak-navi-univ-wiki', version: 1, fields: {}, entries: [{ university: '경희대학교', sections: { notes: s } }] }).sections.get('경희대학교')).toEqual({});
  });
});
