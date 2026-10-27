const SAMPLES = 3;

export async function measureLatency(
  head: () => Promise<void>,
  now: () => number,
): Promise<number | null> {
  try {
    let total = 0;
    for (let i = 0; i < SAMPLES; i++) {
      const start = now();
      await head();
      total += now() - start;
    }
    return total / SAMPLES;
  } catch {
    return null;
  }
}
