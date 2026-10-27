const wrap = (body: string): string =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;

const CLOUD = '<path d="M7 18h10a4 4 0 0 0 .5-8 6 6 0 0 0-11.5 1.5A3.3 3.3 0 0 0 7 18z"/>';
const HIGH_CLOUD = '<path d="M7 16h9a3.5 3.5 0 0 0 .5-7 5 5 0 0 0-9.5 1.3A3 3 0 0 0 7 16z"/>';

const ICONS = {
  sun: wrap(
    '<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/>',
  ),
  partly: wrap(
    '<circle cx="8" cy="8" r="3"/><path d="M8 2v1.5M2 8h1.5M3.8 3.8l1 1M12.2 3.8l-1 1"/><path d="M9 20h8a3.5 3.5 0 0 0 .5-7 5 5 0 0 0-9.4 1.3A3 3 0 0 0 9 20z"/>',
  ),
  cloud: wrap(CLOUD),
  fog: wrap('<path d="M4 9h16M3 13h18M6 17h12"/>'),
  rain: wrap(`${HIGH_CLOUD}<path d="M8 19l-1 2M12 19l-1 2M16 19l-1 2"/>`),
  storm: wrap(`${HIGH_CLOUD}<path d="M12 16l-2 3h3l-2 3"/>`),
  snow: wrap('<path d="M12 3v18M4 7.5l16 9M4 16.5l16-9"/>'),
} as const;

export type WeatherIconKind = keyof typeof ICONS;

export function iconKind(code: number): WeatherIconKind {
  if (code === 0) return 'sun';
  if (code <= 2) return 'partly';
  if (code === 3) return 'cloud';
  if (code <= 48) return 'fog';
  if (code <= 67 || (code >= 80 && code <= 82)) return 'rain';
  if (code <= 77 || code === 85 || code === 86) return 'snow';
  return 'storm';
}

export const weatherIcon = (code: number): string => ICONS[iconKind(code)];
