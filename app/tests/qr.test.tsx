import 'fake-indexeddb/auto';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, test } from 'vitest';
import { App } from '../src/App';
import { QrCollector, qrSvg, toQrParts } from '../src/io/qrParts';
import { packExchange, readExchange } from '../src/io/exchange';
import { teacherDb } from '../src/store/teacherDb';
import { parseRoster } from '../src/domain/classroom';
import { makeReply, openReply } from '../src/domain/reply';

afterEach(cleanup);

test('긴 카드를 QR 여러 장으로 나누고, 순서가 섞여도 한글 그대로 다시 합친다', async () => {
  const card = { scenario: 'A안', slots: Array.from({ length: 6 }, (_, i) => ({ university: `가온대학교${i}`, memo: '면접 준비 메모'.repeat(10), judgment: null })), exempt: [], warnings: [] };
  const text = await packExchange('counsel_card', { class_code: '7Q4K', number: '7', alias: '하늘' }, card);
  const parts = toQrParts(text, 300);
  expect(parts.length).toBeGreaterThan(1);
  const c = new QrCollector();
  expect(c.add('https://example.com')).toBeNull();
  const order = [...parts].reverse();
  order.slice(0, -1).forEach(p => expect(c.add(p)?.text).toBeUndefined());
  const done = c.add(order.at(-1)!)!;
  expect(done.have).toBe(parts.length);
  expect((await readExchange(done.text!)).alias).toBe('하늘');
  expect(qrSvg(parts[0])).toContain('<svg');
});

test('카메라 QR을 못 쓰는 브라우저는 파일로 받기로 안내한다', async () => {
  await teacherDb.clearClass();
  await teacherDb.createClass({ key: 'class', name: '3학년 2반', code: '7Q4K', created_at: '2026-11-20' }, parseRoster('7 하늘'));
  render(<MemoryRouter initialEntries={['/teacher/card-collect']}><App /></MemoryRouter>);
  fireEvent.click(await screen.findByRole('button', { name: '카드 받기' }));
  fireEvent.click(screen.getByRole('button', { name: 'QR로 받기' }));
  expect(screen.getByRole('alert').textContent).toContain('카메라를 쓸 수 없어요');
  fireEvent.click(within(screen.getByRole('alert')).getByRole('button', { name: '파일로 받기' }));
  expect(screen.getByLabelText('상담카드 파일 고르기')).toBeTruthy();
});

test('선생님 답장: 교사가 만든 파일을 학생이 성적 입력의 불러오기에서 연다', async () => {
  const reply = makeReply(' 3번 칸은 수학을 같이 보자. ', { scenario: 'A안', created_at: '2026-11-12T00:00:00.000Z', slots: [{ university: '가온대' }] });
  const text = await packExchange('teacher_reply', { class_code: '7Q4K', number: '7', alias: '하늘' }, reply);
  expect((await openReply(text)).payload.comment).toBe('3번 칸은 수학을 같이 보자.');
  await expect(openReply(await packExchange('mock_score', { class_code: '7Q4K', number: '7', alias: '하늘' }, {}))).rejects.toThrow('답장 파일이 아니에요');
  expect(() => makeReply('  ', { scenario: 'A안', created_at: '', slots: [] })).toThrow('남길 말');
  render(<MemoryRouter initialEntries={['/grade-input']}><App /></MemoryRouter>);
  fireEvent.change(await screen.findByLabelText('선생님 답장 파일'), { target: { files: [new File([text], '07_하늘_선생님답장.jnavi')] } });
  expect(await screen.findByText('3번 칸은 수학을 같이 보자.')).toBeTruthy();
  expect(screen.getByRole('dialog', { name: '선생님 답장' })).toBeTruthy();
});
