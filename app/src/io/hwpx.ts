// 표 하나짜리 한글(HWPX) 문서를 브라우저에서 만들어요. 템플릿은 hwpx 스킬의 base + 공문(gonmun) 스타일을 그대로 씀:
// charPr 8 = 16pt 볼드(제목) · 10 = 10pt 볼드(표 머리) · 0 = 10pt 본문, paraPr 21 = 가운데(표 셀) · 22 = 양쪽(표 셀), borderFill 3 = 실선 · 4 = 실선+옅은 배경.
const TEMPLATE = import.meta.glob('./hwpx-template/**/*', { query: '?raw', import: 'default' }) as Record<string, () => Promise<string>>;
const BODY_WIDTH = 42520; // A4 본문 폭(HWPUNIT)
const ROW_HEIGHT = 2400;

const esc = (v: unknown) => String(v ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/** 열 너비 합이 본문 폭과 정확히 같게 나눠요(나머지는 마지막 열) */
export function columnWidths(n: number): number[] {
  const w = Math.floor(BODY_WIDTH / n);
  return Array.from({ length: n }, (_, i) => i === n - 1 ? BODY_WIDTH - w * (n - 1) : w);
}

export function sectionXml(head: string, title: string, lines: readonly string[], headers: readonly string[], rows: readonly (string | number | null)[][]): string {
  let id = 1000000002;
  const p = (text: string, charPr: number, paraPr = 0) =>
    `<hp:p id="${id++}" paraPrIDRef="${paraPr}" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0"><hp:run charPrIDRef="${charPr}">${text ? `<hp:t>${esc(text)}</hp:t>` : '<hp:t/>'}</hp:run></hp:p>`;
  const widths = columnWidths(headers.length);
  const cell = (text: unknown, r: number, c: number, header: boolean) =>
    `<hp:tc name="" header="${header ? 1 : 0}" hasMargin="0" protect="0" editable="0" dirty="1" borderFillIDRef="${header ? 4 : 3}">`
    + `<hp:subList id="" textDirection="HORIZONTAL" lineWrap="BREAK" vertAlign="CENTER" linkListIDRef="0" linkListNextIDRef="0" textWidth="0" textHeight="0" hasTextRef="0" hasNumRef="0">`
    + p(String(text ?? ''), header ? 10 : 0, header ? 21 : 22)
    + `</hp:subList><hp:cellAddr colAddr="${c}" rowAddr="${r}"/><hp:cellSpan colSpan="1" rowSpan="1"/>`
    + `<hp:cellSz width="${widths[c]}" height="${ROW_HEIGHT}"/><hp:cellMargin left="141" right="141" top="141" bottom="141"/></hp:tc>`;
  const all = [headers, ...rows];
  const table = `<hp:p id="${id++}" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0"><hp:run charPrIDRef="0">`
    + `<hp:tbl id="${id++}" zOrder="0" numberingType="TABLE" textWrap="TOP_AND_BOTTOM" textFlow="BOTH_SIDES" lock="0" dropcapstyle="None" pageBreak="CELL" repeatHeader="1" rowCnt="${all.length}" colCnt="${headers.length}" cellSpacing="0" borderFillIDRef="3" noAdjust="0">`
    + `<hp:sz width="${BODY_WIDTH}" widthRelTo="ABSOLUTE" height="${ROW_HEIGHT * all.length}" heightRelTo="ABSOLUTE" protect="0"/>`
    + `<hp:pos treatAsChar="1" affectLSpacing="0" flowWithText="1" allowOverlap="0" holdAnchorAndSO="0" vertRelTo="PARA" horzRelTo="COLUMN" vertAlign="TOP" horzAlign="LEFT" vertOffset="0" horzOffset="0"/>`
    + `<hp:outMargin left="0" right="0" top="0" bottom="0"/><hp:inMargin left="0" right="0" top="0" bottom="0"/>`
    + all.map((row, r) => `<hp:tr>${headers.map((_, c) => cell(row[c], r, c, r === 0)).join('')}</hp:tr>`).join('')
    + `</hp:tbl></hp:run></hp:p>`;
  return `${head}${p(title, 8)}${lines.map(l => p(l, 0)).join('')}${p('', 0)}${table}</hs:sec>`;
}

/** HWPX 파일(Blob). mimetype은 ZIP 첫 항목 · 무압축(한글이 이 순서를 요구해요). */
export async function hwpxOf(title: string, lines: readonly string[], headers: readonly string[], rows: readonly (string | number | null)[][]): Promise<Blob> {
  const { default: JSZip } = await import('jszip');
  const files = Object.fromEntries(await Promise.all(Object.entries(TEMPLATE).map(async ([k, load]) => [k.replace('./hwpx-template/', ''), await load()] as const)));
  const zip = new JSZip();
  zip.file('mimetype', files.mimetype.trim(), { compression: 'STORE' });
  for (const [name, text] of Object.entries(files)) {
    if (name === 'mimetype' || name === 'Contents/section-head.xml') continue;
    zip.file(name, text);
  }
  zip.file('Contents/section0.xml', sectionXml(files['Contents/section-head.xml'], title, lines, headers, rows));
  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE', mimeType: 'application/hwp+zip' });
}
