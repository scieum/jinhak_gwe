import 'fake-indexeddb/auto';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { studentDb } from '../src/store/studentDb';
import { resetReleasedRules } from '../src/data/releasedRules';
import { App } from '../src/App';
import { approve, blockers, diffRules, newRuleDraft, newTest, nextVersion, parseRuleRelease, reject, releaseRules, requestReview, runTest, testInputs, type RuleDraft, type TestCase } from '../src/domain/ruleEditor';
import { checkSignup, emailToId, idToEmail, validId } from '../src/domain/auth';

afterEach(cleanup);

/** admin-rules 02-spec 가상 데이터: 가나대학교 2028-v3 수정안. */
function spec(): RuleDraft {
  const d = newRuleDraft('관리자 A');
  d.rule = { ...d.rule, university: '가나대학교', program: '학생부교과(지역균형)', source: 'https://example.com/guide.pdf', year_weights: { 1: 0.2, 2: 0.4, 3: 0.4 },
    subject_groups: ['국어', '수학', '영어', '사회', '과학', '한국사'], rank_grade_points: { 1: 100, 2: 97, 3: 90, 4: 80, 5: 60 }, achievement_blend: { mode: 'weighted', rank_ratio: 0.7 },
    attendance_rule: { ...d.rule.attendance_rule!, deduction_table: [{ absence_max: 0, points: 0 }, { absence_max: 2, points: 1 }, { absence_max: 5, points: 2 }, { absence_max: 365, points: 5 }] } };
  const t = (n: number, years: TestCase['years'], absence: number, expected: number): TestCase => ({ ...newTest(n), years, absence, expected });
  const all = (grade: number, achievement: 'A' | 'B') => ({ 1: { grade, achievement }, 2: { grade, achievement }, 3: { grade, achievement } });
  d.tests = [t(0, all(2, 'A'), 0, 98.32), t(1, all(3, 'B'), 4, 91.2), t(2, { 1: { grade: 1, achievement: 'A' }, 2: { grade: 2, achievement: 'B' }, 3: { grade: 2, achievement: 'B' } }, 0, 97.7)];
  return d;
}

describe('규칙 편집기 · 검수 (PRD 6-11)', () => {
  it('스펙 테스트 케이스 3개가 실제 엔진으로 통과한다', () => {
    const d = spec();
    expect(d.tests.map(t => runTest(d.rule, t).actual)).toEqual([98.32, 91.2, 97.7]);
    expect(blockers(d)).toEqual([]);
  });
  it('테스트가 모자라거나 틀리면 검수를 요청할 수 없다', () => {
    const d = spec();
    expect(blockers({ ...d, tests: d.tests.slice(0, 2) })[0]).toContain('1개 더 필요');
    expect(() => requestReview({ ...d, tests: [...d.tests.slice(0, 2), { ...d.tests[2], expected: 97.69 }] }, '관리자 A')).toThrow('불통과');
  });
  it('작성자는 승인할 수 없고, 반려는 사유가 필요하며, 승인하면 verified가 된다', () => {
    const waiting = requestReview(spec(), '관리자 A');
    expect(waiting.rule.review_status).toBe('draft');
    expect(() => approve(waiting, '관리자 A')).toThrow('다른 관리자');
    expect(() => reject(waiting, '관리자 B', ' ')).toThrow('반려 사유');
    expect(reject(waiting, '관리자 B', '2등급 점수 확인').status).toBe('반려');
    const done = approve(waiting, '관리자 B');
    expect([done.status, done.rule.review_status, done.reviewer]).toEqual(['검수 완료', 'verified', '관리자 B']);
    expect(releaseRules([waiting, done]).rules).toHaveLength(1);
    const v2 = nextVersion(done, '관리자 C');
    expect([v2.rule.version, v2.rule.review_status, v2.status]).toEqual([2, 'draft', '작성 중']);
    expect(releaseRules([done, v2]).rules[0].version).toBe(1);
  });
  it('변경 전·후 비교는 바뀐 항목만 표시한다', () => {
    const d = spec(), before = { ...d.rule, rank_grade_points: { 1: 100, 2: 96, 3: 90, 4: 80, 5: 60 } };
    expect(diffRules(before, d.rule).filter(x => x.changed).map(x => x.label)).toEqual(['석차등급 점수']);
  });
  it('화면: 관리자 이름 없이 새 규칙을 만들 수 없고, 만들면 편집 폼이 열린다', async () => {
    render(<MemoryRouter initialEntries={['/admin/admin-rules']}><App /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: '새 규칙 만들기' }));
    expect(screen.getByRole('alert').textContent).toContain('관리자 이름');
    fireEvent.change(screen.getByLabelText('관리자 이름'), { target: { value: '관리자 A' } });
    fireEvent.click(screen.getByRole('button', { name: '새 규칙 만들기' }));
    expect(await screen.findByRole('heading', { name: '환산 규칙 편집' })).toBeTruthy();
    expect((screen.getByRole('button', { name: '검수 요청' }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText('대학과 전형 이름을 적어 주세요.')).toBeTruthy();
  });
});

