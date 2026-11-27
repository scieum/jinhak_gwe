import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SpecialTracks } from '../src/screens/SpecialTracks';
import { resetReleasedResults } from '../src/data/releasedResults';
import { resetSpecialTracks } from '../src/data/specialTracks';
import { setSampleFlag } from '../src/data/sample/mode';

// 테스트 전용 픽스처(spec 1장 시험용 숫자). public/data에는 넣지 않는다.
const OK = [{ reviewer: 'A', at: '2026-11-20' }, { reviewer: 'B', at: '2026-11-20' }];
const plan = (...l: [string, number, boolean?][]) => l.map(([type, quota, practical]) => ({ name: `학생부${type}`, type, quota, minimum: true, ...(practical ? { practical } : {}) }));
const map = (university: string, unit: string, track: string, p: ReturnType<typeof plan>, extra: object = {}) =>
  ({ university, unit, track, evidence: '모집단위 이름 기준', approvals: OK, reviewed_at: '2026-11-20', plan: p, ...extra });
const tracks = {
  format: 'jinhak-navi-special-tracks', version: 1, base_date: '2026-11-18',
  mapping: { reviewed_at: '2026-11-20', pending: { 메디컬: 4 }, rows: [
    map('강원대학교', '의예과', '메디컬', plan(['교과', 22], ['종합', 10]), { sub: '의예', apply_period: '2027년 9월(시행계획 기준)' }),
    map('가천대학교', '약학과', '메디컬', plan(['교과', 10], ['종합', 12], ['논술', 5]), { sub: '약학' }),
    map('광주과학기술원', '기초교육학부', '과기원', plan(['종합', 200]), { tag: '특수법 설립' }),
    map('포항공과대학교', '무은재학부', '과기원', plan(['종합', 320])),
    map('강원대학교', '체육교육과', '체육', plan(['교과', 6], ['실기', 14]), { sub: '체육교육' }),
    map('강원대학교', '체육교육과', '교육', plan(['교과', 6], ['실기', 14]), { sub: '사범대' }),
    map('경희대학교', '체육학과', '체육', plan(['실기', 40])),
  ] },
  practical: [{ university: '강원대학교', unit: '체육교육과', year: 2028, program: '실기위주', quota: 14, ratio: '학생부교과 40% + 실기 60%', source_label: '시험용 모집요강', source_page: '38~39쪽',
    source_url: 'https://example.com/test.pdf', approvals: OK, reviewed_at: '2026-11-21', subjects: [
      { name: '제자리멀리뛰기', measure: '2회 실시, 좋은 기록 · cm', points: '100', note: '… 원문 표 끝까지 · 기본점 40',
        criteria: { columns: ['점수', '남 기록(cm)', '여 기록(cm)'], rows: [['100', '290 이상', '230 이상'], ['95', '280~289', '220~229']] } },
      { name: '20m 왕복달리기', measure: '', points: '100', criteria: { text: '원문 문장 기준(시험용)' } },
    ] }],
};
const row = (university: string, unit: string, admission_type: string, cut: string, competition = '11.8') => ({ university, result_year: '2026', round: '수시', admission_type, program: `학생부${admission_type}`, recruit_unit: unit,
  quota: '30', applicants: '', competition_rate: competition, fill_count: '', fill_rate: '75', cut_50: '', cut_70: cut, cut_other: '', metric: '교과등급', basis: '반영 교과 평균', grade_system: '9',
  source_url: `https://${encodeURIComponent(university)}.ac.kr`, source_page: '', note: '' });
const unit = (university: string, rows: ReturnType<typeof row>[]) => ({ university, year: 2026, source_url: `https://${encodeURIComponent(university)}.ac.kr`, license: 'allowed', approvals: OK, rows });
const released = { format: 'jinhak-navi-released-results', version: 1, generated_at: '', units: [
  unit('강원대학교', [row('강원대학교', '의예과', '교과', '1.21'), row('강원대학교', '체육교육과', '교과', '2.85')]), unit('가천대학교', [row('가천대학교', '약학과', '교과', '', '18.2')]),
  unit('광주과학기술원', [row('광주과학기술원', '기초교육학부', '종합', '1.68', '9.4')]), unit('포항공과대학교', [row('포항공과대학교', '무은재학부', '종합', '', '6.1')]),
] };

function serve(withTracks = true, compact = false) {
  resetReleasedResults(); resetSpecialTracks();
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: compact, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
  vi.stubGlobal('fetch', vi.fn(async (url: string) => String(url).includes('special-tracks')
    ? (withTracks ? new Response(JSON.stringify(tracks)) : new Response('', { status: 404 })) : new Response(JSON.stringify(released))));
}
const open = () => render(<MemoryRouter><SpecialTracks /></MemoryRouter>);
const chip = (name: RegExp) => within(screen.getByRole('radiogroup', { name: '계열' })).getByRole('radio', { name });

