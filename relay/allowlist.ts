const ALLOWED_HOSTS = new Set(['api.open-meteo.com', 'economia.awesomeapi.com.br', 'g1.globo.com']);

export function isAllowed(rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl);
    return url.protocol === 'https:' && url.port === '' && ALLOWED_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}
