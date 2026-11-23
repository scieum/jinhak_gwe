import 'fake-indexeddb/auto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { App } from '../src/App';
import { parseRoster, type CardRecord, type CardSlot } from '../src/domain/classroom';
import {
  activePeriods, applications, checkSchedule, dayCounts, groupRows, longDate, missingResults, rowStatus, scheduleRows, withResult, type ClassSchedule,
} from '../src/domain/classCalendar';
import { totals, type Outcome } from '../src/domain/outcomes';
import { seoulDate } from '../src/domain/planner';
import { teacherDb } from '../src/store/teacherDb';

const YONSEI = { university: '연세대학교 미래캠퍼스', program: '학교생활우수자' };
const SKKU = { university: '성균관대학교', program: '학과모집' };
const KANGWON = { university: '강원대학교', program: '미래인재' };
const card = (number: string, slots: CardSlot[], created_at = '2026-11-10T00:00:00.000Z'): CardRecord =>
  ({ number, created_at, received_at: created_at, seen: true, card: { scenario: 'A안', slots, exempt: [], warnings: [] } });
const cards = [
  card('03', [{ ...SKKU, department: '행정학과' }]),
  card('07', [{ ...YONSEI, department: '간호학과' }, { ...KANGWON, department: '경영학과', exam_kind: '면접', exam_date: '2026-11-21' }]),
  card('25', [{ ...YONSEI, department: '경영학과' }, { ...KANGWON, department: '행정학과', exam_kind: '면접', exam_date: null }]),
];

