import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ProgramDetail, UnivDetail } from '../src/screens/UnivDetail';
import { programSummaries } from '../src/domain/resultBrowse';
import { resetReleasedResults } from '../src/data/releasedResults';
import { resetUnivWiki } from '../src/data/univWiki';
import { sampleUnits } from './result-browser.test';

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
  it('대학 상세는 공개 입결 전형을 보여 주고 전형 상세로 연결한다', async () => {
    serve(sampleUnits);
    at('/univ-detail?u=가나대학교');
    expect(await screen.findByRole('heading', { name: '가나대학교' })).toBeTruthy();
    expect(screen.getByText(/시행계획·모집요강 자료/)).toBeTruthy();
    expect(screen.getByRole('link', { name: /^학생부교과/ }).getAttribute('href')).toBe('/program-detail?u=%EA%B0%80%EB%82%98%EB%8C%80%ED%95%99%EA%B5%90&p=%ED%95%99%EC%83%9D%EB%B6%80%EA%B5%90%EA%B3%BC');
    fireEvent.click(within(screen.getByRole('group', { name: '전형 유형' })).getByRole('button', { name: '논술' }));
    expect(screen.getByRole('heading', { name: '이 유형의 공개 입결은 없어요' })).toBeTruthy();
  });
  it('전형 상세는 모집단위별 연도 컷 표를 보여 준다', async () => {
    serve(sampleUnits);
    at('/program-detail?u=가나대학교&p=학생부교과');
    const table = await screen.findByRole('table');
    expect(within(table).getByText('국어교육과')).toBeTruthy();
    expect(within(table).getByText('2.1')).toBeTruthy();
  });
  it('없는 대학은 안내를 보여 준다', async () => {
    serve([]);
    at('/univ-detail?u=없는대학');
    expect(await screen.findByRole('heading', { name: '대학을 찾지 못했어요' })).toBeTruthy();
  });
});

describe('대학 상세 위키', () => {
  it('섹션 이동 탭 6개, 검수 전 위키 섹션은 제목과 "준비 중"만 보인다', async () => {
    resetUnivWiki();
    serve(sampleUnits);
    at('/univ-detail?u=가나대학교');
    expect(await screen.findByRole('heading', { name: '가나대학교' })).toBeTruthy();
    const nav = screen.getByRole('navigation', { name: '섹션 이동' });
    expect(within(nav).getAllByRole('link').map(a => a.textContent)).toEqual(['개요', '특이점', '반영 방법', '수능 최저', '전형요소', '비슷한 대학']);
    for (const title of ['올해 특이점', '전년 대비 바뀐 점', '2028 전형 목록', '전형별 반영 방법', '수능 최저', '전형요소', '입결이 비슷한 대학'])
      expect(screen.getByRole('heading', { name: title })).toBeTruthy();
    expect(await screen.findAllByText('준비 중')).toHaveLength(7);
    expect(screen.queryByText(/공식 문서 요약/)).toBeNull();
  });
});
