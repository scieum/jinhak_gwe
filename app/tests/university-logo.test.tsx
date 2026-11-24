import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { UniversityLogo, universityLogoFile } from '../src/components/UniversityLogo';
import names from '../src/data/universityLogoNames.json';
import plans from '../src/data/universityLogos.json';

afterEach(cleanup);

test('수집 대학·캠퍼스 229개와 전형계획 로고가 모두 연결된다', () => {
  const index = JSON.parse(readFileSync('public/data/collected-results/index.json', 'utf-8'));
  for (const { university } of index.universities) {
    expect(universityLogoFile(university), university).toMatch(/^[a-f0-9]{64}\.(png|jpg|gif|bmp|webp)$/);
  }
  for (const [id, file] of Object.entries(plans)) expect(universityLogoFile('', id)).toBe(file);
});

test('약칭과 통합 전 캠퍼스명은 정식 대학의 로고를 사용한다', () => {
  for (const [alias, name] of [
    ['덕성여대', '덕성여자대학교'], ['동덕여대', '동덕여자대학교'], ['서울여대', '서울여자대학교'],
    ['성신여대', '성신여자대학교'], ['숙명여대', '숙명여자대학교'], ['이화여대', '이화여자대학교'],
    ['추계예대', '추계예술대학교'], ['한국체대', '한국체육대학교'],
    ['한국외대(글로벌)', '한국외국어대학교'], ['한국외대(서울)', '한국외국어대학교'],
    ['강릉원주대(원주)', '강원대학교'], ['강릉원주대(강릉)', '강원대학교'],
  ]) expect(universityLogoFile(alias)).toBe((names as Record<string, string>)[name]);
});

test('미등록 대학과 이미지 실패는 대체 아이콘을 표시하고 대학 전환 시 복구한다', () => {
  const { container, rerender } = render(<UniversityLogo university="미등록 대학교" />);
  expect(container.querySelector('img')).toBeNull();
  rerender(<UniversityLogo university="경찰대학" />);
  const img = container.querySelector('img')!;
  expect(img.getAttribute('src')).toContain('/assets/universities/');
  fireEvent.error(img);
  expect(container.querySelector('img')).toBeNull();
  rerender(<UniversityLogo university="한국예술종합학교" />);
  expect(container.querySelector('img')).not.toBeNull();
});
