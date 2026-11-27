import { describe, expect, it } from 'vitest';
import { familyOf, regionOf } from './compareFilters';
import type { Campus } from './univMap';

const campus = (name: string, sido: string, sigungu: string, place = ''): Campus => ({ id: name + sigungu, univ_id: name, name, campus: place, campus_type: '본교',
  school_kind: '일반대학', founding: '국립', sido, sigungu, address: '', lat: 0, lng: 0 } as Campus);
const campuses = [campus('강원대학교', '강원특별자치도', '춘천시'), campus('강원대학교', '강원특별자치도', '삼척시'), campus('가대학교', '서울특별시', '성북구'), campus('가대학교', '경기도', '수원시', '수원캠퍼스')];

describe('내 비교 지역 · 계열', () => {
  it('지역: 한 시·도면 그 시·도, 여러 시·도면 괄호로 좁혀요', () => {
    expect(regionOf('강원대학교(춘천)', campuses)).toBe('강원');
    expect(regionOf('가대학교(수원)', campuses)).toBe('경기');
    expect(regionOf('가대학교', campuses)).toBe('');
  });
  it('계열: 의약 · 예체능 이름 규칙이 먼저, 나머지는 계열표 대계열', () => {
    const fields = [{ university: '가대학교', unit: '행정학과', small: '행정', mid: '사회과학', major: '인문' }];
    expect(familyOf('가대학교', '의예과', fields)).toBe('의약');
    expect(familyOf('가대학교', '간호학과', fields)).toBe('의약');
    expect(familyOf('가대학교', '체육교육과', fields)).toBe('예체능');
    expect(familyOf('가대학교', '행정학부', fields)).toBe('인문');
    expect(familyOf('가대학교', '모르는학과', fields)).toBe('');
  });
});
