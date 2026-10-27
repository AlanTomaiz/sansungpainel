import { execFileSync, spawn } from 'node:child_process';
import { chmodSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';

import { exchangeNpsso } from '../relay/psn-auth.ts';
import { readHiddenLine } from './prompt-hidden.mjs';
import { fallbackIp, parseRouteSrc, pickWindowsIp, refreshToken, updateTv } from './tv.ts';
import { upsertNpsso } from './upsert-npsso.ts';
import { upsertRefreshToken } from './upsert-refresh-token.ts';

const ENV_PATH = new URL('../relay/.env', import.meta.url);
const CONFIG_PATH = new URL('../config/painel.config.json', import.meta.url);
const EXAMPLE_PATH = new URL('../config/painel.config.example.json', import.meta.url);
const TV_PATH = new URL('../config/tv.json', import.meta.url);
const PROBE_TIMEOUT_MS = 1500;
const SDB_PORT = 26101;
const WSL_POWERSHELL = '/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe';
const POWERSHELL = existsSync(WSL_POWERSHELL) ? WSL_POWERSHELL : 'powershell.exe';
const PS_IPS =
  "(Get-NetIPAddress -AddressFamily IPv4 | ? {$_.InterfaceAlias -notmatch 'Loopback|vEthernet'}).IPAddress";
const PS_GATEWAY =
  "(Get-NetRoute -DestinationPrefix '0.0.0.0/0' | sort RouteMetric | select -First 1).NextHop";

const powershell = (command) =>
  execFileSync(POWERSHELL, ['-NoProfile', '-Command', command], {
    encoding: 'utf8',
    timeout: 10000,
    stdio: ['ignore', 'pipe', 'ignore'],
  })
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

function routeSrc() {
  try {
    const out = execFileSync('ip', ['-4', '-o', 'route', 'get', '1.1.1.1'], {
      encoding: 'utf8',
      timeout: 5000,
    });
    return fallbackIp(parseRouteSrc(out));
  } catch {
    return undefined;
  }
}

async function windowsIp() {
  try {
    return pickWindowsIp(powershell(PS_IPS), powershell(PS_GATEWAY)[0]) ?? routeSrc();
  } catch {
    return routeSrc();
  }
}

async function probe(ip) {
  try {
    const res = await fetch(`http://${ip}:8001/api/v2/`, {
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    });
    return res.ok ? ((await res.json()).device ?? null) : null;
  } catch {
    return null;
  }
}

function loadTv() {
  try {
    return existsSync(TV_PATH) ? JSON.parse(readFileSync(TV_PATH, 'utf8')) : undefined;
  } catch {
    return undefined;
  }
}

const readText = (path) => (existsSync(path) ? readFileSync(path, 'utf8') : '');

const tokenIo = {
  readNpsso: () => parseEnv(readText(ENV_PATH)).PSN_NPSSO,
  prompt: () => {
    console.error(
      'NPSSO expirado ou ausente. Pegue um novo em https://ca.account.sony.com/api/v1/ssocookie (logado na PSN).',
    );
    return readHiddenLine();
  },
  exchange: exchangeNpsso,
  writeNpsso: (npsso) => {
    writeFileSync(ENV_PATH, upsertNpsso(readText(ENV_PATH), npsso), { mode: 0o600 });
    chmodSync(ENV_PATH, 0o600);
  },
  writeRefresh: (token) => {
    const base = readText(existsSync(CONFIG_PATH) ? CONFIG_PATH : EXAMPLE_PATH);
    writeFileSync(CONFIG_PATH, upsertRefreshToken(base, token), { mode: 0o600 });
  },
};

const deploy = (ip) =>
  new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [fileURLToPath(new URL('./deploy.mjs', import.meta.url))],
      {
        stdio: 'inherit',
        env: { ...process.env, TV_SERIAL: `${ip}:${SDB_PORT}` },
      },
    );
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error('deploy falhou'))));
  });

const deps = {
  windowsIp,
  loadTv,
  saveTv: (info) => writeFileSync(TV_PATH, `${JSON.stringify(info, null, 2)}\n`),
  probe,
  token: () => refreshToken(tokenIo).then(() => console.log('Token da PSN atualizado')),
  deploy,
  log: console.log,
};

updateTv(deps, { skipToken: process.argv.includes('--skip-token') }).catch((error) => {
  console.error(error.message);
  process.exit(1);
});
