import type {
  AppCatalog,
  InputSource,
  InputSwitcher,
  Store,
  WifiStatus,
} from '@/application/ports';

export class FakeAppCatalog implements AppCatalog {
  launched: string[] = [];

  constructor(private readonly apps: { id: string; iconPath?: string | null }[]) {}

  async installed() {
    return this.apps.map((a) => ({
      id: a.id,
      iconPath: a.iconPath ?? null,
    }));
  }

  async launch(appId: string): Promise<void> {
    this.launched.push(appId);
  }
}

export class FakeInputSource implements InputSource {
  private listeners: (() => void)[] = [];

  constructor(private ports: { port: number; cecName: string | null }[]) {}

  async connected() {
    return this.ports;
  }

  onChange(cb: () => void): void {
    this.listeners.push(cb);
  }

  emit(ports: { port: number; cecName: string | null }[]): void {
    this.ports = ports;
    this.listeners.forEach((cb) => cb());
  }
}

export class FakeInputSwitcher implements InputSwitcher {
  calls: (number | 'tv')[] = [];

  constructor(private readonly error: Error | null = null) {}

  async switchTo(port: number | 'tv'): Promise<void> {
    if (this.error) throw this.error;
    this.calls.push(port);
  }
}

export class FakeWifi implements WifiStatus {
  async read() {
    return { ssid: 'Casa', signal: 0.8 };
  }
}

export class MemoryStore implements Store {
  private data = new Map<string, unknown>();

  get<T>(key: string): T | null {
    return this.data.has(key) ? (this.data.get(key) as T) : null;
  }

  set<T>(key: string, value: T): void {
    this.data.set(key, value);
  }

  remove(key: string): void {
    this.data.delete(key);
  }
}

export function createFakes(favorites: { appId: string; name: string }[]) {
  return {
    apps: new FakeAppCatalog(favorites.map((f) => ({ id: f.appId }))),
    inputs: new FakeInputSource([{ port: 1, cecName: null }]),
    switcher: new FakeInputSwitcher(),
    wifi: new FakeWifi(),
    store: new MemoryStore(),
  };
}
