import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ResultBrowser } from '../src/components/ResultBrowser';
import { axisRange, delta, resultLines } from '../src/domain/resultBrowse';
import { RESULT_COLUMNS, type ReleasedUnit, type ResultRow } from '../src/domain/resultReview';

afterEach(cleanup);

const row = (o: Partial<ResultRow>): ResultRow => ({ ...Object.fromEntries(RESULT_COLUMNS.map(c => [c, ''])), university: '가나대학교', round: '수시', admission_type: '교과', program: '학생부교과', metric: '교과등급', source_url: 'https://a.ac.kr/x', ...o } as ResultRow);
const unit = (year: number, rows: Partial<ResultRow>[]): ReleasedUnit => ({ university: '가나대학교', year, source_url: 'https://a.ac.kr/x', license: 'allowed', approvals: [], rows: rows.map(r => row({ result_year: String(year), ...r })) });
export const sampleUnits = [
  unit(2025, [{ recruit_unit: '국어교육과', cut_70: '2.40' }, { recruit_unit: '경영학과', cut_70: '' }, { recruit_unit: '미술과', admission_type: '실기', cut_70: '' }]),
  unit(2026, [{ recruit_unit: '국어교육과', cut_70: '2.10', competition_rate: '7.5' }, { recruit_unit: '경영학과', cut_70: '310', metric: '환산점수' }, { recruit_unit: '수학과', round: '정시', cut_70: '2' }]),
];

describe('수시 입결 묶기', () => {
  it('모집단위별 연도 값을 모으고 정시는 뺀다', () => {
    const lines = resultLines(sampleUnits, '가나대학교', '교과');
    expect(lines.map(l => [l.unit, l.plottable])).toEqual([['국어교육과', true], ['경영학과', false]]);
    expect(delta(lines[0], [2025, 2026])).toBe(-0.3);
    expect(delta(lines[1], [2025, 2026])).toBeNull();
    expect(resultLines(sampleUnits, '가나대학교', '기타').map(l => l.unit)).toEqual(['미술과']);
  });
  it('축은 0.5 단위로 감싸고 최소 2등급 폭', () => {
    expect(axisRange([2.1, 2.4])).toEqual({ min: 2, max: 4 });
    expect(axisRange([1.2, 4.6])).toEqual({ min: 1, max: 5 });
    expect(axisRange([8.9])).toEqual({ min: 7, max: 9 });
  });
});
describe('ResultBrowser', () => {
  it('공개 자료가 없으면 빈 상태', () => {
    render(<MemoryRouter><ResultBrowser units={[]} /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: '공개된 수시 입결이 아직 없어요' })).toBeTruthy();
  });
  it('좌표는 교과등급 70% 컷만, 표는 모든 기준과 전년 대비를 보여 준다', () => {
    render(<MemoryRouter><ResultBrowser units={sampleUnits} /></MemoryRouter>);
    const plot = screen.getByRole('list', { name: '70% 컷 점 그래프' });
    expect(within(plot).getAllByRole('listitem').map(e => e.getAttribute('aria-label'))).toEqual(['국어교육과 학생부교과 2025 2.4, 2026 2.1']);
    fireEvent.click(screen.getByRole('button', { name: /다른 기준으로 공개된 학과 1개/ }));
    const table = screen.getByRole('table');
    expect(within(table).getByText('▼0.30')).toBeTruthy();
    expect(within(table).getByText('환산점수')).toBeTruthy();
    fireEvent.click(within(screen.getByRole('group', { name: '전형 유형' })).getByRole('button', { name: '논술' }));
    expect(screen.getByRole('heading', { name: '이 전형이 없어요' })).toBeTruthy();
  });
  it('연도별 컷·경쟁률·모집·문자 열을 정렬하고 빈 컷은 양방향 모두 마지막에 둔다', () => {
    const rows = [unit(2026, [
      { recruit_unit: '나학과', program: '나전형', cut_70: '10', competition_rate: '12', quota: '100' },
      { recruit_unit: '가학과', program: '가전형', cut_70: '2.4', competition_rate: '2', quota: '9' },
      { recruit_unit: '다학과', program: '다전형', cut_70: '' },
    ])];
    render(<MemoryRouter><ResultBrowser units={rows} /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: '표' }));
    const table = screen.getByRole('table');
    const order = () => [...table.querySelectorAll('tbody tr')].map(r => r.querySelector('td')!.textContent);
    for (const label of ['모집단위', '전형', '2026', '경쟁률', '모집']) {
      fireEvent.click(within(table).getByRole('button', { name: `${label} 오름차순 정렬` }));
      expect(order()[0]).toBe('가학과');
    }
    fireEvent.click(within(table).getByRole('button', { name: '2026 오름차순 정렬' }));
    fireEvent.click(within(table).getByRole('button', { name: '2026 내림차순 정렬' }));
    expect(order()).toEqual(['나학과', '가학과', '다학과']);
  });
});
