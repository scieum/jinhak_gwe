import { newGrade, semesters, subjectTypes, validateGrade, type GradeRecord, type Semester } from '../domain/student';
import { subjectCatalog } from '../data/subject-catalog';

export const gradeHeaders = ['학기', '교과', '과목', '유형', '학점', '원점수', '과목평균', '성취도', 'A', 'B', 'C', 'D', 'E', '수강자수', '석차등급', '분할점수', '공동교육과정'];
const escapeCsv = (v: unknown) => {
  const safe = typeof v === 'string' && /^[=+@-]/.test(v) ? `'${v}` : String(v ?? '');
  return `"${safe.replace(/"/g, '""')}"`;
};
export function gradeRows(grades: readonly GradeRecord[]): unknown[][] {
  return grades.map(g => [g.semester, g.subject_group, g.name, g.type, g.credits, g.raw_score, g.subject_mean, g.achievement,
    ...(g.achievement_distribution ?? ['', '', '', '', '']), g.enrolled_count, g.rank_grade, g.division === 'fixed' ? '고정' : g.division === 'estimated' ? '추정' : '미상', g.is_joint ? '예' : '아니오']);
}
export const gradesCsv = (grades: readonly GradeRecord[]) => '\uFEFF' + [gradeHeaders, ...gradeRows(grades)].map(r => r.map(escapeCsv).join(',')).join('\r\n');
export function parseCsv(input: string): string[][] {
  const text = input.replace(/^﻿/, '');
  // Slices instead of per-character concatenation: the 100MB admission CSV must fit in memory.
  const rows: string[][] = [], n = text.length, delim = (c: string) => c === ',' || c === '\t' || c === '\n' || c === '\r';
  let row: string[] = [], i = 0;
  const end = (from: number) => { let e = from; while (e < n && !delim(text[e])) e++; return e; };
  while (i < n) {
    let value = '';
    if (text[i] === '"') {
      let s = ++i;
      for (;;) {
        const q = text.indexOf('"', i);
        if (q < 0) throw new Error('CSV의 따옴표가 닫히지 않았어요.');
        if (text[q + 1] === '"') { value += text.slice(s, q + 1); i = s = q + 2; } else { value += text.slice(s, q); i = q + 1; break; }
      }
    }
    const e = end(i); value += text.slice(i, e); i = e;
    row.push(value);
    if (i >= n) break;
    if (text[i] === ',' || text[i] === '\t') { if (++i === n) row.push(''); continue; }
    if (text[i] === '\r' && text[i + 1] === '\n') i++;
    i++;
    if (row.some(v => v.trim())) rows.push(row);
    row = [];
  }
  if (row.some(v => v.trim())) rows.push(row);
  return rows;
}
export interface ImportPreview { grades: GradeRecord[]; warnings: string[] }
export function rowsToGrades(rows: unknown[][]): ImportPreview {
  if (!rows.length || rows.length > 1001) throw new Error('성적은 한 번에 1~1,000개 과목을 불러올 수 있어요.');
  const headers = rows[0].map(v => String(v ?? '').replace(/^\uFEFF/, '').trim());
  if (['학기', '교과', '과목', '유형', '학점'].some(h => !headers.includes(h))) throw new Error('학기·교과·과목·유형·학점 열이 필요해요. 템플릿을 확인해 주세요.');
  const grades: GradeRecord[] = [], warnings: string[] = [];
  rows.slice(1).forEach((row, i) => {
    if (!row.some(v => v !== null && v !== undefined && String(v).trim())) return;
    const get = (h: string) => String(row[headers.indexOf(h)] ?? '').trim();
    const number = (h: string) => get(h) === '' || get(h) === '미산출' || get(h) === '—' ? undefined : Number(get(h));
    const semester = get('학기') as Semester;
    if (!semesters.includes(semester)) { warnings.push(`${i + 2}행: 학기를 읽지 못해 제외했어요.`); return; }
    if (!subjectTypes.includes(get('유형') as GradeRecord['type'])) { warnings.push(`${i + 2}행: 과목 유형을 읽지 못해 제외했어요.`); return; }
    const d = ['A', 'B', 'C', 'D', 'E'].map(number);
    const g: GradeRecord = { ...newGrade(semester), name: get('과목'), subject_group: get('교과'), type: get('유형') as GradeRecord['type'], credits: number('학점') ?? 0,
      rank_grade: number('석차등급') ?? null, raw_score: number('원점수'), subject_mean: number('과목평균'), enrolled_count: number('수강자수'),
      achievement: (get('성취도') || undefined) as GradeRecord['achievement'],
      achievement_distribution: d.every(v => v === undefined) ? undefined : d.map(v => v ?? 0) as [number, number, number, number, number],
      division: get('분할점수') === '고정' ? 'fixed' : get('분할점수') === '추정' ? 'estimated' : 'unknown', is_joint: get('공동교육과정') === '예' };
    const errors = validateGrade(g);
    if ([g.credits, g.rank_grade, g.raw_score, g.subject_mean, g.enrolled_count, ...g.achievement_distribution ?? []].some(v => v !== null && v !== undefined && !Number.isFinite(v))) {
      warnings.push(`${i + 2}행: 숫자로 읽을 수 없는 값이 있어 제외했어요.`); return;
    }
    if (errors.length) warnings.push(`${i + 2}행 ${g.name}: ${errors.join(' ')}`);
    grades.push(g);
  });
  return { grades, warnings };
}
/** 첫 시트(또는 CSV)를 값 표로 읽어요. 수식·큰 표는 막아요. */
export async function readSheetRows(file: File): Promise<unknown[][]> {
  if (file.size > 10_000_000) throw new Error('10MB 이하 파일을 선택해 주세요.');
  if (/.csv$/i.test(file.name)) return parseCsv(await file.text());
  if (!/.xlsx$/i.test(file.name)) throw new Error('CSV 또는 XLSX 파일을 선택해 주세요.');
  const { Workbook } = await import('exceljs');
  const workbook = new Workbook(); await workbook.xlsx.load(await file.arrayBuffer());
  const sheet = workbook.worksheets[0];
  if (!sheet || sheet.rowCount > 1001 || sheet.columnCount > 100) throw new Error('첫 시트의 표 크기를 확인해 주세요.');
  const rows: unknown[][] = [];
  sheet.eachRow(row => { const values: unknown[] = []; for (let col = 1; col <= sheet.columnCount; col++) {
    const cell = row.getCell(col);
    if (cell.formula) throw new Error('수식 대신 값을 붙여넣은 파일을 사용해 주세요.');
    values.push(cell.text);
  } rows.push(values); });
  return rows;
}
export async function readSpreadsheet(file: File): Promise<ImportPreview> { return rowsToGrades(await readSheetRows(file)); }
export async function xlsxOf(sheetName: string, headers: readonly string[], rows: readonly (string | number | null)[][]): Promise<ArrayBuffer> {
  const { Workbook } = await import('exceljs');
  const workbook = new Workbook(), sheet = workbook.addWorksheet(sheetName);
  sheet.addRow([...headers]); rows.forEach(r => sheet.addRow([...r])); sheet.columns.forEach(c => { c.width = 16; });
  return await workbook.xlsx.writeBuffer() as ArrayBuffer;
}
export const templateXlsx = () => xlsxOf('성적', gradeHeaders, []);

