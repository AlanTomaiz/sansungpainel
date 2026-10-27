const SCAN_BATCH = 64;

export interface TvDevice {
  modelName?: string;
  wifiMac?: string;
  developerMode?: string;
  developerIP?: string;
}
export interface TvInfo {
  ip: string;
  wifiMac?: string;
  modelName: string;
}
export type Expected = { modelName: string; wifiMac?: string };
export type Probe = (ip: string) => Promise<TvDevice | null>;

export interface TokenDeps {
  readNpsso: () => string | undefined;
  prompt: () => Promise<string>;
  exchange: (npsso: string) => Promise<{ refresh: string }>;
  writeNpsso: (npsso: string) => void;
  writeRefresh: (token: string) => void;
}
export interface TvDeps {
  windowsIp: () => Promise<string | undefined>;
  loadTv: () => TvInfo | undefined;
  saveTv: (info: TvInfo) => void;
  probe: Probe;
  token: () => Promise<void>;
  deploy: (ip: string) => Promise<void>;
  log: (message: string) => void;
}

const MODEL = 'QN55Q60AAGXZD';

const subnetOf = (ip: string) => ip.split('.').slice(0, 3).join('.');

export function subnetHosts(ip: string): string[] {
  const prefix = subnetOf(ip);
  return Array.from({ length: 254 }, (_, i) => `${prefix}.${i + 1}`).filter((h) => h !== ip);
}

export function matchesTv(device: TvDevice, expected: Expected): boolean {
  if (device.modelName === expected.modelName) return true;
  return Boolean(expected.wifiMac) && device.wifiMac === expected.wifiMac;
}

function isPrivate(ip: string): boolean {
  const [a = 0, b = 0] = ip.split('.').map(Number);
  return a === 10 || (a === 192 && b === 168) || (a === 172 && b >= 16 && b <= 31);
}

export function pickWindowsIp(ips: string[], gateway?: string): string | undefined {
  const privates = ips.filter(isPrivate);
  const sameNet = gateway ? privates.find((ip) => subnetOf(ip) === subnetOf(gateway)) : undefined;
  return sameNet ?? privates[0];
}

export function fallbackIp(src: string | undefined): string | undefined {
  if (!src) return undefined;
  const [a = 0, b = 0] = src.split('.').map(Number);
  const wslNat = a === 172 && b >= 16 && b <= 31;
  return isPrivate(src) && !wslNat ? src : undefined;
}

export function pickTvIp(
  results: { ip: string; device: TvDevice | null }[],
  expected: Expected,
): FoundTv | undefined {
  const hits = results.filter(
    (r): r is FoundTv => r.device !== null && matchesTv(r.device, expected),
  );
  const exact = expected.wifiMac
    ? hits.find((r) => r.device.wifiMac === expected.wifiMac)
    : undefined;
  return exact ?? hits[0];
}

export function parseRouteSrc(output: string): string | undefined {
  return /\bsrc\s+(\d{1,3}(?:\.\d{1,3}){3})/.exec(output)?.[1];
}

export interface FoundTv {
  ip: string;
  device: TvDevice;
}

export async function findTv(
  probe: Probe,
  saved: TvInfo | undefined,
  windowsIp: string | undefined,
): Promise<FoundTv | undefined> {
  const expected: Expected = { modelName: saved?.modelName ?? MODEL, wifiMac: saved?.wifiMac };
  if (saved) {
    const device = await probe(saved.ip);
    if (device && matchesTv(device, expected)) return { ip: saved.ip, device };
  }
  if (!windowsIp) return undefined;
  const hosts = subnetHosts(windowsIp);
  for (let i = 0; i < hosts.length; i += SCAN_BATCH) {
    const results = await Promise.all(
      hosts.slice(i, i + SCAN_BATCH).map(async (ip) => ({ ip, device: await probe(ip) })),
    );
    const hit = pickTvIp(results, expected);
    if (hit) return hit;
  }
  return undefined;
}

async function exchangeOrExpired(
  io: TokenDeps,
  npsso: string,
): Promise<{ refresh: string } | null> {
  try {
    return await io.exchange(npsso);
  } catch (error) {
    if (error instanceof Error && error.message === 'npsso-expired') return null;
    throw Object.assign(new Error('PSN indisponível, tente de novo'), { cause: error });
  }
}

export async function refreshToken(io: TokenDeps): Promise<void> {
  const saved = io.readNpsso()?.trim();
  let tokens = saved ? await exchangeOrExpired(io, saved) : null;
  if (!tokens) {
    const fresh = (await io.prompt()).trim();
    if (!fresh) throw new Error('NPSSO não informado');
    tokens = await exchangeOrExpired(io, fresh);
    if (!tokens) throw new Error('NPSSO inválido ou expirado');
    io.writeNpsso(fresh);
  }
  io.writeRefresh(tokens.refresh);
}

function assertDeveloperMode(device: TvDevice, windowsIp: string | undefined): void {
  if (device.developerMode !== '1') {
    throw new Error(
      'Modo Desenvolvedor desligado na TV: em Apps digite 12345, ligue o Developer Mode, informe o IP do PC e reinicie a TV.',
    );
  }
  if (windowsIp && device.developerIP !== windowsIp) {
    throw new Error(
      `Host PC IP da TV (${device.developerIP || 'vazio'}) difere do IP do Windows (${windowsIp}): corrija no Modo Desenvolvedor e reinicie a TV.`,
    );
  }
}

export async function updateTv(deps: TvDeps, options: { skipToken: boolean }): Promise<void> {
  const windowsIp = await deps.windowsIp();
  const found = await findTv(deps.probe, deps.loadTv(), windowsIp);
  if (!found) throw new Error('TV não encontrada na rede — ela está ligada e no mesmo Wi-Fi?');
  if (!windowsIp) {
    deps.log(
      'Aviso: IP do Windows não detectado; varredura da sub-rede e checagem do Host PC IP puladas.',
    );
  }
  const { ip, device } = found;
  deps.saveTv({ ip, wifiMac: device.wifiMac, modelName: device.modelName ?? MODEL });
  assertDeveloperMode(device, windowsIp);
  if (!options.skipToken) await deps.token();
  await deps.deploy(ip);
  deps.log(`Painel atualizado na TV ${ip}`);
}
