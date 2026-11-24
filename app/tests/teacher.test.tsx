import 'fake-indexeddb/auto';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { App } from '../src/App';
import { packExchange, readExchange } from '../src/io/exchange';
import { nextState, parseRoster, receiveCards, submissionRows, type CardRecord, type CounselPayload } from '../src/domain/classroom';
import { teacherDb } from '../src/store/teacherDb';
import { checkCriterion, describe as describeCriterion, judgeMinimum, type Criterion } from '../src/domain/minimum';
import { normalizeResult } from '../src/domain/outcomes';
import { applicable, autoMap, checkRows, decline, schoolAverage } from '../src/domain/scoreImport';

const card = (scenario = 'A안', warnings = 0): CounselPayload => ({ scenario, slots: [{ university: '가온대', program: '교과', judgment: null }, { university: '누리대', judgment: null }], exempt: [],
  warnings: Array.from({ length: warnings }, () => ({ code: 'R-CARD-002', title: '면접 일정 겹침', message: '11월 21일(토)에 가온대·누리대 고사가 함께 있어요' })) });
const sender = { class_code: '7Q4K', number: '7', alias: '하늘' };
const students = parseRoster('7 하늘\n15 바다\n3 솔');
const ctx = { code: '7Q4K', students, latest: () => undefined };

beforeEach(async () => { await teacherDb.clearClass(); });
afterEach(cleanup);

describe('.jnavi 교환 파일', () => {
  it('번호를 두 자리로 맞추고, 내용이 바뀌면 깨진 파일로 본다', async () => {
    const text = await packExchange('counsel_card', sender, card());
    expect((await readExchange(text)).number).toBe('07');
    const tampered = JSON.parse(text); tampered.payload.slots[0].university = '다른대';
    await expect(readExchange(JSON.stringify(tampered))).rejects.toThrow('broken');
    await expect(packExchange('counsel_card', { ...sender, alias: '' }, card())).rejects.toThrow('별칭');
  });
});

describe('카드 받기 (card-collect ST4)', () => {
  it('파일마다 이유와 고치는 법을 붙이고, 같은 학생은 새 카드만 받는다', async () => {
    const files = [
      { name: '07_하늘.jnavi', text: await packExchange('counsel_card', sender, card('A안'), new Date('2026-11-10')) },
      { name: '07_하늘_새.jnavi', text: await packExchange('counsel_card', sender, card('B안', 1), new Date('2026-11-12')) },
      { name: '성적표.pdf', text: '%PDF' },
      { name: '24.jnavi', text: await packExchange('counsel_card', { ...sender, class_code: 'ZZZZ' }, card()) },
      { name: '99.jnavi', text: await packExchange('counsel_card', { ...sender, number: '99' }, card()) },
      { name: '모의.jnavi', text: await packExchange('mock_score', { ...sender, number: '15', alias: '바다' }, { exam: 'x', raw: {} }) },
      { name: '깨짐.jnavi', text: '{"format":"jnavi"' },
    ];
    const r = await receiveCards(files, ctx);
    const by = (name: string) => r.find(x => x.file === name)!;
    expect(by('07_하늘_새.jnavi').status).toBe('ok');
    expect(by('07_하늘.jnavi').status).toBe('skip');
    expect(by('성적표.pdf').reason).toContain('.jnavi)이 아니에요');
    expect(by('24.jnavi').reason).toBe('학급 코드가 우리 반(7Q4K)과 달라요. 학생에게 7Q4K로 다시 보내 달라고 해 주세요.');
    expect(by('99.jnavi').reason).toContain('명단에 99번이 없어요');
    expect(by('모의.jnavi').reason).toContain('모의고사 수합');
    expect(by('깨짐.jnavi').reason).toContain('깨져서');
    expect(r[0].status).toBe('error');
  });
  it('잠긴 학생·예전 버전은 받지 않는다', async () => {
    const old: CardRecord = { number: '07', created_at: '2026-11-12T00:00:00.000Z', received_at: '', seen: true, card: card() };
    const text = await packExchange('counsel_card', sender, card(), new Date('2026-11-11'));
    expect((await receiveCards([{ name: 'a.jnavi', text }], { ...ctx, latest: () => old }))[0].reason).toContain('예전 버전');
    const locked = students.map(s => s.number === '07' ? { ...s, locked: true } : s);
    expect((await receiveCards([{ name: 'a.jnavi', text }], { ...ctx, students: locked }))[0].reason).toContain('확정 잠금');
  });
  it('경고 많은 순, 미제출은 맨 아래', () => {
    const cards: CardRecord[] = [{ number: '15', created_at: 'a', received_at: '', seen: true, card: card('A안', 2) }, { number: '03', created_at: 'a', received_at: '', seen: true, card: card() }];
    expect(submissionRows(students, cards).map(r => `${r.student.number}:${r.status}`)).toEqual(['15:제출', '03:제출', '07:미제출']);
  });
  it('다음에 볼 것 기한이 지나면 기한 지남', () => {
    const memo = { number: '07', date: '2026-11-12', area: '성적' as const, text: 'x', next: '11-15까지 오답 보기', next_done: false, created_at: '' };
    expect(nextState(memo, '2026-11-20')).toBe('기한 지남');
    expect(nextState({ ...memo, next_done: true }, '2026-11-20')).toBe('완료');
  });
});

