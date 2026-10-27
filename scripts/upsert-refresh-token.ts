export function upsertRefreshToken(content: string, token: string): string {
  const config = JSON.parse(content) as Record<string, unknown>;
  return `${JSON.stringify({ ...config, psnRefreshToken: token }, null, 2)}\n`;
}
