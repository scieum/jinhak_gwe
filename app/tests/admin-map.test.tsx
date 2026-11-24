import 'fake-indexeddb/auto';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { App } from '../src/App';
import { adminDb } from '../src/store/adminDb';

beforeEach(async () => { await adminDb.map.clear(); vi.stubGlobal('fetch', vi.fn(async () => new Response('{}'))); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); localStorage.clear(); });

const draft = JSON.stringify({ format: 'jinhak-navi-univ-map', version: 1, campuses: [
  { univ_id: 'u-1', name: '강원대학교', campus: '본교', campus_type: '본교', school_kind: '', founding: '', sido: '강원특별자치도', sigungu: '', address: '', lat: null, lng: null }] });

test('대학 위치: 초안을 불러와 칸을 채우고 서로 다른 2명이 승인하면 공개 파일을 내보낼 수 있다', async () => {
  render(<MemoryRouter initialEntries={['/admin/admin-rules/map']}><App /></MemoryRouter>);
  expect(await screen.findByRole('heading', { name: '대학 위치 검수' })).toBeTruthy();
  const exportButton = screen.getByRole('button', { name: '공개 파일 내보내기' }) as HTMLButtonElement;
  expect(exportButton.disabled).toBe(true);
  fireEvent.change(screen.getByLabelText('위치 초안 불러오기'), { target: { files: [new File([draft], 'univ-map-draft.json', { type: 'application/json' })] } });
  fireEvent.click(await screen.findByRole('button', { name: '강원대학교' }));
  const dialog = await screen.findByRole('dialog');
  const approve = within(dialog).getByRole('button', { name: '승인' }) as HTMLButtonElement;
  expect(approve.disabled).toBe(true); // 빈 칸이 있으면 승인할 수 없다
  fireEvent.change(within(dialog).getByLabelText('학교 종류'), { target: { value: '일반대학' } });
  fireEvent.change(within(dialog).getByLabelText('설립 구분'), { target: { value: '국립' } });
  fireEvent.change(within(dialog).getByLabelText('시·군·구'), { target: { value: '춘천시' } });
  fireEvent.change(within(dialog).getByLabelText('위도'), { target: { value: '37.87' } });
  fireEvent.change(within(dialog).getByLabelText('경도'), { target: { value: '127.74' } });
  expect(approve.disabled).toBe(true); // 저장 전에는 승인할 수 없다
  fireEvent.click(within(dialog).getByRole('button', { name: '저장' }));
  await waitFor(() => expect(approve.disabled).toBe(false));
  fireEvent.change(screen.getByLabelText('검수자 이름'), { target: { value: '관리자 A' } });
  fireEvent.click(approve);
  expect(await within(dialog).findByText(/내가 승인한 캠퍼스예요/)).toBeTruthy();
  expect(exportButton.disabled).toBe(true);
  fireEvent.change(screen.getByLabelText('검수자 이름'), { target: { value: '관리자 B' } });
  fireEvent.click(within(dialog).getByRole('button', { name: '승인' }));
  await waitFor(() => expect(exportButton.disabled).toBe(false));
  expect((await adminDb.map.toArray())[0].approvals.map(a => a.reviewer)).toEqual(['관리자 A', '관리자 B']);
});

test('관리자 내비에 대학 위치가 있다', async () => {
  render(<MemoryRouter initialEntries={['/admin/admin-rules/map']}><App /></MemoryRouter>);
  expect((await screen.findAllByRole('link', { name: /대학 위치/ })).length).toBeGreaterThan(0);
});