describe('일정 도메인', () => {
  const schedules: ClassSchedule[] = [
    { id: 1, ...YONSEI, kind: '1단계 발표', date: '2026-11-20' },
    { id: 2, ...SKKU, kind: '서류 제출', date: '2026-11-20', time: '18:00' },
    { id: 3, ...YONSEI, kind: '최종 발표', date: '2026-12-11' },
    { id: 4, ...KANGWON, kind: '충원 기간', date: '2026-12-17', end: '2026-12-24' },
  ];
  it('카드 지원 칸 × 대학 일정으로 행을 만들고, 카드 고사 날짜는 읽기만 한다', () => {
    const { rows, undated } = scheduleRows(cards, schedules, [], []);
    expect(dayCounts(rows, '2026-11-20')).toEqual({ total: 3, byKind: [{ kind: '서류 제출', count: 1 }, { kind: '1단계 발표', count: 2 }] });
    expect(rows.filter(r => r.date === '2026-11-21').map(r => [r.number, r.label, r.source])).toEqual([['07', '면접', 'card']]);
    expect(undated).toEqual([{ ...KANGWON, label: '면접', numbers: ['25'] }]);
    expect(applications(cards).find(a => a.university === '강원대학교')).toMatchObject({ applied: 2, withExamDate: 1 });
  });
  it('교사가 넣은 면접 날짜는 카드 날짜가 없는 학생에게만 들어간다', () => {
    const { rows, undated } = scheduleRows(cards, [{ id: 9, ...KANGWON, kind: '면접·실기', date: '2026-11-22' }], [], []);
    expect(rows.filter(r => r.kind === '면접·실기').map(r => [r.number, r.date])).toEqual([['07', '2026-11-21'], ['25', '2026-11-22']]);
    expect(undated).toEqual([]);
  });
  it('충원 기간은 시작 · 마감 칸에만 세고, 사이 날은 진행 중 줄로 보여 준다', () => {
    const { rows } = scheduleRows(cards, schedules, [], []);
    expect(dayCounts(rows, '2026-12-17').total).toBe(2);
    expect(dayCounts(rows, '2026-12-20').total).toBe(0);
    expect(rows.filter(r => r.date === '2026-12-24').every(r => r.label === '충원 기간 마감' && r.result === 'final')).toBe(true);
    expect(activePeriods(schedules, '2026-12-20').map(s => s.university)).toEqual(['강원대학교']);
    expect(activePeriods(schedules, '2026-12-24')).toEqual([]);
  });
  it('1단계 불합격 학생은 뒤 일정에서 빠지고, 묶음은 종류 순서 · 끝난 행 아래로', () => {
    const outcomes: Outcome[] = [{ number: '25', ...YONSEI, type: '종합', stage1: false, result: '1단계 불합격' }];
    const { rows } = scheduleRows(cards, schedules, [], outcomes);
    expect(rows.filter(r => r.kind === '최종 발표').map(r => r.number)).toEqual(['07']);
    const groups = groupRows(rows.filter(r => r.date === '2026-11-20'));
    expect(groups.map(g => g.kind)).toEqual(['서류 제출', '1단계 발표']);
    expect(groups[1].rows.map(r => [r.number, r.value])).toEqual([['07', '미입력'], ['25', '1단계 불합격']]);
    expect(missingResults(rows, '2026-11-20')).toBe(1);
  });
  it('완료 · 상태 글자', () => {
    const { rows } = scheduleRows(cards, schedules, [{ key: JSON.stringify(['03', SKKU.university, SKKU.program, '서류 제출']), number: '03', ...SKKU, kind: '서류 제출' }], []);
    const doc = rows.find(r => r.kind === '서류 제출')!;
    expect(doc.done).toBe(true);
    expect(rowStatus(doc, '2026-11-25')).toBe('완료');
    const exam = rows.find(r => r.kind === '면접·실기')!;
    expect([rowStatus(exam, '2026-11-20'), rowStatus(exam, '2026-11-21'), rowStatus(exam, '2026-11-22')]).toEqual(['D-1', '오늘', '기한 지남']);
  });
  it('결과를 고르면 결과 집계와 같은 outcomes 값으로 바뀐다', () => {
    const row = { number: '07', ...YONSEI };
    const passed = withResult(undefined, { ...row, result: 'stage1' }, '1단계 통과');
    expect(passed).toMatchObject({ stage1: true, result: '미입력', type: '기타' });
    const failed = withResult(passed, { ...row, result: 'stage1' }, '1단계 불합격');
    expect(failed).toMatchObject({ stage1: false, result: '1단계 불합격' });
    expect(withResult(failed, { ...row, result: 'stage1' }, '미입력')).toMatchObject({ stage1: null, result: '미입력' });
    expect(withResult(passed, { ...row, result: 'final' }, '충원 합격')).toMatchObject({ stage1: true, result: '충원 합격' });
  });
  it('대학 일정 입력 검사', () => {
    expect(checkSchedule({ ...KANGWON, kind: '최종 발표' })).toBe('대학 · 전형, 일정 종류, 날짜를 넣어 주세요');
    expect(checkSchedule({ ...KANGWON, kind: '충원 기간', date: '2026-12-17', end: '2026-12-10' })).toBe('마감일이 시작일보다 빨라요. 12월 17일 이후로 골라 주세요.');
    expect(checkSchedule({ ...KANGWON, kind: '최종 발표', date: '2026-12-11', time: '25:00' })).toContain('HH:MM');
    expect(checkSchedule({ ...KANGWON, kind: '최종 발표', date: '2026-12-11' })).toBe('');
  });
});

