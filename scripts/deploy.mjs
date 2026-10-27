import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { env } from './tizen-env.mjs';
import { resolveSerial } from './tv-serial.mjs';

const SERIAL = resolveSerial();
const APP_ID = 'PainelTV01.painel';
const REMOTE_WGT = '/home/owner/share/tmp/sdk_tools/tmp/painel.wgt';
const run = (cmd, args) =>
  execFileSync(cmd, args, { env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });
const sdb = (...args) => run('sdb', ['-s', SERIAL, ...args]);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function connect() {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      run('sdb', ['connect', SERIAL]);
      sdb('get-state');
      return;
    } catch (error) {
      if (attempt === 2) throw error;
      try {
        run('sdb', ['disconnect', SERIAL]);
      } catch {
        // ja desconectado
      }
      await sleep(2000);
    }
  }
}

function remote(args, failPattern, okPattern) {
  const output = sdb('shell', '0', ...args);
  console.log(output);
  if (failPattern.test(output) || (okPattern && !okPattern.test(output))) {
    throw new Error(`falha em ${args[0]}: ${output.trim()}`);
  }
}

async function main() {
  run(process.execPath, ['build.mjs']);
  const configSource = existsSync('config/painel.config.json')
    ? 'config/painel.config.json'
    : 'config/painel.config.example.json';
  copyFileSync(configSource, 'dist/config.json');

  run('tizen', ['package', '-t', 'wgt', '-s', 'quilltv', '--', 'dist']);
  const wgt = readdirSync('dist').find((file) => file.endsWith('.wgt'));
  if (!wgt) throw new Error('pacote .wgt nao encontrado em dist/');

  await connect();
  sdb('push', join('dist', wgt), REMOTE_WGT);
  remote(['vd_appinstall', APP_ID, REMOTE_WGT], /fail/i, /install completed/i);
  remote(['was_execute', APP_ID], /fail|error/i);
}

main().catch((error) => {
  if (error.stdout) console.error(String(error.stdout));
  console.error(error.message);
  process.exit(1);
});
