import { cpSync, mkdirSync, rmSync } from 'node:fs';

import { build } from 'esbuild';

const CHROME_MAJOR = 76;

rmSync('dist', { recursive: true, force: true });
mkdirSync('dist', { recursive: true });

await build({
  entryPoints: { main: 'src/main.ts' },
  outdir: 'dist',
  bundle: true,
  format: 'iife',
  target: `chrome${CHROME_MAJOR}`,
  sourcemap: false,
  minify: true,
  alias: { '@': './src' },
  external: ['*.woff2'],
});

cpSync('app', 'dist', { recursive: true });
