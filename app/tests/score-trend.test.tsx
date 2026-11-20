import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, test } from 'vitest';
import { ScoreTrendContent } from '../src/components/ScoreTrendContent';
import { subject } from './fixtures';
import { newApplication } from '../src/domain/planner';

afterEach(cleanup);
test('grades occupy the default view; minimum details appear only after opening and focus returns on Escape', () => {
  render(<MemoryRouter><ScoreTrendContent data={{ grades: [subject()], attendance: [] }} /></MemoryRouter>);
  expect(screen.getByRole('heading', { name: '내신 학기별 평균 등급' })).toBeTruthy();
  expect(screen.getByRole('heading', { name: '모의고사 영역별 등급' })).toBeTruthy();
  expect(screen.getByText('2.00등급')).toBeTruthy();
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(screen.queryByText('등록한 목표 대학이 없어요')).toBeNull();
  const button = screen.getByRole('button', { name: '목표 대학 최저 현황' }); button.focus(); fireEvent.click(button);
  expect(button.getAttribute('aria-expanded')).toBe('true');
  expect(within(screen.getByRole('dialog')).getByText('등록한 목표 대학이 없어요')).toBeTruthy();
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(screen.queryByRole('dialog')).toBeNull(); expect(document.activeElement).toBe(button);
});
test('registered universities remain inside the panel, with no invented minimum result', () => {
  const plan = { ...newApplication(), university: '검증 대학', program: '검증 전형', source_url: 'https://example.invalid/admissions' };
  render(<MemoryRouter><ScoreTrendContent data={{ grades: [], attendance: [], planning: { applications: [plan], tasks: [] } }} /></MemoryRouter>);
  expect(screen.queryByText('검증 대학')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: '목표 대학 최저 현황' }));
  expect(within(screen.getByRole('dialog')).getByText('검증 대학')).toBeTruthy();
  expect(screen.getByText('최저 기준 확인 필요')).toBeTruthy();
  expect(screen.getByRole('link', { name: '등록한 모집요강 열기 ↗' }).getAttribute('href')).toBe(plan.source_url);
  fireEvent.click(screen.getByRole('button', { name: '최저 현황 닫기' }));
  expect(screen.queryByRole('dialog')).toBeNull();
});
