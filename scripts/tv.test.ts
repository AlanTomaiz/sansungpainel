import { describe, expect, it, vi } from 'vitest';

import {
  fallbackIp,
  findTv,
  matchesTv,
  parseRouteSrc,
  pickTvIp,
  pickWindowsIp,
  refreshToken,
  subnetHosts,
  type TvDeps,
  updateTv,
} from './tv.ts';

const EXPECTED = { modelName: 'QN55Q60AAGXZD', wifiMac: 'aa:bb' };
const TV = {
  modelName: 'QN55Q60AAGXZD',
  wifiMac: 'aa:bb',
  developerMode: '1',
  developerIP: '192.168.18.5',
};

describe('subnetHosts', () => {
  it('lista .1 a .254 da /24 sem o próprio IP', () => {
    const hosts = subnetHosts('192.168.18.5');
    expect(hosts).toHaveLength(253);
    expect(hosts[0]).toBe('192.168.18.1');
    expect(hosts).not.toContain('192.168.18.5');
    expect(hosts).not.toContain('192.168.18.255');
  });
});

describe('matchesTv', () => {
  it('aceita pelo modelName ou pelo wifiMac', () => {
    expect(matchesTv({ modelName: 'QN55Q60AAGXZD' }, EXPECTED)).toBe(true);
    expect(matchesTv({ modelName: 'X', wifiMac: 'aa:bb' }, EXPECTED)).toBe(true);
  });
  it('rejeita outro aparelho', () => {
    expect(matchesTv({ modelName: 'X', wifiMac: 'cc' }, EXPECTED)).toBe(false);
    expect(matchesTv({}, { modelName: 'QN55Q60AAGXZD' })).toBe(false);
  });
});

describe('pickWindowsIp', () => {
  it('ignora Tailscale e prefere a /24 do gateway', () => {
    const ips = ['100.64.0.2', '10.0.0.7', '192.168.18.5'];
    expect(pickWindowsIp(ips, '192.168.18.1')).toBe('192.168.18.5');
  });
  it('sem gateway usa o primeiro IP privado', () => {
    expect(pickWindowsIp(['100.64.0.2', '172.20.1.4'])).toBe('172.20.1.4');
  });
  it('sem IP privado devolve undefined', () => {
    expect(pickWindowsIp(['100.64.0.2'])).toBeUndefined();
  });
});

describe('pickTvIp', () => {
  it('devolve o IP do primeiro candidato que casa', () => {
    const results = [
      { ip: '1', device: null },
      { ip: '2', device: { modelName: 'QN55Q60AAGXZD' } },
    ];
    expect(pickTvIp(results, EXPECTED)?.ip).toBe('2');
    expect(pickTvIp([{ ip: '1', device: null }], EXPECTED)).toBeUndefined();
  });
});

describe('pickTvIp com wifiMac salvo', () => {
  it('prefere o match exato de wifiMac ao de modelName', () => {
    const results = [
      { ip: '1', device: { modelName: 'QN55Q60AAGXZD', wifiMac: 'zz' } },
      { ip: '2', device: { modelName: 'QN55Q60AAGXZD', wifiMac: 'aa:bb' } },
    ];
    expect(pickTvIp(results, EXPECTED)?.ip).toBe('2');
  });
});

describe('fallbackIp', () => {
  it('descarta a faixa 172.16/12 (NIC virtual do WSL)', () => {
    expect(fallbackIp('172.17.0.2')).toBeUndefined();
    expect(fallbackIp('172.23.111.88')).toBeUndefined();
  });
  it('aceita LAN 192.168 e 10.x', () => {
    expect(fallbackIp('192.168.18.9')).toBe('192.168.18.9');
    expect(fallbackIp('10.0.0.4')).toBe('10.0.0.4');
  });
  it('trata ausência e IP público', () => {
    expect(fallbackIp(undefined)).toBeUndefined();
    expect(fallbackIp('8.8.8.8')).toBeUndefined();
  });
});

describe('parseRouteSrc', () => {
  it('extrai o src do ip route get', () => {
    const out = '1.1.1.1 via 192.168.18.1 dev eth0 src 192.168.18.9 uid 1000 \n';
    expect(parseRouteSrc(out)).toBe('192.168.18.9');
  });
  it('devolve undefined sem src', () => {
    expect(parseRouteSrc('')).toBeUndefined();
  });
});

describe('findTv', () => {
  it('usa o IP salvo sem varrer', async () => {
    const probe = vi.fn(async (ip: string) => (ip === '192.168.18.50' ? TV : null));
    const found = await findTv(probe, { ip: '192.168.18.50', ...EXPECTED }, '192.168.18.5');
    expect(found?.ip).toBe('192.168.18.50');
    expect(probe).toHaveBeenCalledTimes(1);
  });
  it('varre a /24 quando o salvo falha', async () => {
    const probe = vi.fn(async (ip: string) => (ip === '192.168.18.77' ? TV : null));
    const found = await findTv(probe, { ip: '192.168.18.50', ...EXPECTED }, '192.168.18.5');
    expect(found?.ip).toBe('192.168.18.77');
  });
  it('devolve undefined quando ninguém responde', async () => {
    const found = await findTv(async () => null, undefined, '192.168.18.5');
    expect(found).toBeUndefined();
  });
  it('sem IP do Windows e sem salvo não varre', async () => {
    const probe = vi.fn(async () => null);
    expect(await findTv(probe, undefined, undefined)).toBeUndefined();
    expect(probe).not.toHaveBeenCalled();
  });
});

