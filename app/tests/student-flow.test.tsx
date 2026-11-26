import 'fake-indexeddb/auto';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { App } from '../src/App';
import { studentDb } from '../src/store/studentDb';

beforeEach(async () => { await studentDb.restore({ grades: [], attendance: [] }); });
afterEach(cleanup);
const renderAt = (path: string) => render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>);

test('과목 추가 → 저장 → 재진입 → 5 to 9 범위 표시, 네트워크로 성적을 전송하지 않음', async () => {
  const fetchSpy = vi.spyOn(globalThis, 'fetch');
  const first = renderAt('/grade-input');
  fireEvent.click(await screen.findByRole('button', { name: '과목 추가하기' }));
  const dialog = screen.getByRole('dialog', { name: '과목 편집' });
  fireEvent.change(within(dialog).getByLabelText('과목명'), { target: { value: '대수' } });
  fireEvent.change(within(dialog).getByLabelText('학점'), { target: { value: '4' } });
  fireEvent.change(within(dialog).getByLabelText('석차등급'), { target: { value: '2' } });
  fireEvent.click(within(dialog).getByRole('button', { name: '저장' }));
  await waitFor(async () => expect(await studentDb.grades.count()).toBe(1));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  first.unmount(); renderAt('/grade-input');
  await screen.findByRole('table', { name: '입력한 과목 성적' });
  expect(screen.getByRole('spinbutton', { name: '대수 석차등급' }).getAttribute('value')).toBe('2');
  fireEvent.click(screen.getAllByRole('link', { name: '5 to 9' })[0]); // v2 시안: 계산 근거 줄의 '5 to 9 보기' 링크가 없어져 메뉴로 가요
  fireEvent.click(screen.getByRole('button', { name: '내 성적 분석' }));
  await screen.findByText('약 2.81~3.40'); // 2026-11-26 참고 추정 모델(calibrated v0.4)로 바뀐 범위
  expect(screen.getAllByText(/5등급 평균 2\.00/).length).toBeGreaterThan(0);
  expect(fetchSpy).not.toHaveBeenCalled(); fetchSpy.mockRestore();
});

test('오류 과목은 작성 중으로 보관되며 평균에서 제외, Escape로 대화상자 닫기', async () => {
  renderAt('/grade-input');
  fireEvent.click(await screen.findByRole('button', { name: '과목 추가하기' }));
  const dialog = screen.getByRole('dialog');
  expect((within(dialog).getByRole('button', { name: '저장' }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.change(within(dialog).getByLabelText('과목명'), { target: { value: '대수' } });
  fireEvent.click(within(dialog).getByRole('button', { name: '작성 중으로 보관' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect((await studentDb.grades.toArray())[0].rank_grade).toBeNull();
  fireEvent.click(await screen.findByRole('button', { name: '대수 편집' }));
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(screen.queryByRole('dialog')).toBeNull();
});

test('붙여넣은 성적은 확인 전 저장하지 않음', async () => {
  renderAt('/grade-input');
  fireEvent.click(await screen.findByRole('button', { name: '불러오기' }));
  fireEvent.click(screen.getByRole('button', { name: /^표 붙여넣기/ }));
  fireEvent.change(screen.getByLabelText('성적 표'), { target: { value: '학기\t교과\t과목\t유형\t학점\t석차등급\n1-1\t수학\t대수\t일반선택\t4\t2' } });
  fireEvent.click(screen.getByRole('button', { name: '가져올 값 확인' }));
  await screen.findByRole('dialog', { name: '가져올 성적 확인' });
  expect(await studentDb.grades.count()).toBe(0);
  fireEvent.click(screen.getByRole('button', { name: '확인한 성적 추가' }));
  await waitFor(async () => expect(await studentDb.grades.count()).toBe(1));
});

test('기기 데이터 삭제는 확인 전까지 실행되지 않음', async () => {
  await studentDb.attendance.put({ year: 1, school_days: 190, absence: { illness: 0, unexcused: 0, other: 0 }, tardy: { illness: 0, unexcused: 0, other: 0 }, early_leave: { illness: 0, unexcused: 0, other: 0 }, class_absence: { illness: 0, unexcused: 0, other: 0 } });
  renderAt('/more'); fireEvent.click(screen.getByRole('button', { name: '이 기기의 학생 데이터 지우기' }));
  expect(await studentDb.attendance.count()).toBe(1);
  fireEvent.click(screen.getByRole('button', { name: '취소' })); expect(await studentDb.attendance.count()).toBe(1);
  fireEvent.click(screen.getByRole('button', { name: '이 기기의 학생 데이터 지우기' })); fireEvent.click(screen.getByRole('button', { name: '학생 기록 모두 지우기' }));
  await waitFor(async () => expect(await studentDb.attendance.count()).toBe(0));
});
