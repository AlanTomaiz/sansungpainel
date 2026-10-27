export interface PsnTokens {
  access: string;
  refresh: string;
  expiresAt: number;
}

export type FetchFn = (input: string, init?: RequestInit) => Promise<Response>;

const CLIENT_ID = '09515159-7237-4370-9b40-3806e67c0891';
const BASIC = 'Basic MDk1MTUxNTktNzIzNy00MzcwLTliNDAtMzgwNmU2N2MwODkxOnVjUGprYTV0bnRCMktxc1A=';
const REDIRECT_URI = 'com.scee.psxandroid.scecompcall://redirect';
const BASE = 'https://ca.account.sony.com/api/authz/v3/oauth';
const AUTHORIZE_URL =
  `${BASE}/authorize?access_type=offline&client_id=${CLIENT_ID}` +
  '&redirect_uri=com.scee.psxandroid.scecompcall%3A%2F%2Fredirect&response_type=code' +
  '&scope=psn%3Amobile.v2.core%20psn%3Aclientapp';

export const sonySignal = (): AbortSignal => AbortSignal.timeout(6000);

const defaultFetch: FetchFn = (input, init) => fetch(input, init);

async function requestTokens(
  form: Record<string, string>,
  fetchFn: FetchFn,
  now: () => number,
): Promise<PsnTokens> {
  const res = await fetchFn(`${BASE}/token`, {
    method: 'POST',
    headers: { Authorization: BASIC, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ ...form, token_format: 'jwt' }).toString(),
    signal: sonySignal(),
  });
  if (res.status === 400 || res.status === 401) throw new Error('npsso-expired');
  if (!res.ok) throw new Error('psn-unavailable');
  const data = (await res.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };
  return {
    access: data.access_token,
    refresh: data.refresh_token,
    expiresAt: now() + data.expires_in * 1000,
  };
}

export async function exchangeNpsso(
  npsso: string,
  fetchFn: FetchFn = defaultFetch,
  now: () => number = Date.now,
): Promise<PsnTokens> {
  const res = await fetchFn(AUTHORIZE_URL, {
    headers: { Cookie: `npsso=${npsso}` },
    redirect: 'manual',
    signal: sonySignal(),
  });
  const code = /[?&]code=([^&]+)/.exec(res.headers.get('location') ?? '')?.[1];
  if (!code) throw new Error('npsso-expired');
  return requestTokens(
    { code, redirect_uri: REDIRECT_URI, grant_type: 'authorization_code' },
    fetchFn,
    now,
  );
}