export interface PdfToken { text: string; x: number; y: number }
export function pdfLines(tokens: PdfToken[]): string[] {
  const lines: { y: number; tokens: PdfToken[] }[] = [];
  for (const token of tokens.filter(t => t.text.trim()).sort((a, b) => b.y - a.y || a.x - b.x)) {
    let line = lines.find(l => Math.abs(l.y - token.y) < 3);
    if (!line) { line = { y: token.y, tokens: [] }; lines.push(line); }
    line.tokens.push(token);
  }
  return lines.map(l => l.tokens.sort((a, b) => a.x - b.x).map(t => t.text).join(' '));
}
// Conservative supported text-table layout. Ambiguous lines never become saved grades automatically.
export function parsePdfGradeLines(lines: string[], fallback: Semester): ImportPreview {
  const grades: GradeRecord[] = [], warnings: string[] = [];
  let semester = fallback;
  for (const line of lines) {
    const term = line.match(/([123])\s*학년\s*([12])\s*학기/);
    if (term) semester = `${term[1]}-${term[2]}` as Semester;
    // 교과 과목 학점 원점수/평균 성취도(수강자수) 석차등급
    const match = line.match(/^(국어|수학|영어|한국사|사회|과학)\s+(.+?)\s+(\d+)\s+(\d+(?:\.\d+)?)\s*[/／]\s*(\d+(?:\.\d+)?)\s+([ABCDE])\s*\(\s*(\d+)\s*\)\s+([1-5]|미산출|[-—])(?:\s|$)/);
    if (!match) continue;
    const [, group, name, credits, raw, mean, achievement, enrolled, rank] = match;
    const known = subjectCatalog.find(s => s.name === name.trim());
    if (!known) { warnings.push(`${name}: 과목 유형을 확인할 수 없어 직접 입력이 필요해요.`); continue; }
    const g: GradeRecord = { ...newGrade(semester), name: name.trim(), subject_group: group, type: known.type, credits: Number(credits), raw_score: Number(raw), subject_mean: Number(mean),
      achievement: achievement as GradeRecord['achievement'], enrolled_count: Number(enrolled), rank_grade: /^[1-5]$/.test(rank) ? Number(rank) : null };
    warnings.push(...validateGrade(g).map(e => `${g.name}: ${e}`)); grades.push(g);
  }
  warnings.push('분포비율과 분할점수는 자동으로 추정하지 않아요. 성적표와 대조해 입력해 주세요.');
  return { grades, warnings };
}
export async function readGradePdf(file: File, fallback: Semester): Promise<ImportPreview> {
  if (file.size > 20_000_000) throw new Error('20MB 이하 PDF를 선택해 주세요.');
  const pdf = await import('pdfjs-dist');
  pdf.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).href;
  const task = pdf.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
  try {
    const doc = await task.promise;
    if (doc.numPages > 60) throw new Error('60쪽 이하 PDF를 선택해 주세요.');
    const lines: string[] = [];
    for (let n = 1; n <= doc.numPages; n++) {
      const page = await doc.getPage(n), content = await page.getTextContent();
      lines.push(...pdfLines(content.items.flatMap(item => 'str' in item ? [{ text: item.str, x: item.transform[4], y: item.transform[5] }] : [])));
      page.cleanup();
    }
    if (!lines.join('').trim()) throw new Error('글자 층이 없는 스캔 PDF예요. 직접 입력하거나 엑셀을 이용해 주세요.');
    const result = parsePdfGradeLines(lines, fallback);
    if (!result.grades.length) throw new Error('지원하는 성적 표를 찾지 못했어요. CSV·엑셀 또는 직접 입력을 이용해 주세요.');
    return result;
  } finally { await task.destroy(); }
}
