// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

import { mountCardFrame } from './card-frame';

describe('mountCardFrame', () => {
  it('ok mostra o dado e stale acrescenta a hora', () => {
    const f = mountCardFrame('T');
    const render = (n: number): void => {
      f.body.append(`dado ${n}`);
    };
    f.setState({ status: 'ok', data: 1, updatedAt: 0 }, render);
    expect(f.body.textContent).toBe('dado 1');
    const at = new Date().setHours(9, 5, 0, 0);
    f.setState({ status: 'stale', data: 2, updatedAt: at, reason: 'Sem conexão' }, render);
    expect(f.body.textContent).toBe('dado 2Sem conexão · atualizado às 09:05');
  });

  it('stale de outro dia mostra a data', () => {
    const f = mountCardFrame('T');
    const at = new Date(2026, 0, 1, 9, 5).getTime();
    f.setState({ status: 'stale', data: 1, updatedAt: at, reason: 'Sem conexão' }, () => undefined);
    expect(f.body.textContent).toBe('Sem conexão · atualizado em 01/01 às 09:05');
  });

  it('unavailable mostra o motivo e sem dado', () => {
    const f = mountCardFrame('T', 'x');
    f.setState({ status: 'unavailable', reason: 'Sem conexão' }, () => {
      throw new Error('não deve renderizar');
    });
    expect(f.body.textContent).toBe('Sem conexão');
    expect(f.el.classList.contains('tc')).toBe(true);
    expect(f.el.querySelector('small')?.textContent).toBe('x');
  });
});