describe('교사 화면 흐름', () => {
  it('학급을 만들고 카드를 받아 표에 넣은 뒤 상담 메모를 남긴다', async () => {
    const { unmount } = render(<MemoryRouter initialEntries={['/teacher/teacher-dashboard']}><App /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: '학급 만들기' }));
    fireEvent.change(screen.getByLabelText('반 이름'), { target: { value: '3학년 2반' } });
    fireEvent.change(screen.getByLabelText(/명단/), { target: { value: '7 하늘\n15 바다' } });
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: '학급 만들기' }));
    expect(await screen.findByRole('heading', { name: '학생 한눈에' })).toBeTruthy();
    expect(screen.getByRole('region', { name: '우리 반 홈' }).classList.contains('teacher-screen')).toBe(true);
    const code = (await teacherDb.meta.get('class'))!.code;
    unmount();

    render(<MemoryRouter initialEntries={['/teacher/card-collect']}><App /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: '카드 받기' }));
    const text = await packExchange('counsel_card', { ...sender, class_code: code }, card('A안', 1));
    fireEvent.change(screen.getByLabelText('상담카드 파일 고르기'), { target: { files: [new File([text], '07_하늘.jnavi')] } });
    fireEvent.click(await screen.findByRole('button', { name: '1개 표에 반영하기' }));
    expect(await screen.findByText('상담카드 1개를 불러왔어요')).toBeTruthy();
    expect(await screen.findByRole('cell', { name: /가온대/ })).toBeTruthy();
    expect(screen.getByRole('region', { name: '카드 수합' }).classList.contains('student-screen')).toBe(true);
    fireEvent.click(screen.getByRole('link', { name: '07 · 하늘' }));

    expect(await screen.findByRole('heading', { name: '3학년 2반 7번 하늘' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '메모 저장' }));
    expect(screen.getByRole('alert').textContent).toContain('비어 있어요');
    fireEvent.change(screen.getByLabelText('상담 메모'), { target: { value: '면접 날짜를 같이 봤어요.' } });
    fireEvent.click(screen.getByRole('button', { name: '메모 저장' }));
    expect(await screen.findByText('면접 날짜를 같이 봤어요.')).toBeTruthy();
    expect(screen.getByText(/수시로 카드 v1 받음/)).toBeTruthy();
    await waitFor(async () => expect((await teacherDb.cards.toArray())[0].seen).toBe(true));
  });
});

