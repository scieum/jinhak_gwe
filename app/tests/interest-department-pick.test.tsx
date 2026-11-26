import 'fake-indexeddb/auto';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { InterestButton } from '../src/components/InterestButton';
import { studentDb } from '../src/store/studentDb';
import * as cuts from '../src/data/referenceCuts';
import { RESULT_COLUMNS, type ResultRow } from '../src/domain/resultReview';

const row = (recruit_unit: string): ResultRow => ({ ...Object.fromEntries(RESULT_COLUMNS.map(f => [f, ''])), university: '가온대', program: '학생부교과 [지역균형]', recruit_unit, result_year: '2026', round: '수시', metric: '교과등급', cut_70: '2.1' }) as ResultRow;
const heart = () => render(<MemoryRouter><InterestButton university="가온대" program="학생부교과(지역균형)" compact askDepartment /></MemoryRouter>);
const ready = async () => { const b = screen.getByRole('button', { name: /가온대 학생부교과\(지역균형\) 관심/ }) as HTMLButtonElement; await waitFor(() => expect(b.disabled).toBe(false)); return b; };

beforeEach(async () => { await studentDb.interests.clear(); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

test('전형 단위 하트는 수집 학과가 있으면 학과를 먼저 고르고, 그 학과로 담은 뒤에도 하트가 채워져요', async () => {
  vi.spyOn(cuts, 'loadUniversityRows').mockResolvedValue([row('간호학과'), row('경영학과')]);
  heart(); fireEvent.click(await ready());
  const dialog = await screen.findByRole('dialog', { name: '학과 고르기' });
  expect((within(dialog).getByRole('button', { name: '이 학과로 담기' }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.change(within(dialog).getByRole('combobox'), { target: { value: '경영학과' } });
  fireEvent.click(within(dialog).getByRole('button', { name: '이 학과로 담기' }));
  await waitFor(async () => expect((await studentDb.interests.toArray()).map(i => i.department)).toEqual(['경영학과']));
  const b = await ready();
  await waitFor(() => expect(b.getAttribute('aria-pressed')).toBe('true'));
  fireEvent.click(b); // 빼면 그 전형의 관심 항목을 모두 빼요
  await waitFor(async () => expect(await studentDb.interests.count()).toBe(0));
});

test('학과 없이 담기도 되고, 학과 후보를 못 읽으면 바로 학과 없이 담아요', async () => {
  const load = vi.spyOn(cuts, 'loadUniversityRows').mockResolvedValue([row('간호학과')]);
  heart(); fireEvent.click(await ready());
  fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: '학과 없이 담기' }));
  await waitFor(async () => expect((await studentDb.interests.toArray()).map(i => i.department)).toEqual([undefined]));
  cleanup(); await studentDb.interests.clear();
  load.mockRejectedValue(new Error('offline'));
  heart(); fireEvent.click(await ready());
  await waitFor(async () => expect(await studentDb.interests.count()).toBe(1));
  expect(screen.queryByRole('dialog')).toBeNull();
});
