// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

import { LocalStore } from './local-store';

describe('LocalStore', () => {
  it('remove apaga a chave', () => {
    const store = new LocalStore();
    store.set('k', 1);
    expect(store.get('k')).toBe(1);
    store.remove('k');
    expect(store.get('k')).toBeNull();
  });
});
