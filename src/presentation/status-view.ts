import { pad } from '@/domain/format';

const WIFI_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M2 8.5a15 15 0 0 1 20 0"/><path d="M5 12a10 10 0 0 1 14 0"/><path d="M8.5 15.5a5 5 0 0 1 7 0"/><circle cx="12" cy="19" r="1" fill="currentColor"/></svg>';
const TEMP_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M7 18h10a4 4 0 0 0 .5-8 6 6 0 0 0-11.5 1.5A3.3 3.3 0 0 0 7 18z"/></svg>';

export interface StatusView {
  setWifi(w: { ssid: string; signal: number } | null): void;
  setLatency(ms: number | null): void;
  setTemp(t: number | null): void;
}

export interface StatusViewHandle extends StatusView {
  el: HTMLElement;
  dispose(): void;
}

function slot(el: HTMLElement, className = ''): HTMLElement {
  const s = document.createElement('span');
  s.className = className;
  el.appendChild(s);
  return s;
}

export function createStatusView(): StatusViewHandle {
  const el = document.createElement('div');
  el.className = 'tstat';
  const wifi = slot(el);
  const latency = slot(el);
  const temp = slot(el);
  const clock = slot(el, 'clock');

  const tickClock = (): void => {
    const now = new Date();
    const text = `${now.getHours()}:${pad(now.getMinutes())}`;
    if (text !== clock.textContent) clock.textContent = text;
  };
  tickClock();
  const timer = setInterval(tickClock, 1000);

  const setWifi: StatusView['setWifi'] = (w) => {
    wifi.innerHTML = WIFI_SVG;
    wifi.append(w ? w.ssid : 'Sem Wi-Fi');
  };
  const setLatency: StatusView['setLatency'] = (ms) => {
    latency.textContent = '';
    if (ms !== null) {
      const dot = document.createElement('i');
      dot.className = 'ok';
      latency.appendChild(dot);
    }
    latency.append(ms === null ? 'sem internet' : `${Math.round(ms)} ms`);
  };
  const setTemp: StatusView['setTemp'] = (t) => {
    temp.innerHTML = TEMP_SVG;
    temp.append(t === null ? '—' : `${Math.round(t)}°`);
  };

  setWifi(null);
  latency.textContent = '—';
  setTemp(null);
  return { el, setWifi, setLatency, setTemp, dispose: () => clearInterval(timer) };
}
