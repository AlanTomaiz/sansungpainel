import { homedir } from 'node:os';
import { join } from 'node:path';

export function tizenEnv(base = process.env, home = homedir()) {
  const tizenPath = [join(home, 'tizen-studio/tools/ide/bin'), join(home, 'tizen-studio/tools')];
  return { ...base, PATH: [...tizenPath, base.PATH].join(':') };
}

export const env = tizenEnv();
