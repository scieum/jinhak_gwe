import { describe, expect, it } from 'vitest';
import { buildLayers, FORMAT_ERROR, groupsOf, isSpecialProgram, localTalentMatch, lowerBound, specialKind, parseTierDraft, parseWidth, RANGE_ERROR, tierData, type TierCell } from './deptTier';
import type { ReleasedUnit, ResultRow } from './resultReview';

const cell = (university: string, cut: number, unit = '행정학과'): TierCell => ({ university, unit, program: '학생부교과', cut });
// spec 1-1: 19개, 컷 1.6~3.9
const SPEC = [cell('고려', 1.6), cell('서울시립', 2.3), cell('연세', 2.1), cell('중앙', 2.4, '공공인재학부'), cell('동국', 2.8), cell('성균관', 2.7),
  cell('한양', 2.5, '정책학과'), cell('한양', 2.6), cell('건국', 3.2), cell('경희', 3.1), cell('국민', 3.4), cell('아주', 3.0), cell('인하', 3.3),
  cell('가천', 3.7), cell('광운', 3.9), cell('단국', 3.6, '공공정책학과'), cell('명지', 3.9), cell('세종', 3.8), cell('숭실', 3.6, '행정학부')];
const shape = (w: number) => buildLayers(SPEC, w).map(l => `${l.label}:${l.cells.length}`);

describe('층 나누기', () => {
  it('폭 0.5 = spec 1-1 (1.0~1.5 층은 범위 밖이라 없다)', () => {
    expect(shape(50)).toEqual(['1.5~2.0:1', '2.0~2.5:3', '2.5~3.0:4', '3.0~3.5:5', '3.5~4.0:6']);
  });
  it('폭 0.2 = spec 1-5 (빈 층 1.8~2.0 포함 12층)', () => {
    expect(shape(20)).toEqual(['1.6~1.8:1', '1.8~2.0:0', '2.0~2.2:1', '2.2~2.4:1', '2.4~2.6:2', '2.6~2.8:2', '2.8~3.0:1', '3.0~3.2:2', '3.2~3.4:2', '3.4~3.6:1', '3.6~3.8:3', '3.8~4.0:3']);
  });
  it('폭 0.25 = spec 1-6 (경계 둘째 자리)', () => {
    expect(shape(25)).toEqual(['1.50~1.75:1', '1.75~2.00:0', '2.00~2.25:1', '2.25~2.50:2', '2.50~2.75:3', '2.75~3.00:1', '3.00~3.25:3', '3.25~3.50:2', '3.50~3.75:3', '3.75~4.00:3']);
  });
  it('폭 0.1: 0.01 정수 계산이라 소수 오차가 없다', () => {
    // 부동소수점이면 (2.3-1)/0.1 = 12.999… → 2.2 층으로 잘못 들어간다
    expect(lowerBound(230, 10)).toBe(230);
    expect(buildLayers([cell('가', 2.3), cell('나', 0.7 + 1.6)], 10).map(l => l.label)).toEqual(['2.3~2.4']);
  });
  it('아래 경계 포함 · 위 경계 미포함', () => {
    expect(lowerBound(250, 50)).toBe(250);
    expect(lowerBound(249, 50)).toBe(200);
    expect(lowerBound(240, 20)).toBe(240);
    expect(lowerBound(300, 30)).toBe(280);
  });
  it('9.0은 마지막 층, 위 경계는 9.0으로 자른다', () => {
    expect(buildLayers([cell('가', 9)], 50)[0].label).toBe('8.5~9.0');
    expect(buildLayers([cell('가', 9)], 30)[0].label).toBe('8.8~9.0');
    expect(buildLayers([cell('가', 1)], 50)[0].label).toBe('1.0~1.5');
  });
  it('층 안은 컷이 작은 칸부터 왼쪽, 같으면 대학 → 모집단위 가나다순', () => {
    expect(buildLayers(SPEC, 50)[2].cells.map(c => `${c.university} ${c.unit}`)).toEqual(['한양 정책학과', '한양 행정학과', '성균관 행정학과', '동국 행정학과']);
    expect(buildLayers([cell('나', 2.1), cell('가', 2.1), cell('다', 2.0)], 50)[0].cells.map(c => c.university)).toEqual(['다', '가', '나']);
  });
  it('칸이 없으면 층도 없다', () => expect(buildLayers([], 50)).toEqual([]));
});

