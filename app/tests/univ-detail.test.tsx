import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ProgramDetail, UnivDetail } from '../src/screens/UnivDetail';
import { programSummaries } from '../src/domain/resultBrowse';
import { resetReleasedResults } from '../src/data/releasedResults';
import { sampleUnits } from './result-browser.test';
import { programPath } from '../src/domain/interests';

const plans = { format: 'jinhak-navi-admission-plans', version: 1, year: 2028, checked_at: '2026-11-18', review_status: 'draft', entries: [{
  id: 'p1', university: '가나대학교', campus: '본교', region: '서울', year: 2028, review_status: 'draft', notices: [],
  documents: [{ id: 'd1', label: '2028 시행계획', provider: 'university', source_url: 'https://ga.example.ac.kr/plan', download_url: 'https://ga.example.ac.kr/plan.pdf', format: 'pdf', sha256: 'a'.repeat(64), checked_at: '2026-11-18', page_count: 10, filename: '', year_check: 'visual', topics: [], note: '' }],
  programs: [{ name: '논술전형', round: '수시', type: '논술', quota: '150명', method: '논술 100%', minimum: '2개 합 6', eligibility: '졸업(예정)자', pages: [3], document_id: 'd1' }] }] };

const file = (units: unknown[]) => ({ format: 'jinhak-navi-released-results', version: 1, generated_at: '', units });
function serve(units: typeof sampleUnits) {
  resetReleasedResults();
  // parseRelease requires two distinct approvals, as a real release file has.
  const withApprovals = units.map(u => ({ ...u, approvals: [{ reviewer: 'A', at: '1' }, { reviewer: 'B', at: '2' }] }));
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(file(withApprovals)))));
}
const at = (path: string) => render(<MemoryRouter initialEntries={[path]}><Routes><Route path="/univ-detail" element={<UnivDetail />} /><Route path="/program-detail" element={<ProgramDetail />} /></Routes></MemoryRouter>);
afterEach(() => { cleanup(); vi.unstubAllGlobals(); resetReleasedResults(); });

describe('대학·전형 상세', () => {
  it('최근 학년도로 전형을 요약하고 합계 행이 있으면 모집 합을 내지 않는다', () => {
    expect(programSummaries(sampleUnits, '가나대학교').map(p => [p.program, p.round, p.year, p.units])).toEqual([['학생부교과', '수시', 2026, 3]]);
  });
  it('전형 상세는 모집단위별 연도 컷 표를 보여 준다', async () => {
    serve(sampleUnits);
    at('/program-detail?u=가나대학교&p=학생부교과');
    const table = await screen.findByRole('table');
    expect(within(table).getByText('국어교육과')).toBeTruthy();
    expect(within(table).getByText('2.1')).toBeTruthy();
  });
  it('없는 대학은 안내를 보여 준다', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(plans))));
    at('/univ-detail?u=없는대학');
    expect(await screen.findByRole('heading', { name: '대학을 찾지 못했어요' })).toBeTruthy();
  });
  it('실제 모드는 시행계획 전형을 보여 주고 전년 대비는 준비 중', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(plans))));
    at('/univ-detail?u=가나대학교');
    expect(await screen.findByRole('heading', { name: '논술전형' })).toBeTruthy();
    expect(screen.getAllByText('준비 중').length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: '전형 상세 보기' }).getAttribute('href')).toBe(programPath('가나대학교', '논술전형'));
  });
  it('샘플 모드는 시안 데모(경희대학교)를 보여 주고 유형 필터 · 행 선택이 패널을 바꾼다', async () => {
    localStorage.setItem('jinhak-navi-sample', 'on');
    at('/univ-detail?u=경희대학교');
    expect(screen.getByText('바뀐 점 4건')).toBeTruthy();
    expect(screen.getByRole('heading', { name: '학생부교과 지역균형전형' })).toBeTruthy();
    fireEvent.click(screen.getByText('학생부종합 고른기회전형'));
    expect(screen.getByRole('heading', { name: '학생부종합 고른기회전형' })).toBeTruthy();
    fireEvent.click(within(screen.getByRole('group', { name: '전형 유형' })).getByRole('button', { name: '논술' }));
    expect(screen.getByText('표에서 전형을 고르면 여기에 요약이 보여요.')).toBeTruthy();
    expect(screen.getByText(/샘플의 대학·숫자는 예시예요/)).toBeTruthy();
    localStorage.removeItem('jinhak-navi-sample');
  });
});
