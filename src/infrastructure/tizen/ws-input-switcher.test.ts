import { afterEach, describe, expect, it, vi } from 'vitest';

import { type SocketLike, WsInputSwitcher } from './ws-input-switcher';

class FakeSocket implements SocketLike {
  sent: string[] = [];
  closed = false;
  onopen: (() => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: (() => void) | null = null;
  constructor(readonly url: string) {}
  send(d: string) {
    this.sent.push(d);
  }
  close() {
    this.closed = true;
  }
  emit(event: string) {
    this.onmessage?.({ data: JSON.stringify({ event }) });
  }
}

const setup = (timeoutMs?: number) => {
  let sock!: FakeSocket;
  const sw = new WsInputSwitcher((u) => (sock = new FakeSocket(u)), timeoutMs);
  return { sw, sock: () => sock };
};

describe('WsInputSwitcher', () => {
  afterEach(() => vi.useRealTimers());

  it('sends the key after ms.channel.connect and closes 300 ms later', async () => {
    vi.useFakeTimers();
    const { sw, sock } = setup();
    const p = sw.switchTo(2);
    expect(sock().url).toBe(
      'ws://127.0.0.1:8001/api/v2/channels/samsung.remote.control?name=UGFpbmVs',
    );
    expect(sock().sent).toEqual([]);
    sock().emit('ms.channel.connect');
    await p;
    expect(JSON.parse(sock().sent[0] ?? '')).toEqual({
      method: 'ms.remote.control',
      params: {
        Cmd: 'Click',
        DataOfCmd: 'KEY_HDMI2',
        Option: 'false',
        TypeOfRemote: 'SendRemoteKey',
      },
    });
    expect(sock().closed).toBe(false);
    await vi.advanceTimersByTimeAsync(300);
    expect(sock().closed).toBe(true);
  });

  it('ignores non-json frames', async () => {
    const { sw, sock } = setup();
    const p = sw.switchTo(1);
    sock().onmessage?.({ data: 'garbage' });
    sock().emit('ms.channel.connect');
    await expect(p).resolves.toBeUndefined();
  });

  it('uses KEY_TV for tv', async () => {
    const { sw, sock } = setup();
    const p = sw.switchTo('tv');
    sock().emit('ms.channel.connect');
    await p;
    expect(sock().sent[0]).toContain('KEY_TV');
  });

  it('rejects ws-denied on unauthorized', async () => {
    const { sw, sock } = setup();
    const p = sw.switchTo(1);
    sock().emit('ms.channel.unauthorized');
    await expect(p).rejects.toThrow('ws-denied');
    expect(sock().closed).toBe(true);
  });

  it('rejects ws-unreachable on error', async () => {
    const { sw, sock } = setup();
    const p = sw.switchTo(1);
    sock().onerror?.();
    await expect(p).rejects.toThrow('ws-unreachable');
  });

  it('rejects ws-unreachable on timeout', async () => {
    vi.useFakeTimers();
    const { sw } = setup();
    const p = sw.switchTo(1);
    const assertion = expect(p).rejects.toThrow('ws-unreachable');
    await vi.advanceTimersByTimeAsync(9999);
    await vi.advanceTimersByTimeAsync(1);
    await assertion;
  });
});
