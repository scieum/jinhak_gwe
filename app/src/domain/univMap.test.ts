import { describe, expect, it } from 'vitest';
import { applyFilters, clusterPins, clusterPlace, countBySido, NO_FILTERS, parseUnivMap, searchCampuses, sortCampuses } from './univMap';

// 테스트 전용 픽스처(spec 1장 시험용 값). public/data에는 넣지 않는다.
const row = (name: string, campus: string, extra: object = {}) => ({
  univ_id: name, name, campus, campus_type: '본교', school_kind: '일반대학', founding: '사립', sido: '강원특별자치도', sigungu: '춘천시', address: '',
  lat: 37.87, lng: 127.74, reviewer_1: 'A', reviewer_2: 'B', reviewed_at: '2026-11-20', review_status: 'verified', ...extra,
});
const file = (campuses: object[]) => ({ format: 'jinhak-navi-univ-map', version: 1, base_date: '2026-11-20', list_source: '시험용 목록', list_as_of: '2026-04-01', reviewed_at: '2026-11-20', campuses });

describe('parseUnivMap', () => {
  it('형식이 다르면 빈 자료', () => {
    expect(parseUnivMap(null).campuses).toEqual([]);
    expect(parseUnivMap({ ...file([row('가', '나')]), version: 2 }).campuses).toEqual([]);
  });
  it('2인 검수 행만 핀으로, 나머지는 시·도별 개수만', () => {
    const d = parseUnivMap(file([
      row('강원대학교', '삼척캠퍼스', { campus_type: '분교', founding: '국립', sigungu: '삼척시' }),
      row('한림대학교', '춘천캠퍼스', { review_status: 'draft' }),
      row('상지대학교', '원주캠퍼스', { reviewer_2: 'A' }), // 같은 사람 두 번 = 검수 아님
      row('경동대학교', '설악캠퍼스', { lat: 45 }), // 범위 밖 좌표
      row('울산대학교', '본교', { sido: '울산광역시', review_status: 'draft' }),
      row('어느전문대학', '본교', { school_kind: '전문대학' }), // D16 범위 밖은 세지도 않는다
      row('강원대학교', '삼척캠퍼스'), // 중복
    ]));
    expect(d.campuses.map(c => c.name)).toEqual(['강원대학교']);
    expect(d.campuses[0].id).toBe('강원대학교|삼척캠퍼스');
    expect(d.pending).toEqual({ 강원특별자치도: 3, 울산광역시: 1 });
    expect(d.list_as_of).toBe('2026-04-01');
  });
});

describe('거르기 · 세기 · 정렬 · 검색', () => {
  const { campuses } = parseUnivMap(file([
    row('한림대학교', '춘천캠퍼스'),
    row('강원대학교', '춘천캠퍼스', { founding: '국립' }),
    row('강원대학교', '삼척캠퍼스', { founding: '국립', campus_type: '분교', sigungu: '삼척시' }),
    row('춘천교육대학교', '춘천캠퍼스', { founding: '국립', school_kind: '교육대학' }),
    row('고려대학교', '서울캠퍼스', { sido: '서울특별시', sigungu: '성북구', lat: 37.59, lng: 127.03 }),
  ]));
  it('조건', () => {
    expect(applyFilters(campuses, NO_FILTERS)).toHaveLength(5);
    expect(applyFilters(campuses, { ...NO_FILTERS, founding: '국립' })).toHaveLength(3);
    expect(applyFilters(campuses, { founding: '국립', mainOnly: true, kind: null })).toHaveLength(2);
    expect(applyFilters(campuses, { ...NO_FILTERS, kind: '교육대학' }).map(c => c.name)).toEqual(['춘천교육대학교']);
  });
  it('시·도별 개수는 17개 모두', () => {
    const n = countBySido(campuses);
    expect(Object.keys(n)).toHaveLength(17);
    expect(n.강원특별자치도).toBe(4); expect(n.서울특별시).toBe(1); expect(n.울산광역시).toBe(0);
  });
  it('정렬: 시·도 순 → 가나다, 시·군 순', () => {
    expect(sortCampuses(campuses, '시도').map(c => c.name)[0]).toBe('고려대학교');
    expect(sortCampuses(campuses, '가나다').map(c => `${c.name} ${c.campus}`).slice(0, 2)).toEqual(['강원대학교 삼척캠퍼스', '강원대학교 춘천캠퍼스']);
    expect(sortCampuses(campuses.filter(c => c.sido === '강원특별자치도'), '시군')[0].sigungu).toBe('삼척시');
  });
  it('검색은 이름만, 2글자부터', () => {
    expect(searchCampuses(campuses, '강')).toEqual([]);
    expect(searchCampuses(campuses, '강원').map(c => c.campus)).toEqual(['삼척캠퍼스', '춘천캠퍼스']);
    expect(searchCampuses(campuses, '강원국제대')).toEqual([]);
  });
});

describe('clusterPins (24px 규칙)', () => {
  const pts = [{ id: 'a', x: 0, y: 0 }, { id: 'b', x: 10, y: 0 }, { id: 'c', x: 20, y: 0 }, { id: 'd', x: 100, y: 0 }];
  it('24px 안으로 이어지면 묶는다(사슬 포함)', () => {
    const g = clusterPins(pts, 2); // b-c 20px, a-b 20px → a·b·c 한 묶음
    expect(g.map(x => x.ids)).toEqual([['a', 'b', 'c'], ['d']]);
    expect(g[0].x).toBe(10);
  });
  it('축척이 크면 따로', () => expect(clusterPins(pts, 3).map(x => x.ids)).toEqual([['a'], ['b'], ['c'], ['d']]));
  it('24px는 묶지 않는다(안쪽만)', () => expect(clusterPins([{ id: 'a', x: 0, y: 0 }, { id: 'b', x: 24, y: 0 }], 1)).toHaveLength(2));
  it('선택된 핀은 묶음에서 빼서 따로', () => {
    const g = clusterPins(pts, 2, 'b');
    expect(g.map(x => x.ids)).toEqual([['a'], ['c'], ['d'], ['b']]);
  });
  it('묶음 이름 = 가장 많은 시·군', () => {
    expect(clusterPlace([{ sigungu: '원주시' }, { sigungu: '횡성군' }, { sigungu: '원주시' }] as never)).toBe('원주시');
  });
});
