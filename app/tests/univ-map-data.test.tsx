import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { parseUnivMap, countBySido, searchCampuses } from '../src/domain/univMap';
import { resetUnivMap } from '../src/data/univMap';
import { setSampleFlag } from '../src/data/sample/mode';
import { UnivMap } from '../src/screens/UnivMap';

const source = JSON.parse(readFileSync(resolve('public/data/univ-map.json'), 'utf8'));
const directory = JSON.parse(readFileSync(resolve('../work/_data/university-directory/directory.json'), 'utf8'));

afterEach(() => { cleanup(); setSampleFlag('off'); resetUnivMap(); vi.unstubAllGlobals(); });

describe('공개 대학 위치 데이터', () => {
  it('현재 대학 목록 전체를 실제 주소·좌표로 연결하고 17개 지역을 채운다', () => {
    const data = parseUnivMap(source);
    expect(data.campuses).toHaveLength(source.campuses.length);
    expect(Object.keys(data.pending)).toHaveLength(0);
    const names = new Set(data.campuses.map(c => c.name));
    for (const entry of directory.universities) expect(names.has(entry.university), entry.university).toBe(true);
    expect(Object.values(countBySido(data.campuses)).every(n => n > 0)).toBe(true);
    expect(new Set(data.campuses.map(c => c.id)).size).toBe(data.campuses.length);
    expect(data.campuses.every(c => c.address.length > 10 && c.source_url?.startsWith('https://'))).toBe(true);
    expect(data.campuses.some(c => /예시|KCUE/.test(c.name))).toBe(false);
    expect(data.reviewed_at).toBe('');
    expect(source.campuses.every((c: { reviewer_1?: string; reviewer_2?: string }) => !c.reviewer_1 && !c.reviewer_2)).toBe(true);
  });

  it('본교 대표점으로 합치지 않고 다른 지역의 캠퍼스를 구별한다', () => {
    const data = parseUnivMap(source);
    const regions = (name: string) => new Set(data.campuses.filter(c => c.name === name).map(c => c.sido));
    expect(regions('가천대학교')).toEqual(new Set(['경기도', '인천광역시']));
    expect(regions('경희대학교')).toEqual(new Set(['서울특별시', '경기도']));
    expect(regions('성균관대학교')).toEqual(new Set(['서울특별시', '경기도']));
    expect(regions('경북대학교')).toEqual(new Set(['대구광역시', '경상북도']));
    const police = data.campuses.find(c => c.name === '경찰대학')!;
    expect(police.sido).toBe('충청남도');
    expect(police.lat).toBeCloseTo(36.7498574, 5);
    expect(searchCampuses(data.campuses, '강릉원주').every(c => c.name === '강원대학교')).toBe(true);
    expect(searchCampuses(data.campuses, '강릉원주')).toHaveLength(2);
  });

  it('출처 메타데이터·행 출처·좌표 오류를 받아들이지 않는다', () => {
    expect(parseUnivMap({ ...source, source_sha256: '' }).campuses).toHaveLength(0);
    expect(parseUnivMap({ ...source, provenance: 'draft' }).campuses).toHaveLength(0);
    const r = source.campuses[0];
    for (const patch of [{ review_status: 'draft' }, { source_url: '' }, { campus_id: '' }, { lat: 90 }, { lng: NaN }, { address: '' }]) {
      expect(parseUnivMap({ ...source, campuses: [{ ...r, ...patch }] }).campuses).toHaveLength(0);
    }
    expect(parseUnivMap({ ...source, campuses: [r, r] }).campuses).toHaveLength(1);
  });

  it('샘플 성적 모드에서도 실제 캠퍼스를 검색하고 주소·출처·핀을 연결한다', async () => {
    setSampleFlag('on');
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(source))));
    render(<MemoryRouter><UnivMap /></MemoryRouter>);
    await screen.findByRole('group', { name: `대한민국 시·도 지도, 4년제 대학 ${source.campuses.length}곳, 목록과 같은 내용이에요` });
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: '가천' } });
    const results = screen.getByRole('region', { name: '검색 결과' });
    fireEvent.click(within(results).getByRole('button', { name: /메디컬캠퍼스/ }));
    expect(screen.getByRole('heading', { name: '인천광역시' })).toBeTruthy();
    const card = screen.getByRole('article', { name: '가천대학교 메디컬캠퍼스' });
    expect(within(card).getByText('인천광역시 연수구 함박뫼로 191')).toBeTruthy();
    expect(within(card).getByRole('link', { name: '위치 출처 확인' }).getAttribute('href')).toMatch(/gachon.ac.kr/);
    expect(screen.getByRole('button', { name: '가천대학교 메디컬캠퍼스, 본교, 사립, 선택됨' })).toBeTruthy();
    expect(screen.queryByText(/관리자 2명 검수/)).toBeNull();
    expect(screen.queryByText(/시안 예시/)).toBeNull();
  });
});
