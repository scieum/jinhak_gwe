import { describe, expect, it } from 'vitest';
import { printTable } from '../src/io/backup';

describe('printTable', () => {
  it('표를 인쇄용 문서로 만들고 칸 글자는 HTML로 해석하지 않아요', () => {
    printTable('결과 집계', ['개인정보 주의'], ['학생', '결과'], [['3 <b>별</b>', 'A&B']]);
    const doc = document.querySelector('iframe')!.srcdoc;
    expect(doc).toContain('<th>학생</th>');
    expect(doc).toContain('3 &lt;b&gt;별&lt;/b&gt;');
    expect(doc).toContain('A&amp;B');
    expect(doc).not.toContain('<b>별');
  });
});
