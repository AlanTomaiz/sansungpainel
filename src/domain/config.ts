export type NewsTheme = 'Brasil' | 'Games' | 'Tecnologia' | 'Economia';
export type SourceName = 'weather' | 'quotes' | 'news';
export type SourceRoute = 'direct' | 'relay';

export interface FavoriteApp {
  appId: string;
  name: string;
  bg: string;
  hue: [number, number, number];
  meta: string;
}

export interface PainelConfig {
  favorites: FavoriteApp[];
  weather: { city: string; lat: number; lon: number; tz: string };
  news: { theme: NewsTheme; url: string }[];
  relayBase: string | null;
  psnRefreshToken: string | null;
  sourceRoute: Record<SourceName, SourceRoute>;
}