describe('로그인·회원가입', () => {
  it('가입 입력을 검사한다', () => {
    const e = checkSignup({ sido: '', region: '', school: '', name: '', id: '1ab', password: '1234', confirm: '12', terms: {} });
    expect(e).toEqual({ school: '학교를 골라 주세요', name: '이름을 입력해 주세요', id: '아이디는 영문 소문자로 시작하고, 영문·숫자·. _ - 로 4~20자예요', password: '비밀번호를 8자 이상으로 입력해 주세요', confirm: '비밀번호가 서로 달라요. 한 번 더 확인해 주세요', terms: '필수 약관에 동의해 주세요' });
  });
  it('로그인은 서버가 없으면 보내지 않고 이 기기 교사 모드를 안내한다', () => {
    render(<MemoryRouter initialEntries={['/login']}><App /></MemoryRouter>);
    const button = screen.getByRole('button', { name: '로그인' }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('아이디'), { target: { value: 'teacher01' } });
    expect(idToEmail('Teacher01')).toBe('teacher01@example.com'); expect(emailToId('teacher01@example.com')).toBe('teacher01'); expect(validId('ab')).toBe(false);
    fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: 'abcdefgh' } });
    fireEvent.click(button);
    expect(screen.getByRole('status').textContent).toContain('계정 서버를 준비하고 있어요');
    expect(screen.getByRole('link', { name: /이 기기에서 교사 모드 쓰기/ })).toBeTruthy();
  });
});

describe('배포 규칙 → 학생 대학별 환산', () => {
  afterEach(() => { vi.unstubAllGlobals(); resetReleasedRules(); });
  it('검수 완료 규칙만 받아서 학생 성적으로 계산한다', async () => {
    const done = approve(requestReview(spec(), '관리자 A'), '관리자 B');
    const release = releaseRules([done]);
    expect(parseRuleRelease(release)).toHaveLength(1);
    expect(parseRuleRelease({ ...release, rules: [{ ...done.rule, review_status: 'draft' }] })).toEqual([]);
    expect(parseRuleRelease({ ...release, rules: [{ ...done.rule, source: 'http://x' }] })).toEqual([]);
    expect(parseRuleRelease({ format: 'x', rules: [done.rule] })).toEqual([]);
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(release))));
    const t = done.tests[0], { grades, attendance } = testInputs(done.rule, t);
    await studentDb.clearStudentData();
    await studentDb.grades.bulkPut(grades); await studentDb.attendance.bulkPut(attendance);
    await studentDb.setInterest(done.rule.university, done.rule.program, true); // 대학별 환산은 관심 대학만 계산해요(v2 시안)
    const view = render(<MemoryRouter initialEntries={['/univ-score']}><App /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: `가나대학교 ${done.rule.program} 환산 상세` }));
    expect(await screen.findByRole('heading', { name: '가나대학교', level: 3 })).toBeTruthy();
    expect(screen.getAllByText('98.32').length).toBeGreaterThan(0);
    view.unmount();
    render(<MemoryRouter initialEntries={['/doelgak']}><App /></MemoryRouter>);
    expect(await screen.findByText(`98.32 / ${done.rule.max_score}점`)).toBeTruthy();
    expect(screen.queryByText(/컷보다|컷이 내 범위/)).toBeNull();
  });
});

describe('회원가입 폼', () => {
  it('시/도를 고르면 그대로 남는다(학교 선택을 비워도 덮어쓰지 않음)', () => {
    render(<MemoryRouter initialEntries={['/signup']}><App /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('시/도'), { target: { value: '서울특별시' } });
    expect((screen.getByLabelText('시/도') as HTMLSelectElement).value).toBe('서울특별시');
    expect(screen.queryByText('학교급')).toBeNull();
  });
});
