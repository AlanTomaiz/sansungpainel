import type { DataSource } from '@/application/refresh-card';
import type { PainelConfig, SourceRoute } from '@/domain/config';
import { conditionName, type Forecast, type Hourly, summarizeForecast } from '@/domain/forecast';
import type { HttpClient } from '@/infrastructure/http/http-client';

const TTL_MS = 30 * 60 * 1000;

interface Raw {
  current?: { time: string; temperature_2m: number; weather_code: number };
  hourly?: Hourly;
}

export function buildWeatherUrl(w: PainelConfig['weather']): string {
  return (
    `https://api.open-meteo.com/v1/forecast?latitude=${w.lat}&longitude=${w.lon}` +
    '&current=temperature_2m,weather_code' +
    '&hourly=temperature_2m,precipitation_probability,weather_code' +
    `&timezone=${encodeURIComponent(w.tz)}&forecast_days=2`
  );
}

export function parseOpenMeteo(text: string): Forecast {
  const raw = JSON.parse(text) as Raw;
  if (!raw.hourly || !raw.current) throw new Error('previsão inválida');
  const nowHour = `${raw.current.time.slice(0, 13)}:00`;
  const f = summarizeForecast(raw.hourly, nowHour);
  const { temperature_2m: temp, weather_code: code } = raw.current;
  const curve = f.curve.map((c, i) => (i === 0 ? { ...c, temp } : c));
  return { ...f, nowTemp: temp, code, condition: conditionName(code), curve };
}

export function createWeatherSource(
  http: HttpClient,
  route: SourceRoute,
  weather: PainelConfig['weather'],
): DataSource<Forecast> {
  return {
    key: 'weather',
    ttlMs: TTL_MS,
    fetch: async () => parseOpenMeteo(await http.getText(buildWeatherUrl(weather), route)),
  };
}
