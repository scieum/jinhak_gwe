import { writeFileSync } from 'node:fs';
import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import { columnWidths, hwpxOf } from '../src/io/hwpx';

describe('HWPX 내보내기', () => {
  it('열 너비 합은 A4 본문 폭(42520)과 같아요', () => {
    for (const n of [1, 3, 7, 10]) expect(columnWidths(n).reduce((a, b) => a + b, 0)).toBe(42520);
  });
  it('mimetype이 첫 항목·무압축이고 표에 머리+행이 들어가며 글자는 XML로 해석하지 않아요', async () => {
    const blob = await hwpxOf('결과 집계 · 3반', ['개인정보 주의'], ['학생', '결과'], [['3 <별>', 'A&B'], ['5 햇살', null]]);
    const buf = new Uint8Array(await blob.arrayBuffer());
    if (process.env.HWPX_OUT) writeFileSync(process.env.HWPX_OUT, buf); // 스킬 validate.py로 확인할 때만
    const zip = await JSZip.loadAsync(buf);
    expect(Object.keys(zip.files)[0]).toBe('mimetype');
    expect(new TextDecoder().decode(buf.slice(30, 38))).toBe('mimetype'); // 첫 로컬 헤더 이름
    expect(buf[8]).toBe(0); // 압축 방식 0 = STORE
    expect(await zip.file('mimetype')!.async('string')).toBe('application/hwp+zip');
    const sec = await zip.file('Contents/section0.xml')!.async('string');
    expect(sec).toContain('rowCnt="3" colCnt="2"');
    expect(sec).toContain('3 &lt;별&gt;');
    expect(sec).toContain('A&amp;B');
    expect(sec).toContain('<hp:secPr');
    expect(sec.trim().endsWith('</hs:sec>')).toBe(true);
    expect(zip.file('Contents/header.xml')).toBeTruthy();
  });
});