describe('직접 입력 검사', () => {
  it.each([['0.25', 25], ['0.05', 5], ['1.0', 100], ['1', 100], ['.5', 50], [' 0.3 ', 30], ['1.00', 100]])('%s → %i', (t, w) => expect(parseWidth(t)).toEqual({ w100: w }));
  it.each(['0', '0.04', '1.5', '1.01', '2'])('범위 밖 %s', t => expect(parseWidth(t)).toEqual({ error: RANGE_ERROR }));
  it.each(['abc', '0,25', '0.255', '0.2.5', '-0.2', '.', '1e-1'])('형식 오류 %s', t => expect(parseWidth(t)).toEqual({ error: FORMAT_ERROR }));
  it('빈칸은 오류가 아니다', () => expect(parseWidth('  ')).toBeNull());
});

const row = (university: string, unit: string, cut: string, extra: Partial<ResultRow> = {}): ResultRow => ({
  university, result_year: '2026', round: '수시', admission_type: '교과', program: '학생부교과', recruit_unit: unit, quota: '', applicants: '', competition_rate: '',
  fill_count: '', fill_rate: '', cut_50: '', cut_70: cut, cut_other: '', metric: '교과등급', basis: '', grade_system: '9', source_url: 'https://a.ac.kr', source_page: '', note: '', ...extra,
});
const unit = (university: string, rows: ResultRow[]): ReleasedUnit => ({ university, year: 2026, source_url: 'https://a.ac.kr', license: 'allowed', approvals: [], rows });
const field = (university: string, unit: string, major?: string) => ({ university, unit, small: '행정·정책', mid: '사회과학', major });
const G = { major: '인문' as const, mid: '사회과학', small: '행정·정책' };

describe('대상 고르기', () => {
  it('대계열이 없는 계열표 행은 묶음에도 표에도 없다', () => {
    expect(groupsOf([field('가', '행정학과'), field('나', '행정학과', '기타')])).toEqual([]);
    expect(groupsOf([field('가', '행정학과', '인문')])).toEqual([G]);
  });
  it('공개 컷이 없는 모집단위는 준비 중, 5등급제 · 다른 유형 · 이전 학년도는 빠진다', () => {
    const units = [unit('가', [row('가', '행정학과', '2.1')]), unit('나', [row('나', '행정학과', '3.4')]), unit('다', [row('다', '행정학과', '2.9')]),
      unit('라', [row('라', '행정학과', '2.0', { grade_system: '5' })]), unit('마', [row('마', '행정학과', '1.9', { result_year: '2025' })])];
    const fields = ['가', '나', '다', '라', '마', '바'].map(u => field(u, '행정학과', '인문'));
    const d = tierData(units, fields, G, '교과');
    expect(d.status).toBe('ok');
    if (d.status === 'pending') return;
    expect(d.year).toBe(2026);
    expect(d.cells.map(c => c.university)).toEqual(['가', '나', '다']);
    expect(d.pending).toBe(2); // 라(5등급제) · 바(공개 입결 없음). 마는 다른 학년도라 빠진다
    expect(tierData(units, fields, G, '종합').status).toBe('pending');
  });
  it('특별 전형(자격 제한)은 기본으로 빼고 종류별 개수만 센다, 켠 종류만 모집단위마다 칸이 하나 더', () => {
    expect(['학생부교과(농어촌학생전형)', '학생부종합(기회균형Ⅰ)', '특성화고교전형', '기초생활수급자 및 차상위계층전형', '재외국민', '학생부종합(사회적배려대상자)']
      .map(specialKind)).toEqual(['농어촌', '기회균형', '특성화고', '기회균형', '재외국민·서해5도', '기회균형']);
    expect(['학생부교과(일반전형)', '지역인재전형', '학생부종합(서류형)', '교과우수자'].filter(isSpecialProgram)).toEqual([]);
    const sp = { program: '학생부교과(특성화고교)' }, rural = { program: '농어촌학생' };
    const units = [unit('가', [row('가', '행정학과', '2.1'), row('가', '행정학과', '4.0', sp), row('가', '행정학과', '3.0', rural)]), unit('나', [row('나', '행정학과', '3.4')]),
      unit('다', [row('다', '행정학과', '2.9')]), unit('라', [row('라', '행정학과', '5.1', sp)])];
    const fields = ['가', '나', '다', '라'].map(u => field(u, '행정학과', '인문'));
    const off = tierData(units, fields, G, '교과'), on = tierData(units, fields, G, '교과', { kinds: ['특성화고'] });
    expect(off).toMatchObject({ status: 'ok', pending: 0, special: 3, kinds: { 특성화고: 2, 농어촌: 1 }, other: 0 });
    expect(off.status !== 'pending' && off.cells.map(c => `${c.university}:${c.cut}`)).toEqual(['가:2.1', '나:3.4', '다:2.9']);
    expect(on).toMatchObject({ special: 1, kinds: { 특성화고: 2, 농어촌: 1 } });
    expect(on.status !== 'pending' && on.cells.map(c => `${c.university}:${c.cut}`)).toEqual(['가:2.1', '가:4', '나:3.4', '다:2.9', '라:5.1']);
  });
  it('지역인재는 권역이 맞는 대학만 칸으로, 아니면 개수만', () => {
    const lt = { program: '지역인재전형' };
    const units = [unit('가', [row('가', '행정학과', '2.1'), row('가', '행정학과', '2.6', lt)]), unit('나', [row('나', '행정학과', '3.4'), row('나', '행정학과', '3.9', lt)]),
      unit('다', [row('다', '행정학과', '2.9')])];
    const fields = ['가', '나', '다'].map(u => field(u, '행정학과', '인문'));
    expect(tierData(units, fields, G, '교과')).toMatchObject({ local: 2, special: 0 });
    const d = tierData(units, fields, G, '교과', { localOk: u => u === '가' });
    expect(d).toMatchObject({ local: 1 });
    expect(d.status !== 'pending' && d.cells.map(c => `${c.university}:${c.cut}`)).toEqual(['가:2.1', '가:2.6', '나:3.4', '다:2.9']);
  });
  it('지역인재 권역: 같은 권역이면 해당 가능, 수도권 · 모름 · 미설정은 아니다', () => {
    expect(localTalentMatch('충청북도', ['대전'])).toBe(true);
    expect(localTalentMatch('광주광역시', ['전남광주'])).toBe(true);
    expect(localTalentMatch('전라남도', ['전북'])).toBe(true);
    expect(localTalentMatch('경상북도', ['대구'])).toBe(true);
    expect(localTalentMatch('경상남도', ['서울', '울산'])).toBe(true); // 캠퍼스 하나라도
    expect(localTalentMatch('경상북도', ['부산'])).toBe(false);
    expect(localTalentMatch('강원특별자치도', ['충북'])).toBe(false);
    expect(localTalentMatch('서울특별시', ['서울'])).toBe(false);
    expect(localTalentMatch('제주특별자치도', [])).toBe(false);
    expect(localTalentMatch('', ['대전'])).toBe(false);
  });
  it('3개 미만이면 자료 부족', () => {
    expect(tierData([unit('가', [row('가', '행정학과', '2.1')])], [field('가', '행정학과', '인문')], G, '교과').status).toBe('short');
  });
});

