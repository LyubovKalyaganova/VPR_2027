import { shuffleSeeded, type SeededRng } from '../features/mathematics/generators/seededRng';

export function pickDistinctPairs<T>(
  items: readonly T[],
  toPair: (item: T) => { left: string; right: string },
  rng: SeededRng,
  count = 3,
): Array<{ left: string; right: string }> {
  const shuffled = shuffleSeeded([...items], rng);
  const picked: Array<{ left: string; right: string }> = [];
  const usedRight = new Set<string>();
  const usedLeft = new Set<string>();
  for (const item of shuffled) {
    const pair = toPair(item);
    if (!pair.left.trim() || !pair.right.trim()) continue;
    if (usedRight.has(pair.right) || usedLeft.has(pair.left)) continue;
    picked.push(pair);
    usedRight.add(pair.right);
    usedLeft.add(pair.left);
    if (picked.length >= count) break;
  }
  if (picked.length < Math.min(2, count)) {
    throw new Error('Недостаточно уникальных пар для сопоставления');
  }
  return picked;
}

export function buildUniqueMatching(
  pairs: Array<{ left: string; right: string }>,
  rng: SeededRng,
): {
  matchingLeft: string[];
  matchingRight: string[];
  correctAnswer: string[];
} {
  const unique: Array<{ left: string; right: string }> = [];
  const usedRight = new Set<string>();
  const usedLeft = new Set<string>();
  for (const pair of pairs) {
    if (usedRight.has(pair.right) || usedLeft.has(pair.left)) continue;
    unique.push(pair);
    usedRight.add(pair.right);
    usedLeft.add(pair.left);
  }
  if (unique.length < 2) {
    throw new Error('В вариантах сопоставления повторяются ответы');
  }
  return {
    matchingLeft: unique.map((pair) => pair.left),
    matchingRight: shuffleSeeded(
      unique.map((pair) => pair.right),
      rng,
    ),
    correctAnswer: unique.map((pair) => `${pair.left}|${pair.right}`),
  };
}
