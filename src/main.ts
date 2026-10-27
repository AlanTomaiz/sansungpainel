import './presentation/styles/base.css';
import './presentation/styles/row.css';
import './presentation/styles/hero.css';
import './presentation/styles/status.css';
import './presentation/styles/cards.css';
import './presentation/styles/quotes.css';
import './presentation/styles/weather.css';
import './presentation/styles/news.css';
import './presentation/styles/psn.css';
import './presentation/styles/dialog.css';

import { loadRow } from './application/load-row';
import { openItem } from './application/open-item';
import type {
  AppCatalog,
  InputSource,
  InputSwitcher,
  Store,
  WifiStatus,
} from './application/ports';
import type { PainelConfig } from './domain/config';
import { createFakes } from './infrastructure/fake/fakes';
import { LocalStore } from './infrastructure/storage/local-store';
import { TizenAppCatalog } from './infrastructure/tizen/tizen-apps';
import { TizenInputSource } from './infrastructure/tizen/tizen-inputs';
import { TizenWifi } from './infrastructure/tizen/tizen-wifi';
import { WsInputSwitcher } from './infrastructure/tizen/ws-input-switcher';
import { startBackground } from './presentation/background/lowpoly';
import { pickQuality } from './presentation/background/quality';
import { mountShell, type ShellHandle } from './presentation/shell';
import { startCards } from './start-cards';

const WIFI_REFRESH_MS = 30000;
const PROBE_FPS = 32.6;
const LEGACY_QUALITY_KEY = 'bgQuality.v1';

interface Adapters {
  apps: AppCatalog;
  inputs: InputSource;
  switcher: InputSwitcher;
  wifi: WifiStatus;
  store: Store;
}

function readConfig(): Promise<PainelConfig> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', 'config.json');
    xhr.onload = () => {
      try {
        resolve(JSON.parse(xhr.responseText) as PainelConfig);
      } catch (e) {
        reject(e);
      }
    };
    xhr.onerror = () => reject(new Error('config.json'));
    xhr.send();
  });
}

function createAdapters(config: PainelConfig): Adapters {
  if (typeof tizen === 'undefined') return createFakes(config.favorites);
  return {
    apps: new TizenAppCatalog(),
    inputs: new TizenInputSource(),
    switcher: new WsInputSwitcher(),
    wifi: new TizenWifi(),
    store: new LocalStore(),
  };
}

const NAV_PAUSE_MS = 450;

function startPolyBackground(shell: ShellHandle, store: Store): () => number {
  const canvas = document.getElementById('poly') as HTMLCanvasElement | null;
  if (!canvas) return () => 0;
  store.remove(LEGACY_QUALITY_KEY);
  const bg = startBackground(canvas, pickQuality(PROBE_FPS));
  shell.onHueChange((rgb) => bg.setHue(rgb));
  shell.onNavigate(() => bg.pauseFor(NAV_PAUSE_MS));
  return () => bg.fps();
}

function exitApp(): void {
  if (typeof tizen !== 'undefined') tizen.application.getCurrentApplication().hide();
}

async function start(root: HTMLElement): Promise<void> {
  const config = await readConfig();
  const a = createAdapters(config);
  const shell = mountShell(root, {
    open: (item) => openItem(item, a),
    store: a.store,
    exit: exitApp,
    reloadRow: () => void reloadRow(),
  });

  let loaded = false;
  const reloadRow = async (): Promise<void> => {
    try {
      shell.setRow(await loadRow({ ...a, config }));
      loaded = true;
    } catch {
      if (!loaded) shell.notify('Não foi possível carregar os apps');
    }
  };
  const refreshWifi = async (): Promise<void> => shell.status.setWifi(await a.wifi.read());

  a.inputs.onChange(() => void reloadRow());
  setInterval(() => void refreshWifi(), WIFI_REFRESH_MS);
  const bgFps = startPolyBackground(shell, a.store);
  const cards = startCards(shell, a.store, config);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    void reloadRow();
    void refreshWifi();
    cards.resume();
  });
  await Promise.all([reloadRow(), refreshWifi()]);

  (window as unknown as { __painel: unknown }).__painel = {
    get focus() {
      return shell.state().focus;
    },
    get rowLength() {
      return shell.state().rowLength;
    },
    get transform() {
      return shell.state().transform;
    },
    get overlay() {
      return shell.state().overlay;
    },
    get bgFps() {
      return bgFps();
    },
    cards: cards.states,
    get rowNames() {
      return Array.from(document.querySelectorAll('.item .lbl b')).map((n) => n.textContent);
    },
  };
}

const root = document.getElementById('app');
if (root) void start(root);
