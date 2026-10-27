import type { InputDevice, Launchable } from '@/domain/launchable';

const PS5_PATH =
  'M10.4499 14.56905a1.38287 1.38287 0 001.38287-1.38287v-2.37841a.83315.83315 0 01.83416-.83315h2.68403a.03732.03732 0 00.03631-.03732V9.4612a.03631.03631 0 00-.0363-.0363H12.1172a1.38287 1.38287 0 00-1.38388 1.38286v2.38043a.83416.83416 0 01-.83315.83415H7.25347a.03631.03631 0 00-.03631.03632v.47608a.03631.03631 0 00.03631.03631zm6.04488-3.21156V9.4612a.03631.03631 0 01.0363-.0363h7.30772a.03732.03732 0 01.03732.0363v.47609a.03833.03833 0 01-.03732.03732h-6.20929a.03631.03631 0 00-.0363.03631v1.2356a.3954.3954 0 00.3964.39741h4.62267a1.46457 1.46457 0 010 2.9251h-6.0812a.03631.03631 0 01-.0363-.0363v-.47407a.03631.03631 0 01.0363-.03632h5.53047a.91586.91586 0 10-.00706-1.8307h-4.72656a.83315.83315 0 01-.83315-.83416m-10.84608.28645a.83466.83466 0 000-1.66932H.03654a.03732.03732 0 01-.03632-.03732V9.4612a.03631.03631 0 01.03632-.0363h6.1528a1.38388 1.38388 0 010 2.76673H1.9328a.83315.83315 0 00-.83315.83416v1.51299a.03631.03631 0 01-.03631.0363H.03654a.03631.03631 0 01-.03632-.04034v-1.51298a1.38287 1.38287 0 011.38388-1.37783Z';
const CAST_PATH =
  'M0 18.5455v3.2727h3.2727c0-1.811-1.4618-3.2727-3.2727-3.2727zm0-4.3637v2.1818c3.011 0 5.4545 2.4437 5.4545 5.4546h2.1819c0-4.2218-3.4146-7.6364-7.6364-7.6364zm0-4.3636V12c5.4218 0 9.8182 4.3964 9.8182 9.8182H12c0-6.6327-5.3782-12-12-12zm21.8182-7.6364H2.1818C.9818 2.1818 0 3.1636 0 4.3636v3.2728h2.1818V4.3636h19.6364v15.2728h-7.6364v2.1818h7.6364c1.2 0 2.1818-.9818 2.1818-2.1818V4.3636c0-1.2-.9818-2.1818-2.1818-2.1818Z';

const STROKE =
  'fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"';

const brand = (d: string, scale: number): string =>
  `<svg viewBox="0 0 24 24" style="width:${scale}%;height:${scale}%"><path fill="#fff" d="${d}"/></svg>`;

const PC_SVG = `<svg viewBox="0 0 24 24" ${STROKE} style="width:46%;height:46%"><rect x="4" y="4.5" width="16" height="11" rx="1.8"/><path d="M2 19.5h20"/></svg>`;
const TV_SVG = `<svg viewBox="0 0 24 24" ${STROKE} style="width:46%;height:46%"><rect x="3" y="8" width="18" height="12" rx="2.2"/><path d="M8.5 3.5L12 8l3.5-4.5"/></svg>`;

const DEVICE_SVG: Record<InputDevice, string> = {
  ps5: brand(PS5_PATH, 62),
  cast: brand(CAST_PATH, 46),
  pc: PC_SVG,
  other: TV_SVG,
};

export function iconUrl(iconPath: string): string {
  return iconPath.startsWith('/') ? `file://${iconPath}` : iconPath;
}

function letterNode(name: string): HTMLElement {
  const letter = document.createElement('span');
  letter.className = 'letter';
  letter.textContent = name.slice(0, 1).toUpperCase();
  return letter;
}

export function appIconNode(iconPath: string | null, name: string): HTMLElement {
  if (!iconPath) return letterNode(name);
  const img = document.createElement('img');
  img.src = iconUrl(iconPath);
  img.alt = name;
  const fallback = (): void => img.replaceWith(letterNode(name));
  img.addEventListener('error', fallback);
  img.addEventListener('load', () => {
    if (img.naturalWidth === 0) fallback();
  });
  return img;
}

export function iconNode(item: Launchable): Element {
  if (item.kind === 'app') return appIconNode(item.iconPath, item.name);
  const holder = document.createElement('span');
  holder.innerHTML = item.kind === 'input' ? DEVICE_SVG[item.device] : TV_SVG;
  return holder.firstElementChild as Element;
}
