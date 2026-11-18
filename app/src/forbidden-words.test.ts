// NEVER-2 가드: 합격을 약속하는 금지 표현이 소스 문구에 들어가지 않게 한다. 금지어는 규칙 SSOT에서 그때그때 읽는다.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { expect, test } from 'vitest';

// vitest는 app/ 에서 실행된다(npm test)
const srcDir = resolve(process.cwd(), 'src');
const rules = JSON.parse(readFileSync(resolve(process.cwd(), '../rules/design-rules.json'), 'utf8')) as {
  forbidden_words: string[];
  forbidden_word_exceptions: string[];
};

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return sourceFiles(p);
    return /\.(ts|tsx)$/.test(name) ? [p] : [];
  });
}

test('규칙 파일에 금지어가 있다', () => {
  expect(rules.forbidden_words.length).toBeGreaterThan(0);
});

test('src 아래 .ts/.tsx에 금지어가 없다', () => {
  const files = sourceFiles(srcDir);
  expect(files.length).toBeGreaterThan(0);
  const hits: string[] = [];
  for (const file of files) {
    let text = readFileSync(file, 'utf8');
    for (const ok of rules.forbidden_word_exceptions) text = text.split(ok).join('');
    for (const word of rules.forbidden_words) if (text.includes(word)) hits.push(`${file}: ${word}`);
  }
  expect(hits).toEqual([]);
});