describe('성적 불러오기 (score-import)', () => {
  const rows = [['7', '하늘', '3', '12', '2', '4', '3', '2'], ['15', '바다', '4', '', '3', '5', '4', '3'], ['3', '솔', '1', '2', '1', '2', '1', '2']];
  const map = autoMap(['번호', '별칭', '국어', '수학', '영어', '한국사', '탐구1', '탐구2'], 'mock');
  it('범위 오류 행은 빼고, 빈 칸은 결시, 명단과 다르면 전체를 막는다', () => {
    const r = checkRows(rows, map, 'mock', students);
    expect(r.map(x => x.status)).toEqual(['오류', '확인 필요', '정상']);
    expect(r[0].reason).toBe('수학 12 — 등급은 1~9예요. 이 행은 빼고 반영해요');
    expect(applicable(r).map(x => x.number)).toEqual(['15', '03']);
    const wrong = checkRows([...rows, ['3', '다른이름', '1', '1', '1', '1', '1', '1']], map, 'mock', students);
    expect(applicable(wrong)).toEqual([]);
  });
  it('내신은 학기 평균을 받고 0.3 이상 오르면 성적 하락', () => {
    expect(autoMap(['번호', '1학년 1학기', '1-2'], 'school')).toMatchObject({ '1-1': 1, '1-2': 2 });
    expect(decline({ number: '07', semesters: { '1-1': 2.2, '1-2': 2.6 }, updated_at: '' })).toBe(0.4);
    expect(decline({ number: '07', semesters: { '1-1': 2.2, '1-2': 2.4 }, updated_at: '' })).toBeNull();
    expect(schoolAverage({ number: '07', semesters: { '1-1': 2, '1-2': 3 }, updated_at: '' })).toBe(2.5);
  });
  it('CSV를 올려 검증하고 반영하면 우리 반 홈에 평균과 하락 신호가 보인다', async () => {
    await teacherDb.createClass({ key: 'class', name: '3학년 2반', code: '7Q4K', created_at: '2026-11-20' }, students);
    const { unmount } = render(<MemoryRouter initialEntries={['/teacher/score-import']}><App /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: '내신 학기 평균' }));
    const csv = '번호,별칭,1-1,1-2\n7,하늘,2.2,2.6\n15,바다,1.8,1.9\n3,솔,,';
    fireEvent.change(screen.getByLabelText('성적 파일 고르기'), { target: { files: [new File([csv], '내신.csv')] } });
    fireEvent.click(await screen.findByRole('button', { name: '검증하기' }));
    expect(screen.getByText('모든 학기가 빈 칸이라 반영할 값이 없어요')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '2명 반영하기' }));
    expect(await screen.findByRole('heading', { name: '2명을 반영했어요' })).toBeTruthy();
    unmount();
    render(<MemoryRouter initialEntries={['/teacher/teacher-dashboard']}><App /></MemoryRouter>);
    expect(await screen.findByText('2.40')).toBeTruthy();
    expect(screen.getByText('지난 학기보다 5등급 평균이 0.4 내려갔어요')).toBeTruthy();
    expect(screen.getByText('약 4.1 (추정)')).toBeTruthy();
  });
});

describe('수능 최저 판정 (minimum-board 1절 예시)', () => {
  const g = (grades: Record<string, number | null>) => ({ number: '07', exam: '10월', grades, updated_at: '' });
  const any3of7: Criterion = { areas: ['국어', '수학', '영어', '탐구'], count: 3, sum: 7, required: null, history_max: null, tamgu: 'avg' };
  it('충족·근접·미충족·자료 부족·판정 불가', () => {
    expect(judgeMinimum('10월', g({ 국어: 3, 수학: 3, 영어: 2, 탐구1: 2, 탐구2: 3 }), any3of7)).toMatchObject({ verdict: '근접', reason: '국어 1등급만 오르면 충족' });
    expect(judgeMinimum('10월', g({ 국어: 1, 수학: 2, 영어: 2, 탐구1: 2, 탐구2: 2 }), any3of7).verdict).toBe('충족');
    expect(judgeMinimum('10월', g({ 국어: 2, 수학: 3, 영어: null, 탐구1: 2, 탐구2: 2 }), { ...any3of7, count: 2, sum: 5 }).verdict).toBe('충족');
    expect(judgeMinimum('10월', g({ 국어: 3, 수학: 4, 영어: 3, 탐구1: 3, 탐구2: 3 }), { ...any3of7, required: '수학', sum: 6 })).toMatchObject({ verdict: '미충족', reason: '합 10 (기준 6)' });
    expect(judgeMinimum('10월', g({ 국어: 2, 수학: 2, 영어: 2, 탐구1: 2, 탐구2: 2, 한국사: 5 }), { ...any3of7, count: 2, sum: 4, required: '수학', history_max: 4 }).reason).toBe('한국사 5등급 (기준 4 이내)');
    expect(judgeMinimum('10월', g({ 국어: 2, 수학: null, 영어: 2, 탐구1: 3, 탐구2: 3 }), { ...any3of7, required: '수학', sum: 6 })).toMatchObject({ verdict: '자료 부족', reason: '수학 성적이 없어요' });
    expect(judgeMinimum('10월', undefined, any3of7).reason).toBe('10월 성적이 없어요');
    expect(judgeMinimum('10월', g({}), null).verdict).toBe('판정 불가');
    expect(describeCriterion(any3of7)).toBe('국·수·영·탐 중 3개 합 7');
    expect(() => checkCriterion({ ...any3of7, count: 5 })).toThrow('반영 개수');
  });
});

