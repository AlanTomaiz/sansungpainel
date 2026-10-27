import type { InputSwitcher } from '@/application/ports';

export interface SocketLike {
  onopen: (() => void) | null;
  onmessage: ((e: { data: string }) => void) | null;
  onerror: (() => void) | null;
  onclose: (() => void) | null;
  send(data: string): void;
  close(): void;
}

const CLOSE_DELAY_MS = 300;
const URL_BASE = 'ws://127.0.0.1:8001/api/v2/channels/samsung.remote.control?name=';

export class WsInputSwitcher implements InputSwitcher {
  constructor(
    private readonly connect: (url: string) => SocketLike = (u) => new WebSocket(u) as SocketLike,
    private readonly timeoutMs = 10000,
  ) {}

  switchTo(port: number | 'tv'): Promise<void> {
    const key = port === 'tv' ? 'KEY_TV' : `KEY_HDMI${port}`;
    return new Promise((resolve, reject) => {
      const sock = this.connect(URL_BASE + btoa('Painel'));
      const finish = (error?: Error): void => {
        clearTimeout(timer);
        sock.onmessage = sock.onerror = sock.onclose = null;
        if (error) {
          sock.close();
          reject(error);
          return;
        }
        setTimeout(() => sock.close(), CLOSE_DELAY_MS);
        resolve();
      };
      const timer = setTimeout(() => finish(new Error('ws-unreachable')), this.timeoutMs);
      sock.onerror = () => finish(new Error('ws-unreachable'));
      sock.onclose = () => finish(new Error('ws-unreachable'));
      sock.onmessage = (e) => {
        const event = parseEvent(e.data);
        if (event === 'ms.channel.unauthorized') finish(new Error('ws-denied'));
        if (event !== 'ms.channel.connect') return;
        sock.send(JSON.stringify(remoteKey(key)));
        finish();
      };
    });
  }
}

function remoteKey(key: string): object {
  return {
    method: 'ms.remote.control',
    params: { Cmd: 'Click', DataOfCmd: key, Option: 'false', TypeOfRemote: 'SendRemoteKey' },
  };
}

function parseEvent(data: string): string | undefined {
  try {
    return (JSON.parse(data) as { event?: string }).event;
  } catch {
    return undefined;
  }
}
