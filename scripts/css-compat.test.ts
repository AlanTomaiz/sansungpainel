import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

function collectCss(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return collectCss(path);
    return path.endsWith('.css') ? [path] : [];
  });
}

const files = collectCss('src');
const FORBIDDEN = [
  'cqw',
  'cqh',
  'cqi',
  'cqb',
  'cqmin',
  'cqmax',
  '@container',
  'container-type',
  'aspect-ratio',
  ':has(',
];

export function flexRulesWithGap(css: string): string[] {
  const rules = css.match(/[^{}]+\{[^{}]*\}/g) ?? [];
  return rules.filter(
    (rule) =>
      /display\s*:\s*(inline-)?flex/.test(rule) && /(^|[;{\s])(row-|column-)?gap\s*:/.test(rule),
  );
}

describe('compatibilidade de CSS com Chromium 76', () => {
  it('encontra arquivos css', () => {
    expect(files.length, 'no css files').toBeGreaterThan(0);
  });

  it.each(FORBIDDEN)('nao usa %s', (token) => {
    for (const file of files) expect(readFileSync(file, 'utf8'), file).not.toContain(token);
  });

  it.each([
    ['gap', '.a { display: flex; gap: 8px; }', 1],
    ['row-gap', '.a { display: flex; row-gap: 8px; }', 1],
    ['column-gap', '.a { display: inline-flex; column-gap: 8px; }', 1],
    ['grid com gap', '.a { display: grid; gap: 8px; }', 0],
  ])('detector: %s', (_name, css, expected) => {
    expect(flexRulesWithGap(css)).toHaveLength(expected);
  });

  it('nao usa gap em regras flex', () => {
    for (const file of files)
      expect(flexRulesWithGap(readFileSync(file, 'utf8')), file).toEqual([]);
  });
});
