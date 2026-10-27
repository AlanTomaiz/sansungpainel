import { chmodSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { parseEnv } from 'node:util';

import { exchangeNpsso } from '../relay/psn-auth.ts';
import { readHiddenLine } from './prompt-hidden.mjs';
import { upsertNpsso } from './upsert-npsso.ts';
import { upsertRefreshToken } from './upsert-refresh-token.ts';

const ENV_PATH = new URL('../relay/.env', import.meta.url);
const CONFIG_PATH = new URL('../config/painel.config.json', import.meta.url);
const EXAMPLE_PATH = new URL('../config/painel.config.example.json', import.meta.url);
const FROM_ENV = process.argv[2] === '--from-env';

const readEnvNpsso = () =>
  existsSync(ENV_PATH) ? parseEnv(readFileSync(ENV_PATH, 'utf8')).PSN_NPSSO : undefined;

const npsso = (FROM_ENV ? readEnvNpsso() : (process.argv[2] ?? (await readHiddenLine())))?.trim();
if (!npsso) {
  console.error(
    'Uso: npm run -s token (cola o NPSSO), -- <npsso> ou -- --from-env (lê relay/.env)',
  );
  process.exit(1);
}
let tokens;
try {
  tokens = await exchangeNpsso(npsso);
} catch (error) {
  const expired = error instanceof Error && error.message === 'npsso-expired';
  console.error(expired ? 'NPSSO inválido ou expirado' : 'PSN indisponível, tente de novo');
  process.exit(1);
}
if (!FROM_ENV) {
  const current = existsSync(ENV_PATH) ? readFileSync(ENV_PATH, 'utf8') : '';
  writeFileSync(ENV_PATH, upsertNpsso(current, npsso), { mode: 0o600 });
  chmodSync(ENV_PATH, 0o600);
}
const base = readFileSync(existsSync(CONFIG_PATH) ? CONFIG_PATH : EXAMPLE_PATH, 'utf8');
writeFileSync(CONFIG_PATH, upsertRefreshToken(base, tokens.refresh), { mode: 0o600 });
console.log('Token da PSN atualizado; rode npm run deploy para enviar à TV');
