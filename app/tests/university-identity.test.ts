import { expect, test } from 'vitest';
import { currentUniversityName, matchesUniversityIdentity, collectedUniversitySelection } from '../src/domain/universityIdentity';
import { matchesUniversity } from '../src/domain/nationalPlacement';

test('통합 전 강릉·원주 명칭과 저장한 링크를 현재의 각각 다른 캠퍼스로 연결한다', () => {
  expect(currentUniversityName('강릉원주대(강릉)')).toBe('강원대학교(강릉)');
  expect(currentUniversityName('국립강릉원주대학교(원주)')).toBe('강원대학교(원주)');
  const names = ['강원대학교(춘천)', '강원대학교(강릉)', '강원대학교(원주)'];
  expect(collectedUniversitySelection('강릉원주대(원주)', names)).toBe(names[2]);
  expect(names.filter(n => matchesUniversity(n, '강릉원주대'))).toEqual(names.slice(1));
  expect(names.filter(n => matchesUniversity(n, '강릉원주대(강릉)'))).toEqual([names[1]]);
  expect(collectedUniversitySelection('강릉원주대학교', names)).toBeUndefined();
});

test('승인 예정·추진 대학을 시행 완료 대학으로 합치지 않는다', () => {
  for (const name of ['부산교육대학교', '충북대학교', '국립한국교통대학교', '국립순천대학교', '국립공주대학교', '국립한밭대학교']) {
    expect(currentUniversityName(name)).toBe(name);
  }
  expect(matchesUniversityIdentity('부산대학교', '부산교대')).toBe(false);
  expect(matchesUniversityIdentity('충북대학교', '한국교통대')).toBe(false);
  expect(matchesUniversityIdentity('국립목포대학교', '순천대')).toBe(false);
});

test('공식 구 교명 검색을 지원하지만 교대와 일반대는 혼동하지 않는다', () => {
  expect(matchesUniversityIdentity('국립경국대학교(예천)', '경북도립대')).toBe(true);
  expect(matchesUniversityIdentity('경상국립대학교', '경남과기대')).toBe(true);
  expect(matchesUniversityIdentity('국립목포대학교(담양)', '전남도립대')).toBe(true);
  expect(matchesUniversityIdentity('국립공주대학교', '공주문화대학')).toBe(true);
  expect(matchesUniversityIdentity('공주교육대학교', '공주문화대학')).toBe(false);
  expect(currentUniversityName('한경국립대학교')).toBe('한경국립대학교');
  expect(currentUniversityName('한경국립대학교(평택)')).toBe('한경국립대학교(평택)');
});

test('정식 대학명과 기존 약칭 패키지를 양방향 연결하고 캠퍼스를 보존한다', () => {
  expect(currentUniversityName('한국체대')).toBe('한국체육대학교');
  expect(currentUniversityName('강서대(구KC대)')).toBe('강서대학교');
  expect(currentUniversityName('한국외대(글로벌)')).toBe('한국외국어대학교(글로벌)');
  expect(matchesUniversityIdentity('한국체육대학교', '한국체대')).toBe(true);
  expect(matchesUniversityIdentity('한국외국어대학교', '한국외대')).toBe(true);
  expect(collectedUniversitySelection('한국외국어대학교(서울)', ['한국외대(글로벌)', '한국외대(서울)'])).toBe('한국외대(서울)');
  expect(collectedUniversitySelection('한국외국어대학교', ['한국외대(글로벌)', '한국외대(서울)'])).toBeUndefined();
  expect(collectedUniversitySelection('가천대학교', ['가천대', '가천대학교(메디컬)'])).toBe('가천대');
});
