import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DeptTier } from '../src/screens/DeptTier';
import { resetReleasedResults } from '../src/data/releasedResults';
import { resetUnivWiki } from '../src/data/univWiki';

const APPROVALS = [{ reviewer: 'A', at: '2026-11-12' }, { reviewer: 'B', at: '2026-11-12' }];
// spec 1-1 일부(시험용 숫자). 바(바다대학교)는 계열표에만 있고 공개 입결이 없어 "준비 중".
const CUTS: [string, string, string][] = [['고려대학교', '행정학과', '1.6'], ['연세대학교', '행정학과', '2.1'], ['한양대학교', '정책학과', '2.5'], ['한양대학교', '행정학과', '2.6'], ['아주대학교', '행정학과', '3.0'], ['가천대학교', '행정학과', '3.7']];
const row = (university: string, unit: string, cut: string) => ({ university, result_year: '2026', round: '수시', admission_type: '교과', program: '학생부교과', recruit_unit: unit, quota: '', applicants: '',
  competition_rate: '', fill_count: '', fill_rate: '', cut_50: '', cut_70: cut, cut_other: '', metric: '교과등급', basis: '', grade_system: '9', source_url: `https://${encodeURIComponent(university)}.ac.kr`, source_page: '', note: '' });
const released = { format: 'jinhak-navi-released-results', version: 1, generated_at: '', units: CUTS.map(([u, d, c]) => ({ university: u, year: 2026, source_url: `https://${encodeURIComponent(u)}.ac.kr`, license: 'allowed', approvals: APPROVALS, rows: [row(u, d, c)] }))
  .concat({ university: '고려대학교', year: 2026, source_url: `https://${encodeURIComponent('고려대학교')}.ac.kr`, license: 'allowed', approvals: APPROVALS, rows: [row('고려대학교', '서어서문학과', '2.0')] }) };
const fieldRows = [...CUTS.map(([university, unit]) => ({ university, unit, small: '행정·정책', mid: '사회과학', major: '인문' })),
  { university: '바다대학교', unit: '행정학과', small: '행정·정책', mid: '사회과학', major: '인문' },
  { university: '고려대학교', unit: '서어서문학과', small: '스페인어', mid: '어문', major: '인문' },
  { university: '연세대학교', unit: '사학과', small: '역사', mid: '인문학' }]; // 대계열 없음 → 나오지 않는다
const wiki = (rows: unknown[]) => ({ format: 'jinhak-navi-univ-wiki', version: 1, fields: { reviewed_at: '2026-11-16', approvals: APPROVALS, rows }, entries: [] });

function serve(rows: unknown[] = fieldRows) {
  resetReleasedResults(); resetUnivWiki();
  vi.stubGlobal('fetch', vi.fn(async (url: string) => new Response(JSON.stringify(String(url).includes('univ-wiki') ? wiki(rows) : released))));
}
const open = () => render(<MemoryRouter><DeptTier /></MemoryRouter>);
const layerNames = () => screen.getAllByRole('heading', { level: 4 }).map(h => h.textContent);
const widthGroup = () => screen.getByRole('group', { name: '구간 폭' });

beforeEach(() => localStorage.clear());
afterEach(() => { cleanup(); vi.unstubAllGlobals(); resetReleasedResults(); resetUnivWiki(); });

