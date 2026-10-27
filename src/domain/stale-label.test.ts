import { describe, expect, it } from 'vitest';

import { staleLabel } from './stale-label';

const now = new Date(2026, 9, 27, 18, 30).getTime();

describe('staleLabel', () => {
  it('hoje mostra só a hora', () => {
    expect(staleLabel(new Date(2026, 9, 27, 9, 5).getTime(), now)).toBe('atualizado às 09:05');
  });

  it('ontem mostra ontem e a hora', () => {
    expect(staleLabel(new Date(2026, 9, 26, 23, 59).getTime(), now)).toBe(
      'atualizado ontem às 23:59',
    );
  });

  it('antes de ontem mostra dia/mês e a hora', () => {
    expect(staleLabel(new Date(2026, 9, 5, 7, 8).getTime(), now)).toBe(
      'atualizado em 05/10 às 07:08',
    );
  });
});
