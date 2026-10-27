import { createInterface } from 'node:readline';
import { Writable } from 'node:stream';

export function readHiddenLine(label = 'Cole o NPSSO e tecle Enter: ') {
  process.stderr.write(label);
  const muted = new Writable({ write: (_chunk, _enc, done) => done() });
  const rl = createInterface({
    input: process.stdin,
    output: muted,
    terminal: process.stdin.isTTY,
  });
  return new Promise((resolve) => {
    rl.once('line', (line) => {
      rl.close();
      process.stderr.write('\n');
      resolve(line);
    });
    rl.once('close', () => resolve(''));
  });
}
