/**
 * Воспроизводимый ГПСЧ для математических генераторов.
 * Не использует Math.random, чтобы одна и та же серия seed давала те же задания.
 */
export type SeededRng = () => number;

export function createSeededRng(seed: number): SeededRng {
  let state = seed >>> 0;
  if (state === 0) {
    state = 0x9e3779b9;
  }
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

export function randomInt(rng: SeededRng, min: number, max: number): number {
  if (max < min) {
    throw new Error(`randomInt: max (${max}) меньше min (${min})`);
  }
  return min + Math.floor(rng() * (max - min + 1));
}

export function pickOne<T>(rng: SeededRng, items: readonly T[]): T {
  if (items.length === 0) {
    throw new Error('pickOne: пустой список');
  }
  return items[randomInt(rng, 0, items.length - 1)] as T;
}

export function shuffleSeeded<T>(items: readonly T[], rng: SeededRng): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = randomInt(rng, 0, i);
    const current = copy[i] as T;
    copy[i] = copy[j] as T;
    copy[j] = current;
  }
  return copy;
}
