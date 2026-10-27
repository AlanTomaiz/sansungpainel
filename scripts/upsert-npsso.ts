const LINE = /^PSN_NPSSO=.*$/m;

export function upsertNpsso(content: string, npsso: string): string {
  const line = `PSN_NPSSO=${npsso}`;
  if (LINE.test(content)) return content.replace(LINE, () => line);
  const separator = content === '' || content.endsWith('\n') ? '' : '\n';
  return `${content}${separator}${line}\n`;
}
