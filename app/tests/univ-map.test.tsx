import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { UnivMap } from '../src/screens/UnivMap';
import { resetUnivMap } from '../src/data/univMap';

// 테스트 전용 픽스처(spec 1-2 시험용 좌표 · 구성). 실제 공시 · 좌표가 아니며 public/data에는 넣지 않는다.
const at = (name: string, campus: string, campus_type: string, founding: string, school_kind: string, sigungu: string, lat: number, lng: number, extra: object = {}) => ({
  univ_id: name, name, campus, campus_type, founding, school_kind, sido: '강원특별자치도', sigungu, address: '', lat, lng,
  reviewer_1: '관리자A', reviewer_2: '관리자B', reviewed_at: '2026-11-20', review_status: 'verified', ...extra,
});
const map = {
  format: 'jinhak-navi-univ-map', version: 1, base_date: '2026-11-20', list_source: '대학알리미 학교 기본 정보', list_as_of: '2026-04-01', reviewed_at: '2026-11-20',
  campuses: [
    at('강원대학교', '춘천캠퍼스', '본교', '국립', '일반대학', '춘천시', 37.869, 127.744),
    at('강원대학교', '삼척캠퍼스', '분교', '국립', '일반대학', '삼척시', 37.452, 129.162),
    at('한림대학교', '춘천캠퍼스', '본교', '사립', '일반대학', '춘천시', 37.886, 127.738),
    at('춘천교육대학교', '춘천캠퍼스', '본교', '국립', '교육대학', '춘천시', 37.868, 127.725),
    at('연세대학교', '미래캠퍼스', '분교', '사립', '일반대학', '원주시', 37.28, 127.902),
    at('상지대학교', '원주캠퍼스', '본교', '사립', '일반대학', '원주시', 37.37, 127.93),
    at('한라대학교', '원주캠퍼스', '본교', '사립', '일반대학', '원주시', 37.29, 127.91),
    at('가톨릭관동대학교', '강릉캠퍼스', '본교', '사립', '일반대학', '강릉시', 37.74, 128.88),
    at('경동대학교', '설악캠퍼스', '본교', '사립', '일반대학', '고성군', 38.38, 128.47),
    at('시험대학교', '본교', '본교', '사립', '일반대학', '횡성군', 37.5, 128.0, { review_status: 'draft' }),
    at('고려대학교', '세종캠퍼스', '분교', '사립', '일반대학', '세종시', 36.61, 127.28, { sido: '세종특별자치시' }),
    at('울산대학교', '본교', '본교', '사립', '일반대학', '남구', 35.54, 129.26, { sido: '울산광역시', review_status: 'draft' }),
    at('울산과학기술원', '본교', '본교', '특별법 법인', '특별법 대학', '울주군', 35.57, 129.19, { sido: '울산광역시', review_status: 'draft' }),
  ],
};

function serve(mode: 'ok' | 'missing' | 'down' = 'ok', compact = true) {
  resetUnivMap();
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: compact, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
  vi.stubGlobal('fetch', vi.fn(async () => {
    if (mode === 'down') throw new TypeError('network');
    return mode === 'missing' ? new Response('', { status: 404 }) : new Response(JSON.stringify(map));
  }));
}
const open = () => render(<MemoryRouter><UnivMap /></MemoryRouter>);
const sido = (name: RegExp) => within(screen.getByRole('group', { name: /대한민국 시·도 지도/ })).getByRole('button', { name });
const toGangwon = async () => { fireEvent.click(await screen.findByRole('button', { name: '강원특별자치도, 대학 9곳' })); };

afterEach(() => { cleanup(); vi.unstubAllGlobals(); resetUnivMap(); });