describe('우리 반 입시 일정 화면', () => {
  const today = seoulDate();
  beforeEach(async () => {
    await teacherDb.clearClass();
    await teacherDb.createClass({ key: 'class', name: '3학년 2반', code: '7Q4K', created_at: '2026-11-20' }, parseRoster('3 솔\n7 하늘\n25 숲'));
  });
  afterEach(cleanup);
  const open = () => render(<MemoryRouter initialEntries={['/teacher/class-calendar']}><App /></MemoryRouter>);
  const seed = async () => {
    await teacherDb.cards.bulkAdd(cards);
    await teacherDb.schedules.bulkAdd([{ ...YONSEI, kind: '1단계 발표', date: today }, { ...SKKU, kind: '서류 제출', date: today, time: '18:00' }]);
  };

  it('수합·집계 메뉴에 있고, 카드가 없으면 빈 상태를 보여 준다', async () => {
    open();
    expect(await screen.findByText('아직 받은 상담카드가 없어요')).toBeTruthy();
    expect(screen.getByRole('link', { name: '카드 수합으로 가기' }).getAttribute('href')).toBe('/teacher/card-collect');
    expect(screen.getAllByRole('link', { name: /우리 반 입시 일정/ }).length).toBeGreaterThan(0);
  });

  it('대학 일정이 없으면 입력 안내와 주요 버튼 하나', async () => {
    await teacherDb.cards.bulkAdd(cards);
    open();
    expect(await screen.findByText(/대학 일정을 한 번 넣으면 지원한 학생 모두에게 들어가요/)).toBeTruthy();
    expect(screen.getAllByRole('button', { name: '대학 일정 입력' })).toHaveLength(1);
  });

  it('처음엔 오늘이 선택되고 그날 목록이 종류 · 대학별 묶음으로 보인다', async () => {
    await seed();
    open();
    expect(await screen.findByRole('heading', { name: `${longDate(today)} 일정 · 3건` })).toBeTruthy();
    const cell = screen.getByRole('button', { name: new RegExp(`일정 3건, 서류 제출 1건, 1단계 발표 2건$`) });
    expect(cell.getAttribute('aria-pressed')).toBe('true');
    expect(cell.getAttribute('aria-current')).toBe('date');
    const groups = within(screen.getByRole('region', { name: '그날 목록' })).getAllByRole('article');
    expect(groups.map(g => g.getAttribute('aria-label'))).toEqual(['성균관대학교 학과모집 서류 제출', '연세대학교 미래캠퍼스 학교생활우수자 1단계 발표']);
    expect(within(groups[1]).getByRole('link', { name: '결과 집계에서 보기 ›' })).toBeTruthy();
    expect(screen.getByRole('list', { name: '일정 종류' }).textContent).toContain('충원 기간');
  });

  it('서류 제출은 체크하면 완료로 저장된다', async () => {
    await seed();
    open();
    const box = await screen.findByRole('checkbox', { name: '03 · 솔 성균관대학교 학과모집 서류 제출 완료' });
    fireEvent.click(box);
    await waitFor(() => expect(screen.getByText('03 · 솔 성균관대학교 서류 제출 완료로 표시했어요')).toBeTruthy());
    expect(await teacherDb.scheduleDone.count()).toBe(1);
    await waitFor(() => expect(within(screen.getByRole('article', { name: '성균관대학교 학과모집 서류 제출' })).getByText('완료')).toBeTruthy());
  });

  it('결과를 고르면 outcomes에 바로 저장되고 결과 집계에도 보인다', async () => {
    await seed();
    const { unmount } = open();
    const select = await screen.findByRole('combobox', { name: '25 · 숲 연세대학교 미래캠퍼스 학교생활우수자 1단계 발표 결과, 미입력' });
    fireEvent.change(select, { target: { value: '1단계 불합격' } });
    expect(await screen.findByText(/25 · 숲 · 1단계 불합격로 저장했어요/)).toBeTruthy();
    const saved = await teacherDb.outcomes.toArray();
    expect(saved).toMatchObject([{ number: '25', ...YONSEI, stage1: false, result: '1단계 불합격' }]);
    expect(totals(saved).counts['1단계 불합격']).toBe(1);
    unmount();
    render(<MemoryRouter initialEntries={['/teacher/result-summary']}><App /></MemoryRouter>);
    const row = (await screen.findByText(`${YONSEI.university} · ${YONSEI.program}`)).closest('tr')!;
    expect([...row.querySelectorAll('td')].map(td => td.textContent)).toEqual(['기타', `${YONSEI.university} · ${YONSEI.program}`, '1', '0', '0', '0', '0', '1', '0', '0']);
  });

  it('대학 일정을 한 번 넣으면 지원한 학생 모두에게 들어가고, 연필로 고치기 · 지우기', async () => {
    await seed();
    open();
    fireEvent.click(await screen.findByRole('button', { name: /대학 일정 입력/ }));
    const dialog = screen.getByRole('dialog', { name: '대학 일정 입력' });
    const [univ, kind] = within(dialog).getAllByRole('combobox');
    fireEvent.change(univ, { target: { value: JSON.stringify([YONSEI.university, YONSEI.program]) } });
    fireEvent.change(kind, { target: { value: '최종 발표' } });
    fireEvent.change(within(dialog).getByLabelText('날짜'), { target: { value: today } });
    expect(within(dialog).getByText(/지원한 2명 모두에게 들어가요/)).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button', { name: '저장' }));
    expect(await screen.findByText('최종 발표 일정을 2명에게 넣었어요')).toBeTruthy();
    const group = await screen.findByRole('article', { name: '연세대학교 미래캠퍼스 학교생활우수자 최종 발표' });
    expect(within(group).getAllByRole('combobox').map(c => c.getAttribute('aria-label')?.split(' 연세')[0])).toEqual(['07 · 하늘', '25 · 숲']);

    fireEvent.click(within(screen.getByRole('article', { name: '연세대학교 미래캠퍼스 학교생활우수자 1단계 발표' })).getByRole('button', { name: '연세대학교 미래캠퍼스 학교생활우수자 1단계 발표 일정 고치기' }));
    const edit = screen.getByRole('dialog', { name: '대학 일정 고치기' });
    fireEvent.click(within(edit).getByRole('button', { name: '이 일정 지우기' }));
    const confirm = screen.getByRole('dialog', { name: '이 일정을 지울까요?' });
    expect(confirm.textContent).toContain('2명 모두에게서 지워져요');
    fireEvent.click(within(confirm).getByRole('button', { name: '지우기' }));
    expect(await screen.findByText('1단계 발표 일정을 지웠어요')).toBeTruthy();
    expect((await teacherDb.schedules.toArray()).map(s => s.kind).sort()).toEqual(['서류 제출', '최종 발표']);
  });

  it('입력 중 닫으면 나가기 확인을 묻는다', async () => {
    await seed();
    open();
    fireEvent.click(await screen.findByRole('button', { name: /대학 일정 입력/ }));
    const dialog = screen.getByRole('dialog', { name: '대학 일정 입력' });
    fireEvent.change(within(dialog).getAllByRole('combobox')[1], { target: { value: '최종 발표' } });
    fireEvent.click(within(dialog).getByRole('button', { name: '닫기' }));
    fireEvent.click(within(screen.getByRole('dialog', { name: '저장하지 않고 나갈까요?' })).getByRole('button', { name: '나가기' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(await teacherDb.schedules.count()).toBe(2);
  });

  it('필터가 맞지 않으면 끄는 링크, 저장은 xlsx만 되고 나머지는 준비 중', async () => {
    await seed();
    open();
    fireEvent.change(await screen.findByRole('combobox', { name: '학생' }), { target: { value: '07' } });
    fireEvent.click(screen.getByRole('button', { name: '서류 제출' }));
    expect(await screen.findByText('조건에 맞는 일정이 없어요')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '필터 모두 끄기' }));
    expect(await screen.findByRole('heading', { name: `${longDate(today)} 일정 · 3건` })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    const sheet = screen.getByRole('dialog', { name: '저장할 형식을 골라요' });
    expect(within(sheet).getByRole('button', { name: /한글 \(hwpx\)/ }).hasAttribute('disabled')).toBe(true);
    expect(within(sheet).getByRole('button', { name: /PDF \(pdf\)/ }).hasAttribute('disabled')).toBe(true);
    expect(within(sheet).getByRole('button', { name: /엑셀 \(xlsx\)/ }).hasAttribute('disabled')).toBe(false);
  });

  it('금지 표현 · 판정 색 · 퍼센트가 없다', async () => {
    await seed();
    const { container } = open();
    await screen.findByRole('heading', { name: `${longDate(today)} 일정 · 3건` });
    const rules = JSON.parse(readFileSync(resolve(process.cwd(), '../rules/design-rules.json'), 'utf8')) as { forbidden_words: string[] };
    const text = container.textContent ?? '';
    for (const word of rules.forbidden_words) expect(text).not.toContain(word);
    expect(text).not.toMatch(/\d+\s*%|안정|적정|소신|위험/);
    expect(container.querySelector('.judge-badge, [class*="judge-"]')).toBeNull();
  });
});
