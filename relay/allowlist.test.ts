import { describe, expect, it } from 'vitest';

import { isAllowed } from './allowlist.ts';

describe('isAllowed', () => {
  it('accepts allowlisted hosts', () => {
    expect(isAllowed('https://api.open-meteo.com/v1/forecast?x=1')).toBe(true);
    expect(isAllowed('https://g1.globo.com/rss/g1/')).toBe(true);
  });

  it('rejects other hosts, lookalikes and invalid urls', () => {
    expect(isAllowed('https://evil.example')).toBe(false);
    expect(isAllowed('https://g1.globo.com.evil.example/x')).toBe(false);
    expect(isAllowed('not a url')).toBe(false);
    expect(isAllowed('file:///etc/passwd')).toBe(false);
    expect(isAllowed('http://g1.globo.com/x')).toBe(false);
    expect(isAllowed('https://g1.globo.com:22/x')).toBe(false);
  });
});