describe('대학 지도', () => {
  it('휠로 커서 위치를 유지하며 확대·축소하고 배율 제한·초기화·지역 전환을 적용한다', async () => {
    serve('ok', false); open();
    const svg = await screen.findByRole('group', { name: /대한민국 시·도 지도/ });
    vi.spyOn(svg, 'getBoundingClientRect').mockReturnValue({ left: 100, top: 50, width: 636, height: 540 } as DOMRect);
    const view = () => svg.getAttribute('viewBox')!.split(' ').map(Number);
    const original = view();
    const point = () => {
      const [x, y, w, h] = view(), scale = Math.min(636 / w, 540 / h);
      return [x + (470 - (636 - w * scale) / 2) / scale, y + (180 - (540 - h * scale) / 2) / scale];
    };
    const anchor = point();
    const wheel = new WheelEvent('wheel', { deltaY: -120, clientX: 570, clientY: 230, bubbles: true, cancelable: true });
    fireEvent(svg, wheel);
    expect(wheel.defaultPrevented).toBe(true);
    expect(view()[2]).toBeLessThan(original[2]);
    expect(point()[0]).toBeCloseTo(anchor[0], 8);
    expect(point()[1]).toBeCloseTo(anchor[1], 8);
    fireEvent.wheel(svg, { deltaY: 60, clientX: 570, clientY: 230, deltaMode: 1 });
    expect(view()).toEqual(original);
    for (let i = 0; i < 12; i++) fireEvent.wheel(svg, { deltaY: -200, clientX: 570, clientY: 230 });
    expect(view()[2]).toBeCloseTo(original[2] / 12, 8);
    expect((screen.getByRole('button', { name: '지도 확대' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: '지도 배율 초기화' }));
    expect(view()).toEqual(original);
    fireEvent.click(screen.getByRole('button', { name: '지도 확대' }));
    await toGangwon();
    expect((screen.getByRole('button', { name: '지도 축소' }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole('heading', { name: '강원특별자치도' })).toBeTruthy();
  });

  it('전국 → 시·도 선택: 확대 · 묶음 핀 · 위치 확인 중 · 전국으로', async () => {
    serve(); open();
    expect(screen.getByText('대학 위치를 읽고 있어요.')).toBeTruthy();
    await screen.findByRole('group', { name: '대한민국 시·도 지도, 4년제 대학 10곳, 목록과 같은 내용이에요' });
    expect(screen.getByText('대학 10곳')).toBeTruthy();
    expect(screen.getByText('위치 확인 중 3곳 — 검수가 끝나면 지도에 나와요')).toBeTruthy();
    expect(sido(/^울산광역시/).getAttribute('aria-label')).toBe('울산광역시, 위치 확인 중 2곳');
    // Tab 순서 = SIDO 목록 순서
    const buttons = within(screen.getByRole('group', { name: /대한민국/ })).getAllByRole('button').map(b => b.getAttribute('aria-label')!.split(',')[0]);
    expect(buttons.slice(0, 3)).toEqual(['서울특별시', '부산광역시', '대구광역시']);
    expect(buttons).toHaveLength(17); // 전국 보기에는 개별 핀이 없다

    fireEvent.keyDown(sido(/^강원특별자치도/), { key: 'Enter' });
    expect(screen.getByRole('heading', { name: '강원특별자치도' })).toBeTruthy();
    expect(screen.getByText('대학 9곳')).toBeTruthy();
    expect(sido(/^강원특별자치도/).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByText('강원특별자치도, 대학 9곳', { selector: '[role=status]' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '춘천시 부근 대학 3곳, 목록 열기' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '원주시 부근 대학 3곳, 목록 열기' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '강원대학교 삼척캠퍼스, 분교, 국립' })).toBeTruthy();
    expect(screen.getByText('위치 확인 중 1곳 — 검수가 끝나면 지도에 나와요')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '‹ 전국으로' }));
    expect(screen.getByRole('heading', { name: '전국' })).toBeTruthy();
  });

  it('지역 시트: 17칸 격자, 누르면 바로 닫히고 바뀐다 · 모두 검수 전인 시·도', async () => {
    serve(); open();
    fireEvent.click(await screen.findByRole('button', { name: /^전국/ }));
    const sheet = screen.getByRole('dialog', { name: '지역 고르기' });
    expect(within(sheet).getByRole('button', { name: /^전국/ }).getAttribute('aria-pressed')).toBe('true');
    expect(within(sheet).getAllByRole('button', { name: /, (대학|위치)/ })).toHaveLength(17);
    const ulsan = within(sheet).getByRole('button', { name: '울산광역시, 위치 확인 중 2곳' });
    expect(ulsan.textContent).toBe('울산 확인 중');
    fireEvent.click(ulsan);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('button', { name: '울산' })).toBeTruthy();
    expect(screen.getByText('이 지역 대학 2곳은 위치를 확인하고 있어요')).toBeTruthy();
    expect(screen.getByText('위치 확인 중 2곳 — 검수가 끝나면 지도에 나와요')).toBeTruthy();
  });

  it('핀 카드: 대학 상세 링크 · 닫기, 묶음 시트에서 고르면 묶음이 줄어든다', async () => {
    serve(); open(); await toGangwon();
    fireEvent.click(screen.getByRole('button', { name: '강원대학교 삼척캠퍼스, 분교, 국립' }));
    const card = screen.getByRole('article', { name: '강원대학교 삼척캠퍼스' });
    expect(within(card).getByText('삼척캠퍼스 · 분교')).toBeTruthy();
    expect(within(card).getByText('국립 · 일반대학 · 강원특별자치도 삼척시')).toBeTruthy();
    expect(within(card).getByRole('link', { name: '강원대학교 삼척캠퍼스 대학 상세 보기' }).getAttribute('href')).toBe(`/univ-detail?u=${encodeURIComponent('강원대학교')}`);
    expect(screen.getByRole('button', { name: '강원대학교 삼척캠퍼스, 분교, 국립, 선택됨' })).toBeTruthy();
    expect(document.activeElement?.textContent).toBe('강원대학교');
    fireEvent.click(within(card).getByRole('button', { name: '카드 닫기' }));
    expect(screen.queryByRole('article')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: '원주시 부근 대학 3곳, 목록 열기' }));
    const sheet = screen.getByRole('dialog', { name: '원주시 부근 3곳' });
    expect(within(sheet).getAllByRole('button').slice(1).map(b => b.textContent)).toEqual([
      '상지대학교원주캠퍼스 · 본교 · 사립›', '연세대학교미래캠퍼스 · 분교 · 사립›', '한라대학교원주캠퍼스 · 본교 · 사립›']);
    fireEvent.click(within(sheet).getByRole('button', { name: /^상지대학교/ }));
    expect(screen.getByRole('article', { name: '상지대학교 원주캠퍼스' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '원주시 부근 대학 2곳, 목록 열기' })).toBeTruthy();
    fireEvent.keyDown(screen.getByRole('article'), { key: 'Escape' });
    expect(screen.queryByRole('article')).toBeNull();
  });

  it('모바일 목록 보기: 시·도 머리 + 카드 링크, 시·도 목록은 정렬을 바꾼다', async () => {
    serve(); open();
    fireEvent.click(await screen.findByRole('button', { name: '목록 보기' }));
    const list = screen.getByRole('region', { name: '목록' });
    expect(within(list).getByText('전국 · 대학 10곳')).toBeTruthy();
    expect(within(list).getByText('세종특별자치시', { exact: false }).textContent).toBe('세종특별자치시 1');
    expect(within(list).getAllByRole('link')[0].getAttribute('href')).toBe(`/univ-detail?u=${encodeURIComponent('고려대학교')}`);
    fireEvent.click(screen.getByRole('button', { name: '지도 보기' }));
    await toGangwon();
    fireEvent.click(screen.getByRole('button', { name: '목록 보기' }));
    const names = () => within(screen.getByRole('region', { name: '목록' })).getAllByRole('link').map(a => a.querySelector('.t-heading-4')!.textContent! + a.querySelector('.t-body-sm')!.textContent!.split(' · ')[0]);
    expect(names()[0]).toBe('가톨릭관동대학교강릉캠퍼스');
    fireEvent.click(screen.getByRole('button', { name: '가나다순 ▾' }));
    fireEvent.click(within(screen.getByRole('dialog', { name: '정렬' })).getByRole('button', { name: '시·군순' }));
    expect(names().slice(0, 3)).toEqual(['가톨릭관동대학교강릉캠퍼스', '경동대학교설악캠퍼스', '강원대학교삼척캠퍼스']); // 강릉시 · 고성군 · 삼척시
  });

  it('조건으로 0곳이면 지도 위 한 줄 + 조건 지우기, 설립 조건은 개수를 바꾼다', async () => {
    serve(); open();
    fireEvent.click(await screen.findByRole('button', { name: /^설립/ }));
    const sheet = screen.getByRole('dialog', { name: '설립' });
    expect(within(sheet).getByText('국립대법인 포함')).toBeTruthy();
    fireEvent.click(within(sheet).getByRole('button', { name: /^공립/ }));
    expect(screen.getByRole('button', { name: '설립 · 공립' })).toBeTruthy();
    expect(screen.getByText('대학 0곳')).toBeTruthy();
    expect(screen.getByText('조건에 맞는 대학이 없어요')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '조건 지우기' }));
    expect(screen.getByText('대학 10곳')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /^학교 종류/ }));
    fireEvent.click(within(screen.getByRole('dialog', { name: '학교 종류' })).getByRole('button', { name: '교육대학' }));
    expect(sido(/^강원특별자치도/).getAttribute('aria-label')).toBe('강원특별자치도, 대학 1곳');
  });

  it('검색: 고르면 그 시·도 + 핀 카드, 결과 없음은 빈 상태', async () => {
    serve(); open();
    const input = await screen.findByRole('searchbox', { name: '대학 이름으로 찾기' });
    fireEvent.change(input, { target: { value: '강원' } });
    const results = screen.getByRole('region', { name: '검색 결과' });
    expect(within(results).getByText('대학 2곳')).toBeTruthy();
    expect(screen.queryByRole('button', { name: '목록 보기' })).toBeNull();
    fireEvent.click(within(results).getByRole('button', { name: /삼척캠퍼스/ }));
    expect(screen.getByRole('heading', { name: '강원특별자치도' })).toBeTruthy();
    expect(screen.getByRole('article', { name: '강원대학교 삼척캠퍼스' })).toBeTruthy();
    fireEvent.change(input, { target: { value: '강원국제대' } });
    expect(screen.getByRole('heading', { name: '찾는 대학이 없어요' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '검색어 지우기' }));
    expect((input as HTMLInputElement).value).toBe('');
  });

  it('PC: 목록 카드 ↔ 핀 선택, 묶음 핀은 목록을 거른다', async () => {
    serve('ok', false); open();
    const panel = await screen.findByRole('region', { name: '대학 목록' });
    expect(within(panel).getByText('시·도순')).toBeTruthy();
    fireEvent.click(within(panel).getByRole('button', { name: /목록 더 보기/ })); // 전국 목록은 4곳부터
    fireEvent.click(within(panel).getByRole('button', { name: /^경동대학교/ }));
    expect(screen.getByRole('heading', { name: '강원특별자치도' })).toBeTruthy();
    expect(within(panel).getByRole('button', { name: /^경동대학교/ }).getAttribute('aria-current')).toBe('true');
    expect(screen.getByRole('button', { name: '경동대학교 설악캠퍼스, 본교, 사립, 선택됨' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '원주시 부근 대학 3곳, 목록 열기' }));
    expect(within(panel).getByText('원주시 부근 3곳만 보는 중')).toBeTruthy();
    expect(within(panel).getAllByRole('button', { name: /캠퍼스 · / })).toHaveLength(3);
    fireEvent.click(within(panel).getByRole('button', { name: '모두 보기' }));
    expect(within(panel).getAllByRole('button', { name: /캠퍼스 · / })).toHaveLength(9);
  });

  it('공개 파일이 없으면 준비 중, 연결 실패면 다시 불러오기', async () => {
    serve('missing'); open();
    expect(await screen.findByText('대학 위치를 확인하고 있어요')).toBeTruthy();
    expect(screen.getByText('준비 중')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /캠퍼스,/ })).toBeNull();
    cleanup();
    serve('down'); open();
    expect(await screen.findByRole('heading', { name: '지도를 불러오지 못했어요' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: '목록 보기' })).toBeNull();
    expect(screen.getByText(/입결이나 대학 순위와는 관계없어요/)).toBeTruthy();
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(map))));
    fireEvent.click(screen.getByRole('button', { name: '다시 불러오기' }));
    expect(await screen.findByText('대학 10곳')).toBeTruthy();
  });

  it('판정 · 순위 · 합격 표현이 없다', async () => {
    serve(); open(); await toGangwon();
    fireEvent.click(screen.getByRole('button', { name: '강원대학교 삼척캠퍼스, 분교, 국립' }));
    const text = (document.body.textContent ?? '').replace('대학 순위와는 관계없어요', '');
    for (const word of ['안정', '적정', '소신', '상향', '위험', '합격', '추천', '인기', '순위', '1위', '확률', '상위', '하위'])
      expect(text, word).not.toContain(word);
  });
});
