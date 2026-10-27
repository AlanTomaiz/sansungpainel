export type RGB = [number, number, number];
export type InputDevice = 'ps5' | 'cast' | 'pc' | 'other';

export type Launchable =
  | {
      kind: 'input';
      port: number;
      name: string;
      device: InputDevice;
      bg: string;
      hue: RGB;
      meta: string;
    }
  | {
      kind: 'app';
      appId: string;
      name: string;
      iconPath: string | null;
      bg: string;
      hue: RGB;
      meta: string;
    }
  | { kind: 'tv' };

export type InputItem = Extract<Launchable, { kind: 'input' }>;
export type AppItem = Extract<Launchable, { kind: 'app' }>;

export function buildRow(
  inputs: InputItem[],
  favorites: AppItem[],
  installedIds: Set<string>,
): { items: Launchable[]; sepIndex: number } {
  const apps = favorites.filter((f) => installedIds.has(f.appId));
  return { items: [...inputs, ...apps, { kind: 'tv' }], sepIndex: inputs.length };
}
