import 'fake-indexeddb/auto';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { App } from '../src/App';
import { adminDb } from '../src/store/adminDb';
import { resetReleasedResults } from '../src/data/releasedResults';
import { resetUnivWiki } from '../src/data/univWiki';

beforeEach(async () => { await adminDb.fields.clear(); vi.stubGlobal('fetch', vi.fn(async () => new Response('{}'))); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); resetReleasedResults(); resetUnivWiki(); localStorage.clear(); });

test('계열표: CSV를 불러와 서로 다른 2명이 승인하면 공개 파일을 내보낼 수 있다', async () => {
  render(<MemoryRouter initialEntries={['/admin/admin-rules/fields']}><App /></MemoryRouter>);
  expect(await screen.findByRole('heading', { name: '학과 계열표 검수' })).toBeTruthy();
  const exportButton = screen.getByRole('button', { name: '공개 파일 내보내기' }) as HTMLButtonElement;
  expect(exportButton.disabled).toBe(true);
  const csv = new File(['대학,모집단위,소계열,중계열\n경희대학교,행정학과,행정·정책,사회과학\n'], 'fields.csv', { type: 'text/csv' });
  fireEvent.change(screen.getByLabelText('계열표 CSV 불러오기'), { target: { files: [csv] } });
  expect(await screen.findByLabelText('경희대학교 행정학과 소계열')).toBeTruthy();
  const name = screen.getByLabelText('검수자 이름');
  fireEvent.change(name, { target: { value: '관리자 A' } });
  fireEvent.click(screen.getByRole('button', { name: '표 전체 승인' }));
  expect(await screen.findByText(/내가 승인한 표예요/)).toBeTruthy();
  fireEvent.change(name, { target: { value: '관리자 B' } });
  fireEvent.click(screen.getByRole('button', { name: '표 전체 승인' }));
  await waitFor(() => expect(exportButton.disabled).toBe(false));
  expect(screen.getByText('승인 관리자 A · 승인 관리자 B')).toBeTruthy();
});
