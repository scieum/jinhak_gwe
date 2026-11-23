import { describe, expect, it } from 'vitest';
import { parseTracks, planSummary, resultCell, trackView, type PlanLine, type TrackRow } from './specialTracks';
import type { ReleasedUnit, ResultRow } from './resultReview';

// 테스트용 픽스처(spec 1장 시험용 숫자). 공개 파일에는 넣지 않는다.
const OK = [{ reviewer: 'A', at: '2026-11-20' }, { reviewer: 'B', at: '2026-11-20' }];
const line = (type: PlanLine['type'], quota: number, extra: Partial<PlanLine> = {}): PlanLine => ({ name: `학생부${type}`, type, quota, minimum: true, ...extra });
const mapRow = (university: string, unit: string, plan: PlanLine[], extra: Partial<TrackRow> = {}): TrackRow =>
  ({ university, unit, track: '메디컬', sub: '의예', evidence: '모집단위 이름 기준', approvals: OK, reviewed_at: '2026-11-20', plan, ...extra });
const file = (rows: unknown[], extra: object = {}) => ({ format: 'jinhak-navi-special-tracks', version: 1, base_date: '2026-11-18', mapping: { reviewed_at: '2026-11-20', rows }, practical: [], ...extra });
const res = (university: string, unit: string, cut: string, extra: Partial<ResultRow> = {}): ResultRow => ({
  university, result_year: '2026', round: '수시', admission_type: '교과', program: '학생부교과', recruit_unit: unit, quota: '10', applicants: '', competition_rate: '11.8',
  fill_count: '', fill_rate: '75', cut_50: '', cut_70: cut, cut_other: '', metric: '교과등급', basis: '반영 교과 평균', grade_system: '9', source_url: 'https://a.ac.kr', source_page: '', note: '', ...extra,
});
const unit = (university: string, rows: ResultRow[]): ReleasedUnit => ({ university, year: 2026, source_url: 'https://a.ac.kr', license: 'allowed', approvals: OK, rows });

describe('공개 파일 검사', () => {
  it('형식이 다르거나 파일이 없으면 비어 있다(준비 중)', () => {
    expect(parseTracks(null).rows).toEqual([]);
    expect(parseTracks({ format: 'x', version: 1 }).rows).toEqual([]);
  });
  it('검수자 2명 · 근거 · 알려진 묶음/세부/태그만 남고, 전형계획이 없는 행은 준비 중으로 센다', () => {
    const d = parseTracks(file([
      mapRow('가', '의예과', [line('교과', 10)]),
      mapRow('나', '의예과', [line('교과', 10)], { approvals: [OK[0], OK[0]] }),
      mapRow('다', '의예과', [line('교과', 10)], { evidence: '' }),
      mapRow('라', '의예과', [line('교과', 10)], { sub: '없는 세부' }),
      mapRow('마', '의예과', [line('교과', 10)], { tag: '인기' as never }),
      mapRow('바', '의예과', []),
    ], { mapping: { reviewed_at: '2026-11-20', rows: [mapRow('가', '의예과', [line('교과', 10)]), mapRow('바', '의예과', [])], pending: { 메디컬: 3 } } }));
    expect(d.rows.map(r => r.university)).toEqual(['가']);
    expect(d.pending.메디컬).toBe(4);
    expect(parseTracks(file([mapRow('나', '의예과', [line('교과', 10)], { approvals: [OK[0], OK[0]] })])).rows).toEqual([]);
  });
  it('실기 기준은 https 출처와 2인 검수가 있어야 하고 2028만 받는다', () => {
    const p = { university: '가', unit: '체육교육과', year: 2028, program: '실기위주', quota: 14, ratio: '학생부교과 40% + 실기 60%', source_label: '모집요강', source_page: '38쪽',
      source_url: 'https://a.ac.kr/x.pdf', approvals: OK, reviewed_at: '2026-11-21', subjects: [{ name: '제자리멀리뛰기', measure: 'cm', points: '100', criteria: { columns: ['점수', '남', '여'], rows: [['100', '290 이상', '230 이상']] } }] };
    expect(parseTracks(file([], { practical: [p] })).practical).toHaveLength(1);
    expect(parseTracks(file([], { practical: [{ ...p, source_url: 'http://a.ac.kr' }] })).practical).toHaveLength(0);
    expect(parseTracks(file([], { practical: [{ ...p, year: 2027 }] })).practical).toHaveLength(0);
    expect(parseTracks(file([], { practical: [{ ...p, subjects: [{ ...p.subjects[0], criteria: { columns: ['점수'], rows: [['1', '2']] } }] }] })).practical).toHaveLength(0);
  });
});