describe('학과별 입결 구간표', () => {
  it('기본 폭 0.5로 데이터 범위 안 층만, 빈 층은 한 줄로 남긴다', async () => {
    serve(); open();
    expect(await screen.findByText('1.5~2.0')).toBeTruthy();
    expect(layerNames()).toEqual(['70% 컷 1.5~2.0모집단위 1개', '70% 컷 2.0~2.5모집단위 1개', '70% 컷 2.5~3.0모집단위 2개', '70% 컷 3.0~3.5모집단위 1개', '70% 컷 3.5~4.0모집단위 1개']);
    expect(within(widthGroup()).getByRole('button', { name: '0.5' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByText('준비 중 1개 — 검수가 끝나면 채워져요')).toBeTruthy();
    const link = screen.getByRole('link', { name: '한양대학교 정책학과, 2026학년도 학생부교과 70% 컷 2.5, 대학 상세로 이동' });
    expect(link.getAttribute('href')).toBe(`/univ-detail?u=${encodeURIComponent('한양대학교')}&d=${encodeURIComponent('정책학과|교과')}`);
    expect(screen.getByText('어떻게 나눴나요?')).toBeTruthy();
    expect(screen.getByText(/순위 · 추천이 아니에요/)).toBeTruthy();
  });

  it('폭 0.2를 고르면 다시 나누고 이 기기에 기억한다', async () => {
    serve(); open();
    await screen.findByText('1.5~2.0');
    fireEvent.click(within(widthGroup()).getByRole('button', { name: '0.2' }));
    expect(layerNames()[0]).toBe('70% 컷 1.6~1.8모집단위 1개');
    expect(screen.getAllByText('이 구간에는 공개된 입결이 없어요').length).toBeGreaterThan(0);
    expect(screen.getByText('층 11개로 다시 나눴어요')).toBeTruthy();
    expect(localStorage.getItem('dept-tier-width')).toBe('20');
    cleanup(); open();
    expect(await screen.findByText('1.6~1.8')).toBeTruthy();
  });

  it('직접: 맞는 값은 둘째 자리 경계로, 오류는 직전 폭을 유지하고 기억하지 않는다', async () => {
    serve(); open();
    await screen.findByText('1.5~2.0');
    fireEvent.click(within(widthGroup()).getByRole('button', { name: '직접' }));
    const input = screen.getByRole('textbox', { name: '구간 폭 직접 입력, 0.05부터 1.0까지' });
    expect(document.activeElement).toBe(input);
    expect(layerNames()[0]).toBe('70% 컷 1.5~2.0모집단위 1개'); // 입력 전에는 직전 폭
    fireEvent.change(input, { target: { value: '1.5' } }); fireEvent.blur(input);
    expect(screen.getByText('구간 폭은 0.05부터 1.0까지 넣을 수 있어요')).toBeTruthy();
    expect(screen.getByText('표는 직전 구간 폭 0.5 그대로예요')).toBeTruthy();
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(layerNames()[0]).toBe('70% 컷 1.5~2.0모집단위 1개');
    expect(localStorage.getItem('dept-tier-width')).toBeNull();
    fireEvent.change(input, { target: { value: '0.25' } }); fireEvent.keyDown(input, { key: 'Enter' });
    expect(layerNames()[0]).toBe('70% 컷 1.50~1.75모집단위 1개');
    expect(localStorage.getItem('dept-tier-width')).toBe('custom:0.25');
    cleanup(); open();
    expect(await screen.findByText('1.50~1.75')).toBeTruthy();
    expect((screen.getByRole('textbox', { name: /구간 폭 직접 입력/ }) as HTMLInputElement).value).toBe('0.25');
  });

  it('내 위치는 검수된 환산 규칙이 없어서 준비 중이고 판정 · 순번 표현이 없다', async () => {
    serve(); open();
    await screen.findByText('1.5~2.0');
    expect(screen.getByRole('heading', { name: '내 위치' })).toBeTruthy();
    expect(screen.getByText(/검수된 환산 규칙이 생기면 (이 표 위에|왼쪽 축에) 내 위치를 보여 드려요/)).toBeTruthy(); // 시안: 모바일 "이 표 위에" · PC "왼쪽 축에"
    const text = document.body.textContent ?? '';
    for (const word of ['안정', '적정', '소신', '상향', '위험', '티어', '1위', '합격'])
      expect(text, word).not.toContain(word);
  });

  it('3개 미만은 자료 부족, 공개 입결이 없으면 준비 중', async () => {
    serve(); open();
    await screen.findByText('1.5~2.0');
    fireEvent.click(screen.getByRole('button', { name: '어문' }));
    expect(screen.getByRole('heading', { name: '공개된 입결이 아직 적어요' })).toBeTruthy();
    fireEvent.click(within(screen.getByRole('group', { name: '전형 유형' })).getByRole('button', { name: '종합' }));
    expect(screen.getByText('이 묶음의 입결은 아직 검수 중이에요')).toBeTruthy();
  });

  it('대계열이 없는 계열은 고를 수 없고, 자연 계열이 없으면 준비 중', async () => {
    serve(); open();
    await screen.findByText('1.5~2.0');
    expect(screen.queryByRole('button', { name: '인문학' })).toBeNull();
    fireEvent.click(within(screen.getByRole('group', { name: '대계열' })).getByRole('button', { name: '자연' }));
    expect(screen.getByText(/자연 계열이 아직 검수되지 않았어요/)).toBeTruthy();
  });

  it('학과 이름으로 찾기 — 실제 모집단위 이름으로 묶음을 고른다', async () => {
    serve(); open();
    await screen.findByText('1.5~2.0');
    fireEvent.click(screen.getByRole('button', { name: '어문' }));
    fireEvent.click(screen.getByRole('button', { name: '학과 이름으로 찾기' }));
    const dialog = screen.getByRole('dialog', { name: '학과 묶음 고르기' });
    fireEvent.change(within(dialog).getByRole('searchbox', { name: '학과 이름으로 찾기' }), { target: { value: '정책' } });
    fireEvent.click(within(dialog).getByRole('button', { name: /행정·정책/ }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByText('1.5~2.0')).toBeTruthy();
  });
});