describe('refreshToken', () => {
  const base = () => ({
    readNpsso: vi.fn(() => 'old'),
    prompt: vi.fn(async () => 'new'),
    exchange: vi.fn(async () => ({ refresh: 'R' })),
    writeNpsso: vi.fn(),
    writeRefresh: vi.fn(),
  });
  it('troca o NPSSO do .env e grava o refresh', async () => {
    const io = base();
    await refreshToken(io);
    expect(io.exchange).toHaveBeenCalledWith('old');
    expect(io.writeRefresh).toHaveBeenCalledWith('R');
    expect(io.prompt).not.toHaveBeenCalled();
  });
  it('pede novo NPSSO quando expirou, grava e tenta de novo', async () => {
    const io = base();
    io.exchange.mockRejectedValueOnce(new Error('npsso-expired'));
    await refreshToken(io);
    expect(io.prompt).toHaveBeenCalledTimes(1);
    expect(io.writeNpsso).toHaveBeenCalledWith('new');
    expect(io.exchange).toHaveBeenLastCalledWith('new');
    expect(io.writeRefresh).toHaveBeenCalledWith('R');
  });
  it('propaga erro que não é expiração', async () => {
    const io = base();
    io.exchange.mockRejectedValue(new Error('psn-unavailable'));
    await expect(refreshToken(io)).rejects.toThrow('PSN indisponível');
  });
});

function makeDeps(over: Partial<TvDeps> = {}): TvDeps {
  return {
    windowsIp: async () => '192.168.18.5',
    loadTv: () => undefined,
    saveTv: vi.fn(),
    probe: async (ip) => (ip === '192.168.18.50' ? TV : null),
    token: vi.fn(async () => {}),
    deploy: vi.fn(async () => {}),
    log: vi.fn(),
    ...over,
  };
}

describe('updateTv', () => {
  it('acha, salva, atualiza token, reinstala e avisa', async () => {
    const deps = makeDeps();
    await updateTv(deps, { skipToken: false });
    expect(deps.saveTv).toHaveBeenCalledWith({
      ip: '192.168.18.50',
      wifiMac: 'aa:bb',
      modelName: 'QN55Q60AAGXZD',
    });
    expect(deps.token).toHaveBeenCalled();
    expect(deps.deploy).toHaveBeenCalledWith('192.168.18.50');
    expect(deps.log).toHaveBeenLastCalledWith('Painel atualizado na TV 192.168.18.50');
  });
  it('--skip-token pula o token', async () => {
    const deps = makeDeps();
    await updateTv(deps, { skipToken: true });
    expect(deps.token).not.toHaveBeenCalled();
    expect(deps.deploy).toHaveBeenCalled();
  });
  it('erra claro quando não acha a TV', async () => {
    const deps = makeDeps({ probe: async () => null });
    await expect(updateTv(deps, { skipToken: false })).rejects.toThrow(
      'TV não encontrada na rede — ela está ligada e no mesmo Wi-Fi?',
    );
    expect(deps.deploy).not.toHaveBeenCalled();
  });
  it('para quando o Modo Desenvolvedor está desligado', async () => {
    const deps = makeDeps({ probe: async () => ({ ...TV, developerMode: '0' }) });
    await expect(updateTv(deps, { skipToken: false })).rejects.toThrow(/Modo Desenvolvedor/);
    expect(deps.deploy).not.toHaveBeenCalled();
  });
  it('avisa que pulou varredura e checagem sem IP do Windows', async () => {
    const deps = makeDeps({
      windowsIp: async () => undefined,
      loadTv: () => ({ ip: '192.168.18.50', ...EXPECTED }),
    });
    await updateTv(deps, { skipToken: true });
    expect(deps.log).toHaveBeenCalledWith(expect.stringMatching(/varredura.*Host PC IP/));
    expect(deps.deploy).toHaveBeenCalled();
  });
  it('mostra vazio quando a TV não informa developerIP', async () => {
    const deps = makeDeps({ probe: async () => ({ ...TV, developerIP: undefined }) });
    await expect(updateTv(deps, { skipToken: false })).rejects.toThrow(/vazio/);
  });
  it('para quando developerIP difere do IP do Windows', async () => {
    const deps = makeDeps({ probe: async () => ({ ...TV, developerIP: '192.168.18.9' }) });
    await expect(updateTv(deps, { skipToken: false })).rejects.toThrow(/Host PC IP/);
    expect(deps.token).not.toHaveBeenCalled();
  });
});
