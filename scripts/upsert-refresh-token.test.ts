import { describe, expect, it } from 'vitest';

import { upsertRefreshToken } from './upsert-refresh-token.ts';

describe('upsertRefreshToken', () => {
  it('define o campo preservando as demais chaves', () => {
    const out = upsertRefreshToken('{"relayBase":null,"psnRefreshToken":null}', 'fake-rt');
    expect(JSON.parse(out)).toEqual({ relayBase: null, psnRefreshToken: 'fake-rt' });
  });
  it('acrescenta o campo quando não existe e termina com quebra de linha', () => {
    const out = upsertRefreshToken('{"a":1}', 'fake-rt');
    expect(JSON.parse(out)).toEqual({ a: 1, psnRefreshToken: 'fake-rt' });
    expect(out.endsWith('\n')).toBe(true);
  });
});