describe('결과 집계 · 최저 판정 · 학생 기록 화면', () => {
  beforeEach(async () => { await teacherDb.createClass({ key: 'class', name: '3학년 2반', code: '7Q4K', created_at: '2026-11-20' }, students); });
  it('결과 값을 기록 이름으로 정리한다', () => {
    expect(normalizeResult('1단계 불합격')).toBe('1단계 불합격');
    expect(normalizeResult('추가합격')).toBe('충원 합격');
    expect(normalizeResult('')).toBe('미입력');
  });
  it('받은 학생 카드로 지원 목록을 만들고, 학생별 보기에서 결과를 고친 뒤 xlsx로 저장한다', async () => {
    await teacherDb.cards.bulkAdd([
      { number: '07', created_at: '2026-11-10', received_at: '2026-11-10', seen: true, card: card() },
      { number: '15', created_at: '2026-11-10', received_at: '2026-11-10', seen: true, card: card() }]);
    render(<MemoryRouter initialEntries={['/teacher/result-summary']}><App /></MemoryRouter>);
    expect(screen.queryByText(/나이스/)).toBeNull();
    fireEvent.click(await screen.findByRole('button', { name: '받은 상담카드로 목록 만들기' }));
    expect(await screen.findByText('전체 합계')).toBeTruthy();
    expect(screen.getByText(/학생이 보낸 카드와 직접 입력한 결과를 모았어요/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    expect(screen.getByRole('button', { name: /hwpx/ })).toHaveProperty('disabled', true);
    expect(screen.getByRole('button', { name: /pdf/ })).toHaveProperty('disabled', true);
    expect(screen.getByText(/학생은 번호·별칭으로 들어가요/)).toBeTruthy();
    URL.createObjectURL = () => 'blob:x'; URL.revokeObjectURL = () => undefined;
    fireEvent.click(screen.getByRole('button', { name: /xlsx/ }));
    expect(await screen.findByText('결과 집계를 xlsx로 저장했어요', {}, { timeout: 8000 })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '학생별' }));
    fireEvent.change(screen.getByLabelText('15 · 바다 가온대 결과'), { target: { value: '충원 합격' } });
    await waitFor(async () => expect((await teacherDb.outcomes.where('number').equals('15').first())!.result).toBe('충원 합격'));
  }, 20000); // exceljs 동적 import가 전체 실행 중에는 느려요
  it('모의고사 수합: 학생 파일을 받고 다른 반 파일은 이유를 붙인다', async () => {
    render(<MemoryRouter initialEntries={['/teacher/result-summary/mock']}><App /></MemoryRouter>);
    const good = await packExchange('mock_score', sender, { exam: '2027학년도 수능', raw: { 국어: 87 }, cut_table: null });
    const other = await packExchange('mock_score', { ...sender, class_code: 'ZZZZ' }, { exam: '2027학년도 수능', raw: {}, cut_table: null });
    fireEvent.change(await screen.findByLabelText('모의고사 파일 고르기'), { target: { files: [new File([good], 'a.jnavi'), new File([other], 'b.jnavi')] } });
    expect(await screen.findByText(/학급 코드가 우리 반\(7Q4K\)과 달라요/)).toBeTruthy();
    expect(await screen.findByRole('cell', { name: '87' })).toBeTruthy();
  });
  it('최저 기준을 넣으면 교사 입력 · 미검수로 판정하고 학생 기록에도 보인다', async () => {
    await teacherDb.mocks.put({ number: '07', exam: '2026년 10월 학평', grades: { 국어: 3, 수학: 3, 영어: 2, 한국사: 3, 탐구1: 2, 탐구2: 3 }, updated_at: '' });
    const { unmount } = render(<MemoryRouter initialEntries={['/teacher/minimum-board']}><App /></MemoryRouter>);
    const row = (await screen.findAllByRole('row')).find(r => r.textContent?.includes('07 · 하늘'))!;
    fireEvent.click(within(row).getByRole('button', { name: '기준 넣기' }));
    fireEvent.change(screen.getByLabelText('목표 대학·학과'), { target: { value: '강원대 간호' } });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    expect((await screen.findAllByText('국어 1등급만 오르면 충족')).length).toBe(2);
    expect(screen.getAllByText('교사 입력 · 미검수').length).toBeGreaterThan(0);
    unmount();
    render(<MemoryRouter initialEntries={['/teacher/student-record?n=07']}><App /></MemoryRouter>);
    expect(await screen.findByRole('heading', { name: '7번 하늘' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '수능 최저' }));
    expect(screen.getByText('국어 1등급만 오르면 충족')).toBeTruthy();
  });
});
