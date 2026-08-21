export function normalizeText(
  value: string,
  options?: { equateYeYo?: boolean; stripEdges?: boolean },
): string {
  const equateYeYo = options?.equateYeYo ?? true;
  const stripEdges = options?.stripEdges ?? true;

  let normalized = value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('ru-RU');

  if (equateYeYo) {
    normalized = normalized.replaceAll('ё', 'е');
  }

  if (stripEdges) {
    normalized = normalized.replace(/^[«»"'“”]+|[«»"'“”.!?…]+$/g, '').trim();
  }

  return normalized;
}

export function textsEqual(left: string, right: string, equateYeYo = true): boolean {
  return normalizeText(left, { equateYeYo }) === normalizeText(right, { equateYeYo });
}

export function parseUserNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value !== 'string') {
    return null;
  }
  const cleaned = value.trim().replace(/\s+/g, '').replace(',', '.');
  if (!cleaned || !/^[+-]?\d+(\.\d+)?$/.test(cleaned)) {
    return null;
  }
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}
