import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, test, vi } from 'vitest';
import { TargetMinimumReference } from '../src/components/TargetMinimumReference';
import { loadTargetMinimumReference } from '../src/data/minimumReferences';
import { applicationFromMinimumScope, matchMinimumReference, minimumReferenceEntries, parseMinimumReferenceIndex, parseMinimumReferencePackage, type MinimumReferenceEntry } from '../src/domain/minimumReferences';

vi.mock('../src/data/minimumReferences', () => ({ loadTargetMinimumReference: vi.fn() }));
afterEach(() => { cleanup(); vi.resetAllMocks(); });
const base = 'public/data/minimum-references/';
const index = parseMinimumReferenceIndex(JSON.parse(readFileSync(`${base}index.json`, 'utf8')));
const loadPackage = (entry: MinimumReferenceEntry) => parseMinimumReferencePackage(JSON.parse(readFileSync(`${base}${entry.file}`, 'utf8')), entry);
const hallym = index.entries.find(e => e.package_id === 'plan-0000198')!;
const data = loadPackage(hallym);
const scope = data.rows.find(r => r.scope_status === 'classified' && data.rules.find(rule => r.rule_ids.includes(rule.id))?.applicability === 'not_required')!;
const target = { year: hallym.admission_year, university: hallym.university, program: scope.program, department: scope.unit };
const matched = matchMinimumReference(hallym, data, target);

test('all published packages preserve counts, hashes, references and draft-only state', () => {
  let rules = 0, rows = 0;
  expect(index.entries).toHaveLength(218);
  for (const entry of index.entries) {
    const bytes = readFileSync(`${base}${entry.file}`);
    expect(bytes.length).toBe(entry.bytes);
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(entry.sha256);
    const pkg = parseMinimumReferencePackage(JSON.parse(bytes.toString('utf8')), entry);
    rules += pkg.rules.length; rows += pkg.rows.length;
    expect(pkg.executable).toBe(false);
    expect(pkg.review_status).toBe('draft');
    for (const rule of pkg.rules) expect(rule).not.toHaveProperty('criterion');
  }
  expect({ rules, rows }).toEqual({ rules: 4801, rows: 40823 });
});

test('year, campus, program and department cannot be replaced by a similar name', () => {
  expect(minimumReferenceEntries(index, target)).toEqual([hallym]);
  expect(minimumReferenceEntries(index, { ...target, year: 2029 })).toEqual([]);
  const campus = index.entries.find(e => e.package_id === 'plan-0000003')!;
  expect(minimumReferenceEntries(index, { ...target, university: campus.university }).length).toBeGreaterThan(1);
  expect(minimumReferenceEntries(index, { ...target, university: `${campus.university}(${campus.campus})` })).toEqual([campus]);
  expect(matched.status).toBe('matched');
  expect(matchMinimumReference(hallym, data, { ...target, year: 2029 }).status).toBe('missing');
  expect(matchMinimumReference(hallym, data, { ...target, program: `${target.program} 기타` }).status).toBe('missing');
  expect(matchMinimumReference(hallym, data, { ...target, department: '' }).status).toBe('incomplete');
  expect(matchMinimumReference(hallym, { ...data, rows: [...data.rows, { ...scope, round: '정시', program_id: 'another' }] }, target).status).toBe('ambiguous');
});

test('mislabelled reviewed packages, unsafe URLs and missing rule references are rejected', () => {
  expect(() => parseMinimumReferencePackage({ ...data, executable: true }, hallym)).toThrow();
  expect(() => parseMinimumReferencePackage({ ...data, review_status: 'verified' }, hallym)).toThrow();
  const bad = structuredClone(data); bad.rules[0].evidence.url = 'javascript:alert(1)';
  expect(() => parseMinimumReferencePackage(bad, hallym)).toThrow();
  const missing = structuredClone(data); missing.rows[0].rule_ids = ['missing'];
  expect(() => parseMinimumReferencePackage(missing, hallym)).toThrow();
});

test('saved source identifiers resolve duplicate labels but never reuse changed source data', () => {
  const chosen = applicationFromMinimumScope(hallym, data, scope);
  const withDuplicate = { ...data, rows: [...data.rows, { ...scope, program_id: 'other-round', round: '정시' }] };
  expect(matchMinimumReference(hallym, withDuplicate, target).status).toBe('ambiguous');
  const result = matchMinimumReference(hallym, withDuplicate, chosen);
  expect(result.status).toBe('matched');
  if (result.status === 'matched') expect(result.scope.program_id).toBe(scope.program_id);
  expect(matchMinimumReference(hallym, data, { ...chosen, source_selection: { ...chosen.source_selection, source_sha256: '0'.repeat(64) } }).status).toBe('stale');
  expect(matchMinimumReference(hallym, data, { ...chosen, program: '다른 전형' }).status).toBe('missing');
  expect(minimumReferenceEntries(index, { ...chosen, university: '다른 대학' })).toEqual([]);
});

test('real source evidence is shown as an unreviewed reference without a grade verdict', async () => {
  vi.mocked(loadTargetMinimumReference).mockResolvedValue(matched);
  render(<MemoryRouter><TargetMinimumReference target={target} /></MemoryRouter>);
  fireEvent.click(screen.getByText('수능 최저 원문·근거'));
  expect(await screen.findByText('검수 전 참고자료')).toBeTruthy();
  const detail = screen.getByText('수능 최저 원문·근거').closest('details')!;
  expect(detail.textContent).toContain(scope.unit);
  expect(detail.textContent).toContain('최저 미적용으로 정리된 원문');
  const link = within(detail).getAllByRole('link', { name: /근거 PDF/ })[0];
  expect(link.getAttribute('href')).toMatch(/^https:\/\/.*#page=\d+$/);
  expect(detail.querySelector('.judge-badge')).toBeNull();
});

test('reference loading can be retried and a missing match is not reported as no minimum', async () => {
  vi.mocked(loadTargetMinimumReference).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ status: 'missing' });
  render(<MemoryRouter><TargetMinimumReference target={target} /></MemoryRouter>);
  fireEvent.click(screen.getByText('수능 최저 원문·근거'));
  fireEvent.click(await screen.findByRole('button', { name: '참고자료 다시 읽기' }));
  expect(await screen.findByText(/일치하는 참고자료가 아직 없어요/)).toBeTruthy();
  expect(screen.queryByText(/최저 미적용/)).toBeNull();
});
