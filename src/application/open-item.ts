import type { Launchable } from '@/domain/launchable';

import type { AppCatalog, InputSwitcher } from './ports';

export interface OpenItemDeps {
  switcher: InputSwitcher;
  apps: AppCatalog;
}

export type OpenResult = { ok: true } | { ok: false; message: string };

const MESSAGES: Record<string, string> = {
  'ws-denied': 'Permita o controle do painel na TV',
  'ws-unreachable': 'Não foi possível trocar de entrada',
};

export async function openItem(item: Launchable, deps: OpenItemDeps): Promise<OpenResult> {
  try {
    if (item.kind === 'app') await deps.apps.launch(item.appId);
    else await deps.switcher.switchTo(item.kind === 'tv' ? 'tv' : item.port);
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? MESSAGES[e.message] : undefined;
    const fallback = item.kind === 'app' ? 'Não foi possível abrir' : MESSAGES['ws-unreachable'];
    return { ok: false, message: message ?? fallback ?? '' };
  }
}
