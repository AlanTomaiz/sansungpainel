import { describe, expect, it, vi } from 'vitest';

import { exchangeNpsso } from './psn-auth.ts';

const REDIRECT = 'com.scee.psxandroid.scecompcall://redirect/?code=v3.ABC&cid=x';

const tokenBody = { access_token: 'AT', refresh_token: 'RT', expires_in: 3600 };

describe('exchangeNpsso', () => {
  it('extracts the code from the redirect and returns tokens', async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 302, headers: { location: REDIRECT } }))
      .mockResolvedValueOnce(new Response(JSON.stringify(tokenBody), { status: 200 }));

    const tokens = await exchangeNpsso('NPSSO', fetchFn, () => 1000);

    expect(tokens).toEqual({ access: 'AT', refresh: 'RT', expiresAt: 1000 + 3600_000 });
    const [authUrl, authInit] = fetchFn.mock.calls[0] as [string, RequestInit];
    expect(authUrl).toContain('client_id=09515159-7237-4370-9b40-3806e67c0891');
    expect(authInit.redirect).toBe('manual');
    expect(authInit.headers).toMatchObject({ Cookie: 'npsso=NPSSO' });
    const [tokenUrl, tokenInit] = fetchFn.mock.calls[1] as [string, RequestInit];
    expect(tokenUrl).toBe('https://ca.account.sony.com/api/authz/v3/oauth/token');
    expect(tokenInit.method).toBe('POST');
    expect(tokenInit.headers).toMatchObject({
      Authorization:
        'Basic MDk1MTUxNTktNzIzNy00MzcwLTliNDAtMzgwNmU2N2MwODkxOnVjUGprYTV0bnRCMktxc1A=',
    });
    expect(authInit.signal).toBeInstanceOf(AbortSignal);
    expect(tokenInit.signal).toBeInstanceOf(AbortSignal);
    const form = new URLSearchParams(tokenInit.body as string);
    expect(form.get('code')).toBe('v3.ABC');
    expect(form.get('grant_type')).toBe('authorization_code');
    expect(form.get('token_format')).toBe('jwt');
    expect(form.get('redirect_uri')).toBe('com.scee.psxandroid.scecompcall://redirect');
  });

  it('throws npsso-expired on a redirect without code', async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      new Response(null, {
        status: 302,
        headers: { location: 'https://ca.account.sony.com/login' },
      }),
    );

    await expect(exchangeNpsso('NPSSO', fetchFn)).rejects.toThrow('npsso-expired');
  });
});
