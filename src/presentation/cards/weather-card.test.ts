// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

import type { Forecast } from '@/domain/forecast';

import { curvePath, mountWeatherCard } from './weather-card';

const forecast: Forecast = {
  nowTemp: 24.4,
  code: 61,
  condition: 'Chuva',
  nextRain: 'chuva às 3h',
  curve: Array.from({ length: 11 }, (_, i) => ({
    hour: i === 0 ? 'Agora' : `${(21 + i) % 24}h`,
    temp: 20 + i,
  })),
};

describe('weather card', () => {
  it('mostra temperatura, subtítulo, curva e cinco rótulos', () => {
    const card = mountWeatherCard();
    card.update({ status: 'ok', updatedAt: 0, data: forecast });
    expect(card.el.querySelector('.tbig')?.textContent).toBe('24°');
    expect(card.el.querySelector('.tsub')?.textContent).toBe('Chuva, chuva às 3h');
    expect(card.el.querySelector('.tbig svg')).not.toBeNull();
    expect(card.el.querySelector('.curve path')?.getAttribute('stroke')).toBe('#f2b33d');
    const labels = Array.from(card.el.querySelectorAll('.hours span')).map((n) => n.textContent);
    expect(labels).toEqual(['Agora', '0h', '2h', '5h', '7h']);
  });

  it('curvePath gera uma curva dentro do viewBox', () => {
    const d = curvePath([20, 25, 22]);
    expect(d.startsWith('M0,')).toBe(true);
    expect(curvePath([20, 20])).toMatch(/^M0,15/);
  });
});