describe('실제 자료(dept-tier.json) 읽기', () => {
  const file = {
    format: 'jinhak-navi-dept-tier', version: 1,
    fields: [['가대', '행정학과', '행정·정책', '사회과학', '인문'], ['나대', '행정학부', '행정·정책', '사회과학', '인문'], ['다대', '행정학과', '행정·정책', '사회과학', '인문'],
      ['라대', '체육학과', '체육', '체육', '예체능']],
    rows: [['가대', '행정학과', '교과', '지역균형', '2026', '2.31', '15'], ['나대', '행정학부', '교과', '일반', '2026', '3.4'], ['다대', '행정학과', '교과', '일반', '2026', '1.9'],
      ['다대', '행정학과', '종합', '일반', '2026', '9.5'], ['라대', '체육학과', '교과', '일반', '2026', '4.0']],
  };
  it('인문·자연 계열만 · 범위 밖 컷은 버리고 원문 값 그대로 층을 쌓는다', () => {
    const { units, fields } = parseTierDraft(file);
    expect(fields.map(f => f.unit)).toEqual(['행정학과', '행정학부', '행정학과']);
    const group = groupsOf(fields)[0], data = tierData(units, fields, group, '교과');
    expect(data).toMatchObject({ status: 'ok', year: 2026, candidates: 3, pending: 0 });
    expect(data.status !== 'pending' && data.cells.map(c => `${c.university}:${c.cut}`)).toEqual(['가대:2.31', '나대:3.4', '다대:1.9']);
    expect(tierData(units, fields, group, '종합')).toMatchObject({ status: 'pending', pending: 3 }); // 9.5는 버림
    expect(units.flatMap(u => u.rows).map(r => r.quota)).toEqual(['15', '', '', '']); // 7번째 칸 = 모집인원(없으면 빈칸)
  });
  it('형식이 다르면 빈 자료', () => {
    expect(parseTierDraft({ ...file, format: 'x' })).toEqual({ units: [], fields: [] });
    expect(parseTierDraft(null)).toEqual({ units: [], fields: [] });
  });
});
