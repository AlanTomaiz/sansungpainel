import { describe, expect, it } from 'vitest';

import { tizenEnv } from './tizen-env.mjs';

describe('tizenEnv', () => {
  it('prefixa o PATH com as pastas do Tizen Studio', () => {
    const env = tizenEnv({ PATH: '/usr/bin', X: '1' }, '/h');
    expect(env.PATH).toBe('/h/tizen-studio/tools/ide/bin:/h/tizen-studio/tools:/usr/bin');
    expect(env.X).toBe('1');
  });
});
