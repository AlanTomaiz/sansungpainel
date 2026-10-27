import { existsSync, readFileSync } from 'node:fs';

const TV_JSON = new URL('../config/tv.json', import.meta.url);
const SDB_PORT = 26101;
const FALLBACK_IP = '192.168.18.50';

export function resolveSerial() {
  if (process.env.TV_SERIAL) return process.env.TV_SERIAL;
  try {
    const ip = existsSync(TV_JSON) && JSON.parse(readFileSync(TV_JSON, 'utf8')).ip;
    if (ip) return `${ip}:${SDB_PORT}`;
  } catch {
    // tv.json invalido: cai no padrao
  }
  return `${FALLBACK_IP}:${SDB_PORT}`;
}
