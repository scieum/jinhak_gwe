import 'fake-indexeddb/auto';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, test } from 'vitest';
import { App } from '../src/App';
import { studentDb } from '../src/store/studentDb';
import type { GradeRecord } from '../src/domain/student';

const g = (id: string, rank: number | null): GradeRecord => ({ id, semester: '2-1', name: `과목${id}`, subject_group: '국어', type: '일반선택', credits: 4, rank_grade: rank, is_joint: false, division: 'unknown' });
beforeEach(async () => { await studentDb.clearStudentData(); });
afterEach(cleanup);
const open = () => render(<MemoryRouter initialEntries={['/grade-input']}><App /></MemoryRouter>);

test('v3: 빈 학기에는 주요 버튼이 빈 상태 안에 하나뿐이고, 옮긴 기능은 묶음 메뉴에 있다', async () => {
  open();
  expect(await screen.findByRole('heading', { name: '아직 입력한 성적이 없어요' })).toBeTruthy();
  expect(screen.queryByRole('button', { name: '+ 과목 추가' })).toBeNull();
  expect(document.querySelectorAll('.button-primary')).toHaveLength(1);
  fireEvent.click(screen.getByRole('button', { name: '불러오기' }));
  const dialog = screen.getByRole('dialog', { name: '성적 불러오기' });
  for (const t of ['생기부 PDF 올리기', '엑셀·CSV 올리기', '표 붙여넣기', '엑셀 양식 내려받기']) expect(within(dialog).getByText(t)).toBeTruthy();
  fireEvent.keyDown(document, { key: 'Escape' });
  fireEvent.click(screen.getByRole('button', { name: '백업하기' }));
  expect(within(screen.getByRole('dialog', { name: '내보내기·백업' })).getByText('CSV로 내보내기')).toBeTruthy();
});

test('v3: 학기 세그먼트로 고르고, 확인 필요 칩으로 거른다', async () => {
  await studentDb.grades.bulkPut([g('a', 2), g('b', null)]); // b는 석차등급이 비어 확인 필요
  open();
  fireEvent.click(await screen.findByRole('button', { name: '2학년 1학기' }));
  expect(await screen.findByRole('heading', { name: '2학년 1학기' })).toBeTruthy();
  expect(screen.getByRole('button', { name: '+ 과목 추가' })).toBeTruthy();
  expect(screen.getByText(/학기 요약 · 2과목 · 학점 합/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: /확인 필요 1/ }));
  const table = screen.getByRole('table', { name: '입력한 과목 성적' });
  expect(within(table).queryByRole('rowheader', { name: '과목a' })).toBeNull();
  expect(within(table).getByRole('rowheader', { name: '과목b' })).toBeTruthy();
});

test('v3: 앱바 ⋯ 성적 파일 시트와 보기 시트, 출결은 칸에서 바로 저장', async () => {
  open();
  fireEvent.click(await screen.findByRole('button', { name: '성적 파일' }));
  const files = screen.getByRole('dialog', { name: '성적 파일' });
  for (const t of ['생기부 PDF 올리기', '백업 파일 만들기', 'CSV로 내보내기']) expect(within(files).getByText(t)).toBeTruthy();
  fireEvent.keyDown(document, { key: 'Escape' });
  fireEvent.click(screen.getByRole('button', { name: '성적 파일' })); fireEvent.keyDown(document, { key: 'Escape' }); // 보기 시트는 모바일 폭에서만 버튼이 보여요
  fireEvent.click(screen.getByRole('button', { name: '학년별' }));
  expect(await screen.findByRole('heading', { name: '1학년' })).toBeTruthy();
  const days = screen.getByLabelText('수업일수');
  fireEvent.change(days, { target: { value: '190' } }); fireEvent.blur(days);
  const absence = screen.getByLabelText('결석 질병');
  fireEvent.change(absence, { target: { value: '2' } }); fireEvent.blur(absence);
  await waitFor(async () => expect((await studentDb.attendance.get(1))?.absence.illness).toBe(2));
  fireEvent.change(absence, { target: { value: '500' } }); fireEvent.blur(absence);
  expect(screen.getByRole('alert').textContent).toContain('0~366');
  expect((await studentDb.attendance.get(1))?.absence.illness).toBe(2);
});

test('v3 모바일 폭: 학기 짧은 이름, 보기 시트, 목록 끝 과목 추가', async () => {
  const original = globalThis.matchMedia;
  globalThis.matchMedia = ((q: string) => ({ matches: true, media: q, addEventListener() {}, removeEventListener() {} })) as unknown as typeof matchMedia;
  try {
    await studentDb.grades.bulkPut([g('a', 2)]);
    open();
    fireEvent.click(await screen.findByRole('button', { name: '2-1' }));
    expect(await screen.findByRole('button', { name: '+ 과목 추가' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '학기별 보기' }));
    fireEvent.click(within(screen.getByRole('dialog', { name: '보기' })).getByRole('button', { name: /^전체/ }));
    expect(await screen.findByRole('heading', { name: '전체 학기' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '전체 보기' })).toBeTruthy();
  } finally { globalThis.matchMedia = original; }
});
