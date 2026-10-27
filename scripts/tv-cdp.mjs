// Uso: node scripts/tv-cdp.mjs <appId> <js-expression>  (TV via TV_SERIAL ou config/tv.json)
// Cada chamada mata e relanca o app; para ler estado apos algum tempo, ponha a espera na expressao:
//   new Promise(r => setTimeout(() => r(JSON.stringify(window.__painel)), N))
import { execFileSync } from 'node:child_process';

import { env } from './tizen-env.mjs';
import { resolveSerial } from './tv-serial.mjs';

const SERIAL = resolveSerial();
const DEADLINE_MS = 60000;
const EVAL_TIMEOUT_MS = 40000;
const [appId, expression] = process.argv.slice(2);
if (!appId || !expression) {
  console.error('uso: node scripts/tv-cdp.mjs <appId> <js-expression>');
  process.exit(2);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const sdb = (...args) => execFileSync('sdb', ['-s', SERIAL, ...args], { env, encoding: 'utf8', timeout: 30000 });

function openDebugPort() {
  try { sdb('shell', '0', 'was_kill', appId); } catch { /* app ja parado */ }
  const out = sdb('shell', '0', 'debug', appId);
  const match = out.match(/port\D*:?\s*(\d{4,5})/i) || out.match(/(\d{4,5})\s*$/m);
  if (!match) throw new Error(`porta de debug nao encontrada em: ${out}`);
  return match[1];
}

async function targetUrl(port) {
  const list = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
  const page = list.find((t) => t.type === 'page');
  if (!page) throw new Error('nenhum alvo CDP do tipo page');
  return page.webSocketDebuggerUrl;
}

function evaluate(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    const finish = (fn, arg) => { clearTimeout(timer); ws.close(); fn(arg); };
    const timer = setTimeout(() => finish(reject, new Error('timeout no Runtime.evaluate')), EVAL_TIMEOUT_MS);
    ws.onopen = () => ws.send(JSON.stringify({
      id: 1,
      method: 'Runtime.evaluate',
      params: { expression, returnByValue: true, awaitPromise: true },
    }));
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id !== 1) return;
      if (msg.error || msg.result.exceptionDetails) finish(reject, new Error(JSON.stringify(msg.error || msg.result.exceptionDetails)));
      else finish(resolve, msg.result.result.value);
    };
    ws.onerror = (e) => finish(reject, new Error(`websocket: ${e.message || 'erro'}`));
  });
}

async function run() {
  const port = openDebugPort();
  sdb('forward', `tcp:${port}`, `tcp:${port}`);
  const end = Date.now() + DEADLINE_MS;
  let lastError = 'resultado undefined';
  while (Date.now() < end) {
    try {
      const value = await evaluate(await targetUrl(port));
      if (value !== undefined) return value;
      lastError = 'resultado undefined';
    } catch (e) { lastError = e.message; }
    await sleep(2000);
  }
  throw new Error(`prazo de ${DEADLINE_MS / 1000}s esgotado: ${lastError}`);
}

try {
  const value = await run();
  console.log(typeof value === 'string' ? value : JSON.stringify(value));
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
