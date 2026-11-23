import 'fake-indexeddb/auto';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { App } from '../src/App';
import { adminDb } from '../src/store/adminDb';
import { resetReleasedResults } from '../src/data/releasedResults';
import { resetUnivWiki } from '../src/data/univWiki';

beforeEach(async () => { await adminDb.wiki.clear(); vi.stubGlobal('fetch', vi.fn(async () => new Response('{}'))); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); resetReleasedResults(); resetUnivWiki(); localStorage.clear(); });

test('위키 요약: 쓰고 저장한 뒤 서로 다른 2명이 승인하면 공개 파일을 내보낼 수 있다', async () => {
  render(<MemoryRouter initialEntries={['/admin/admin-rules/wiki']}><App /></MemoryRouter>);
  expect(await screen.findByRole('heading', { name: '대학 위키 요약 검수' })).toBeTruthy();
  const exportButton = screen.getByRole('button', { name: '공개 파일 내보내기' }) as HTMLButtonElement;
  expect(exportButton.disabled).toBe(true);
  fireEvent.change(screen.getByLabelText('검수자 이름'), { target: { value: '관리자 A' } });
  fireEvent.change(screen.getByLabelText('대학'), { target: { value: '경희대학교' } });
  fireEvent.click(screen.getByRole('button', { name: '요약 쓰기·고치기' }));
  const dialog = await screen.findByRole('dialog');
  fireEvent.change(within(dialog).getByLabelText('요약'), { target: { value: '학생부교과는 교과 100%로 뽑아요' } });
  fireEvent.change(within(dialog).getByLabelText('출처 이름'), { target: { value: '2028 수시 모집요강' } });
  fireEvent.change(within(dialog).getByLabelText('출처 주소'), { target: { value: 'https://example.ac.kr/guide.pdf' } });
  const approve = within(dialog).getByRole('button', { name: '승인' }) as HTMLButtonElement;
  expect(approve.disabled).toBe(true); // 저장 전에는 승인할 수 없다
  fireEvent.click(within(dialog).getByRole('button', { name: '저장' }));
  await waitFor(() => expect(approve.disabled).toBe(false));
  fireEvent.click(approve);
  expect(await within(dialog).findByText(/내가 승인한 요약이에요/)).toBeTruthy();
  fireEvent.change(screen.getByLabelText('검수자 이름'), { target: { value: '관리자 B' } });
  fireEvent.click(within(dialog).getByRole('button', { name: '승인' }));
  await waitFor(() => expect(exportButton.disabled).toBe(false));
});
