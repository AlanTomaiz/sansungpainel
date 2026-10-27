import { describe, expect, it } from 'vitest';

import { conditionName, subtitle, summarizeForecast } from './forecast';

const endHour = (now: string): string | undefined =>
  summarizeForecast(hourly(), now).curve.slice(-1)[0]?.hour;

const hourly = (rainAt: number | null = null, code = 3) => {
  const time: string[] = [];
  for (let d = 27; d <= 28; d++)
    for (let h = 0; h < 24; h++) time.push(`2026-10-${d}T${String(h).padStart(2, '0')}:00`);
  return {
    time,
    temperature_2m: time.map((_, i) => 30 - (i % 24) / 2),
    precipitation_probability: time.map((_, i) => (i === rainAt ? 60 : 10)),
    weather_code: time.map(() => code),
  };
};

describe('summarizeForecast', () => {
  it('curva das 21h termina às 7h com rótulo Agora na primeira hora', () => {
    const s = summarizeForecast(hourly(), '2026-10-27T21:00');
    expect(s.curve[0]).toEqual({ hour: 'Agora', temp: 19.5 });
    expect(s.curve[s.curve.length - 1]?.hour).toBe('7h');
    expect(s.curve).toHaveLength(11);
    expect(s.nowTemp).toBe(19.5);
  });

  it('acha a primeira hora com chance >= 50%', () => {
    const s = summarizeForecast(hourly(24 + 3), '2026-10-27T21:00');
    expect(s.nextRain).toBe('chuva às 3h');
    expect(subtitle(s)).toBe('Nublado, chuva às 3h');
  });

  it('sem chuva prevista o subtítulo é só a condição', () => {
    const s = summarizeForecast(hourly(), '2026-10-27T21:00');
    expect(s.nextRain).toBeNull();
    expect(subtitle(s)).toBe('Nublado');
  });

  it('a curva termina no próximo 7h, com mínimo de 6h', () => {
    expect(endHour('2026-10-27T14:00')).toBe('7h');
    expect(summarizeForecast(hourly(), '2026-10-27T14:00').curve).toHaveLength(18);
    expect(endHour('2026-10-27T02:00')).toBe('8h');
    expect(endHour('2026-10-27T06:00')).toBe('12h');
  });

  it('chuva fora da janela da curva é ignorada', () => {
    expect(summarizeForecast(hourly(21 + 11), '2026-10-27T21:00').nextRain).toBeNull();
  });

  it('ignora chuva já passada', () => {
    const s = summarizeForecast(hourly(5), '2026-10-27T21:00');
    expect(s.nextRain).toBeNull();
  });
});

describe('conditionName', () => {
  it('traduz códigos WMO', () => {
    expect(conditionName(3)).toBe('Nublado');
    expect(conditionName(61)).toBe('Chuva');
    expect(conditionName(0)).toBe('Céu limpo');
    expect(conditionName(85)).toBe('Neve');
    expect(conditionName(95)).toBe('Tempestade');
  });
});
