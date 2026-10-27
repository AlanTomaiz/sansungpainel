import { measureLatency } from './application/measure-latency';
import type { Store } from './application/ports';
import type { DataSource } from './application/refresh-card';
import { type Binding, startScheduler } from './application/scheduler';
import type { CardState } from './domain/card-state';
import type { PainelConfig } from './domain/config';
import { FetchHttpClient } from './infrastructure/http/http-client';
import { createQuotesSource } from './infrastructure/sources/awesome-quotes';
import { createWeatherSource } from './infrastructure/sources/open-meteo';
import { createPsnSource } from './infrastructure/sources/psn';
import { createNewsSource } from './infrastructure/sources/rss-news';
import { mountNewsCard } from './presentation/cards/news-card';
import { mountPsnCard } from './presentation/cards/psn-card';
import { mountQuotesCard } from './presentation/cards/quotes-card';
import { mountWeatherCard } from './presentation/cards/weather-card';
import type { ShellHandle } from './presentation/shell';

const LATENCY_REFRESH_MS = 60000;
const LATENCY_URL = 'https://api.open-meteo.com/';
const WEATHER_SLOT = 0;
const NEWS_SLOT = 1;
const QUOTES_SLOT = 2;
const PSN_SLOT = 3;

export interface CardsHandle {
  states: Record<string, CardState<unknown>>;
  resume(): void;
}

export function startCards(shell: ShellHandle, store: Store, config: PainelConfig): CardsHandle {
  const http = new FetchHttpClient(config.relayBase);
  const route = config.sourceRoute;
  const states: Record<string, CardState<unknown>> = {};
  const weather = mountWeatherCard();
  const news = mountNewsCard();
  const quotes = mountQuotesCard();
  const psn = mountPsnCard();
  shell.setCard(WEATHER_SLOT, weather.el);
  shell.setCard(NEWS_SLOT, news.el);
  shell.setCard(QUOTES_SLOT, quotes.el);
  shell.setCard(PSN_SLOT, psn.el);

  const bind = <T>(source: DataSource<T>, apply: (s: CardState<T>) => void): Binding<unknown> => ({
    source,
    onState(s: CardState<T>) {
      states[source.key] = s;
      apply(s);
    },
  });
  const bindings = [
    bind(createWeatherSource(http, route.weather, config.weather), (s) => {
      weather.update(s);
      if (s.status === 'ok' || s.status === 'stale') shell.status.setTemp(s.data.nowTemp);
    }),
    bind(createNewsSource(http, route.news, config.news), news.update),
    bind(createQuotesSource(http, route.quotes), quotes.update),
    bind(
      createPsnSource({
        fetchFn: (url, init) => fetch(url, init),
        store,
        refreshToken: config.psnRefreshToken,
        now: () => Date.now(),
      }),
      psn.update,
    ),
  ];
  const scheduler = startScheduler(bindings, { store, now: () => Date.now() });

  const probe = async (): Promise<void> =>
    shell.status.setLatency(
      await measureLatency(
        () => http.head(LATENCY_URL),
        () => performance.now(),
      ),
    );
  void probe();
  setInterval(() => void probe(), LATENCY_REFRESH_MS);
  return {
    states,
    resume: () => {
      scheduler.refreshDue();
      void probe();
    },
  };
}
