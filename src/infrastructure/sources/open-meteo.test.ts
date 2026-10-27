import { describe, expect, it } from 'vitest';

import { buildWeatherUrl, parseOpenMeteo } from './open-meteo';

const time = Array.from({ length: 48 }, (_, i) => {
  const d = 27 + Math.floor(i / 24);
  return `2026-10-${d}T${String(i % 24).padStart(2, '0')}:00`;
});

const body = JSON.stringify({
  current: { time: '2026-10-27T21:15', temperature_2m: 22.4, weather_code: 61 },
  hourly: {
    time,
    temperature_2m: time.map(() => 20),
    precipitation_probability: time.map(() => 0),
    weather_code: time.map(() => 3),
  },
});

describe('open-meteo', () => {
  it('usa current.time (arredondado à hora) e current.temperature_2m', () => {
    const f = parseOpenMeteo(body);
    expect(f.nowTemp).toBe(22.4);
    expect(f.condition).toBe('Chuva');
    expect(f.curve[0]?.temp).toBe(22.4);
    expect(f.curve[f.curve.length - 1]?.hour).toBe('7h');
  });

  it('rejeita resposta sem hourly', () => {
    expect(() => parseOpenMeteo('{"current":{}}')).toThrow();
  });

  it('monta a URL com coordenadas e fuso', () => {
    const url = buildWeatherUrl({
      city: 'x',
      lat: -23.4205,
      lon: -51.9333,
      tz: 'America/Sao_Paulo',
    });
    expect(url).toContain('latitude=-23.4205&longitude=-51.9333');
    expect(url).toContain('timezone=America%2FSao_Paulo&forecast_days=2');
  });
});