describe('입결 칸', () => {
  const units = [unit('가', [res('가', '의예과', '1.21', { quota: '14' }), res('가', '의예과', '1.5', { program: '지역인재', quota: '8' }), res('가', '약학과', '', {}), res('가', '수의예과', '2.1', { grade_system: '5' }),
    res('가', '체육교육과', '2.85', { program: '실기위주', admission_type: '교과' }), res('가', '한의예과', '1.3', { result_year: '2025' })])];
  const cell = (unitName: string, plan: PlanLine[], extra: Partial<TrackRow> = {}, type: '교과' | '종합' = '교과') => resultCell(units, mapRow('가', unitName, plan, extra), type);
  it('같은 유형이 여럿이면 모집인원이 가장 많은 전형(D19)', () => expect(cell('의예과', [line('교과', 22)])).toMatchObject({ cut: 1.21 }));
  it('빈칸 글자(D15)', () => {
    expect(cell('약학과', [line('교과', 15)])).toMatchObject({ text: '미공개' });
    expect(cell('수의예과', [line('교과', 20)])).toMatchObject({ text: '다른 기준' });
    expect(cell('한의예과', [line('교과', 20)])).toMatchObject({ text: '미공개' }); // 다른 학년도는 섞지 않는다
    expect(cell('의예과', [line('교과', 5)], { is_new: true })).toEqual({ text: '신설' });
    expect(cell('의예과', [line('종합', 15)])).toEqual({ text: '—' });
    expect(cell('체육학과', [line('실기', 40)])).toEqual({ text: '실기 전형' });
    expect(cell('체육교육과', [line('교과', 6, { practical: true }), line('실기', 14)])).toEqual({ text: '실기 전형' });
  });
  it('실기가 있는 전형의 입결은 싣지 않는다(D6)', () => expect(cell('체육교육과', [line('교과', 6), line('실기', 14)])).toMatchObject({ text: '미공개' }));
  it('전형 요약은 유형별로 더한다', () => expect(planSummary(mapRow('가', 'x', [line('교과', 14), line('교과', 8), line('종합', 10)]))).toBe('교과 22 · 종합 10'));
});

describe('묶음 보기', () => {
  const data = parseTracks(file([
    mapRow('강원대학교', '의예과', [line('교과', 22), line('종합', 10)]),
    mapRow('가천대학교', '의예과', [line('교과', 10), line('종합', 23), line('논술', 7)]),
    mapRow('가천대학교', '약학과', [line('교과', 10), line('종합', 12), line('논술', 5)], { sub: '약학' }),
    mapRow('강원대학교', '체육교육과', [line('교과', 6)], { track: '체육', sub: '체육교육' }),
    mapRow('강원대학교', '체육교육과', [line('교과', 6)], { track: '교육', sub: '사범대' }),
  ]));
  const fixed = parseTracks({ ...file([]), mapping: { reviewed_at: '2026-11-20', rows: data.rows, pending: { 메디컬: 4 } } });
  const units = [unit('강원대학교', [res('강원대학교', '의예과', '1.21'), res('강원대학교', '체육교육과', '2.85')])];
  it('가나다 기본 · 모집인원 많은 순 · 세부 · 합계', () => {
    const v = trackView(fixed, units, '메디컬', null, '교과', '가나다');
    if (v.status === 'pending') throw new Error('pending');
    expect(v.rows.map(r => `${r.row.university} ${r.row.unit}`)).toEqual(['가천대학교 약학과', '가천대학교 의예과', '강원대학교 의예과']);
    expect([v.universities, v.pending, v.candidates, v.status]).toEqual([2, 4, 7, 'ok']);
    const big = trackView(fixed, units, '메디컬', null, '교과', '모집');
    if (big.status === 'pending') throw new Error('pending');
    expect(big.rows.map(r => r.total)).toEqual([40, 32, 27]);
    const sub = trackView(fixed, units, '메디컬', '약학', '교과', '가나다');
    expect(sub.status !== 'pending' && sub.rows.map(r => r.row.unit)).toEqual(['약학과']);
  });
  it('두 묶음에 든 모집단위는 다른 묶음 이름을 단다', () => {
    const v = trackView(fixed, units, '체육', null, '교과', '가나다');
    expect(v.status !== 'pending' && v.rows[0].others).toEqual(['교육']);
  });
  it('고른 유형의 입결이 하나도 없으면 empty, 매핑이 없으면 pending', () => {
    expect(trackView(fixed, units, '메디컬', null, '종합', '가나다').status).toBe('empty');
    expect(trackView(fixed, units, '특수목적대', null, '교과', '가나다').status).toBe('pending');
  });
});