afterEach(() => { cleanup(); setSampleFlag('off'); vi.unstubAllGlobals(); resetReleasedResults(); resetSpecialTracks(); });

describe('특수 계열 모아보기', () => {
  it('검수 자료에서도 사범대 세부 학과를 골라 같은 전공만 모아본다', async () => {
    serve();
    const names = ['국어교육과', '국어교육전공', '영어교육과'];
    const education = { ...tracks, mapping: { ...tracks.mapping, rows: names.map(name => map('강원대학교', name, '교육', plan(['교과', 10]), { sub: '사범대' })) } };
    const grades = { ...released, units: [unit('강원대학교', names.map(name => row('강원대학교', name, '교과', '2.5')))] };
    vi.stubGlobal('fetch', vi.fn(async (url: string) => new Response(JSON.stringify(String(url).includes('special-tracks') ? education : grades))));
    open(); await screen.findByRole('radio', { name: /교육, 대학/ });
    fireEvent.click(chip(/교육/));
    await screen.findByRole('table');
    fireEvent.click(screen.getByRole('button', { name: '사범대' }));
    fireEvent.change(screen.getByRole('combobox', { name: '세부 학과' }), { target: { value: '국어교육' } });
    const table = screen.getByRole('table');
    expect(within(table).getByText('국어교육과')).toBeTruthy();
    expect(within(table).getByText('국어교육전공')).toBeTruthy();
    expect(within(table).queryByText('영어교육과')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '전체' }));
    expect(within(screen.getByRole('table')).getByText('영어교육과')).toBeTruthy();
  });
  it('샘플을 끄면 샘플 매핑을 남기지 않고 실제 자료로 전환한다', async () => {
    serve(false); setSampleFlag('on'); open();
    await screen.findByRole('table');
    act(() => setSampleFlag('off'));
    await screen.findByRole('alert');
    expect(screen.queryByRole('table')).toBeNull();
  });
  it('전용 매핑이 없으면 수집 자료를 시도하고 형식 오류에 재시도를 제공한다', async () => {
    serve(false); open();
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.getByRole('button', { name: '다시 불러오기' })).toBeTruthy();
    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.getByText(/대학이나 학과의 순위 · 추천이 아니에요/)).toBeTruthy();
  });

  it('메디컬 기본: 가나다순 표 · 빈칸 글자 · 준비 중 개수, 과기원으로 바꾸면 종합 · 사실 태그', async () => {
    serve(); open();
    const table = await screen.findByRole('table');
    expect(chip(/메디컬/).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByText('대학 2곳 · 모집단위 2개', { selector: '.st-head__total' })).toBeTruthy();
    expect(screen.getByText('준비 중 모집단위 4개 — 검수가 끝나면 채워져요')).toBeTruthy();
    const rows = within(table).getAllByRole('row').slice(1).map(r => r.textContent);
    expect(rows[0]).toContain('가천대학교약학과'); expect(rows[0]).toContain('미공개');
    expect(rows[1]).toContain('1.21');
    fireEvent.click(chip(/과기원/));
    expect(screen.getByText('과기원, 대학 2곳, 모집단위 2개')).toBeTruthy();
    expect(within(screen.getByRole('group', { name: '전형 유형' })).getByRole('button', { name: '종합' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByText('특수법 설립')).toBeTruthy();
    expect(screen.getByText('1.68')).toBeTruthy();
    // 정렬은 가나다 · 모집인원만
    fireEvent.click(screen.getByRole('button', { name: '모집, 모집인원 많은 순으로 정렬' }));
    expect(within(screen.getByRole('table')).getAllByRole('row')[1].textContent).toContain('포항공과대학교');
  });

  it('고른 유형의 입결이 없으면 빈 상태, 버튼으로 다른 유형을 본다', async () => {
    serve(); open();
    await screen.findByRole('table');
    fireEvent.click(chip(/과기원/));
    fireEvent.click(within(screen.getByRole('group', { name: '전형 유형' })).getByRole('button', { name: '교과' }));
    expect(screen.getByRole('heading', { name: '과기원은 공개된 교과 전형 입결이 없어요' })).toBeTruthy();
    expect(screen.getByText('과기원 2곳은 2028에 교과 전형으로 뽑지 않아요')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '종합 입결로 보기' }));
    expect(screen.getByRole('table')).toBeTruthy();
  });

  it('모바일: 카드를 누르면 상세 시트, 세부 시트로 약학만 본다', async () => {
    serve(true, true); open();
    const card = await screen.findByRole('button', { name: /^강원대학교 의예과, 2028 모집 32명/ });
    expect(screen.queryByRole('table')).toBeNull();
    fireEvent.click(card);
    const sheet = screen.getByRole('dialog', { name: '강원대학교 의예과' });
    expect(within(sheet).getByText('학생부교과')).toBeTruthy();
    expect(within(sheet).getByText('22명 · 수능최저 있음')).toBeTruthy();
    expect(within(sheet).getByText('2027년 9월(시행계획 기준)')).toBeTruthy();
    expect(within(sheet).getByText('1.21')).toBeTruthy();
    expect(within(sheet).getByRole('link', { name: '대학 상세 보기 ›' }).getAttribute('href')).toBe(`/univ-detail?u=${encodeURIComponent('강원대학교')}`);
    fireEvent.click(within(sheet).getByRole('button', { name: '닫기' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '세부 전체 · 가나다순 ▾' }));
    const pick = screen.getByRole('dialog', { name: '메디컬 세부 · 정렬' });
    expect(within(pick).getByRole('button', { name: /치의예/ }).textContent).toContain('준비 중');
    fireEvent.click(within(pick).getByRole('button', { name: /약학/ }));
    expect(screen.getByRole('button', { name: '세부 약학 · 가나다순 ▾' })).toBeTruthy();
    expect(screen.getAllByRole('button', { name: /상세 보기$/ })).toHaveLength(1);
  });

  it('체육: 실기 기준은 검수된 것만 펼쳐 보이고, 없으면 준비 중이다', async () => {
    serve(); open();
    await screen.findByRole('table');
    fireEvent.click(chip(/체육/));
    expect(screen.getByText('실기 전형은 교과 컷을 표시하지 않아요 · 실기 종목과 채점 기준은 대학별 상세에서 확인해 주세요')).toBeTruthy();
    expect(screen.queryByText('실기 2종목 · 채점 기준 있어요')).toBeNull();
    expect(screen.queryByText('실기 기준 준비 중')).toBeNull();
    expect(screen.getAllByText('· 교육 묶음에도 있어요').length).toBeGreaterThan(0);
    expect(screen.queryByText('실기 점수 비중이 커서 교과 컷을 따로 보이지 않아요 · 전형 상세에서 봐요')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '경희대학교 체육학과 상세 보기' }));
    let dialog = screen.getByRole('dialog', { name: '경희대학교 체육학과' });
    expect(within(dialog).getByRole('heading', { name: '실기 과목 · 채점 기준' })).toBeTruthy();
    expect(within(dialog).getByText('준비 중')).toBeTruthy();
    expect(within(dialog).queryByRole('table')).toBeNull();
    fireEvent.click(within(dialog).getByRole('button', { name: '닫기' }));
    fireEvent.click(screen.getByRole('button', { name: '강원대학교 체육교육과 상세 보기' }));
    dialog = screen.getByRole('dialog', { name: '강원대학교 체육교육과' });
    expect(within(dialog).getByText('모집요강 원문 옮김 · 검수일 2026-11-21')).toBeTruthy();
    expect(within(dialog).getByText('원문에 없어요')).toBeTruthy();
    const toggle = within(dialog).getByRole('button', { name: '제자리멀리뛰기 채점 기준, 접힘' });
    expect(within(dialog).queryByRole('table', { name: '제자리멀리뛰기 채점 기준' })).toBeNull();
    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(within(within(dialog).getByRole('table', { name: '제자리멀리뛰기 채점 기준' })).getByText('290 이상')).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button', { name: '20m 왕복달리기 채점 기준, 접힘' }));
    expect(within(dialog).getByText('원문 문장 기준(시험용)')).toBeTruthy();
    expect(within(dialog).getByText(/기록을 넣어 점수를 계산해 주지 않아요/)).toBeTruthy();
    expect(within(dialog).queryByRole('textbox')).toBeNull(); // 기록 입력 · 점수 계산 없음(NEVER-1)
  });

  it('판정 · 순번 · 합격 표현이 없다', async () => {
    serve(); open();
    await screen.findByRole('table');
    for (const t of ['메디컬', '과기원', '체육']) {
      fireEvent.click(chip(new RegExp(t)));
      const text = document.body.textContent ?? '';
      for (const word of ['안정', '적정', '소신', '상향', '위험', '티어', '1위', '합격', '인기'])
        expect(text, `${t}: ${word}`).not.toContain(word);
    }
  });
});
