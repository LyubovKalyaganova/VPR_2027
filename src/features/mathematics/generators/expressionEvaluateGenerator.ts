/**
 * Генератор M08: вычисление значения числового выражения (порядок действий).
 * Контракт: M08_GENERATOR_SPEC.md
 * Педагогические границы: CONTENT_MATRIX_MATH.md, карточка M08.
 */
import type { Difficulty, Task } from '../../../types';
import { createSeededRng, pickOne, randomInt, shuffleSeeded, type SeededRng } from './seededRng';

export const M08_SKILL_ID = 'math.order_of_operations.expressions.evaluate' as const;
export const M08_TOPIC_ID = 'math.order_of_operations.expressions' as const;
export const M08_GENERATOR_ID = 'gen.math.order_of_operations.evaluate' as const;

export type ExpressionOp = '+' | '-' | '×' | ':';

export type ExpressionToken =
  | { kind: 'num'; value: number }
  | { kind: 'op'; op: ExpressionOp }
  | { kind: 'lparen' }
  | { kind: 'rparen' };

export type ExpressionSubtype =
  | 'same_priority_add_sub'
  | 'same_priority_mul_div'
  | 'mixed_no_parens'
  | 'with_parens';

export type ExpressionFeature =
  | 'two_ops'
  | 'three_ops'
  | 'four_ops'
  | 'has_multiplication'
  | 'has_division'
  | 'has_addition'
  | 'has_subtraction'
  | 'left_to_right_trap'
  | 'parens_change_value'
  | 'exact_division';

export type PriorityClass = 'same_add_sub' | 'same_mul_div' | 'mixed';

export type M08GenerateOptions = {
  difficulty: Difficulty;
  seed: number;
  subtype?: ExpressionSubtype;
};

export type M08SeriesOptions = {
  seed: number;
  countPerLevel?: number;
};

export type M08GeneratorParams = {
  expression: string;
  tokens: ExpressionToken[];
  opsCount: number;
  hasParens: boolean;
  priorities: PriorityClass;
  subtype: ExpressionSubtype;
  features: ExpressionFeature[];
  value: number;
  seed: number;
};

const SUBTYPE_TITLES: Record<ExpressionSubtype, string> = {
  same_priority_add_sub: 'Выражение только со сложением и вычитанием',
  same_priority_mul_div: 'Выражение только с умножением и делением',
  mixed_no_parens: 'Смешанный приоритет без скобок',
  with_parens: 'Выражение со скобками',
};

const L1_SUBTYPES: ExpressionSubtype[] = ['same_priority_add_sub', 'same_priority_mul_div'];
const L2_SUBTYPES: ExpressionSubtype[] = ['mixed_no_parens'];
const L3_SUBTYPES: ExpressionSubtype[] = ['with_parens'];

const MAX_ATTEMPTS = 160;

function isHigh(op: ExpressionOp): boolean {
  return op === '×' || op === ':';
}

function isLow(op: ExpressionOp): boolean {
  return op === '+' || op === '-';
}

export function formatExpression(tokens: readonly ExpressionToken[]): string {
  return tokens
    .map((token) => {
      if (token.kind === 'num') {
        return String(token.value);
      }
      if (token.kind === 'op') {
        return token.op;
      }
      if (token.kind === 'lparen') {
        return '(';
      }
      return ')';
    })
    .join(' ')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .replace(/\(\s*/g, '(')
    .replace(/\s*\)/g, ')');
}

function applyOp(left: number, op: ExpressionOp, right: number): number | null {
  if (op === '+') {
    return left + right;
  }
  if (op === '-') {
    return left - right;
  }
  if (op === '×') {
    return left * right;
  }
  if (right === 0 || left % right !== 0) {
    return null;
  }
  return left / right;
}

/** Независимое вычисление с приоритетом и скобками. */
export function evaluateExpression(tokens: readonly ExpressionToken[]): number | null {
  let index = 0;

  function peek(): ExpressionToken | undefined {
    return tokens[index];
  }

  function consume(): ExpressionToken {
    const token = tokens[index];
    if (!token) {
      throw new Error('M08: неожиданный конец выражения');
    }
    index += 1;
    return token;
  }

  function parsePrimary(): number | null {
    const token = peek();
    if (!token) {
      return null;
    }
    if (token.kind === 'num') {
      consume();
      return token.value;
    }
    if (token.kind === 'lparen') {
      consume();
      const inner = parseExpr();
      const close = peek();
      if (!close || close.kind !== 'rparen') {
        return null;
      }
      consume();
      return inner;
    }
    return null;
  }

  function parseTerm(): number | null {
    let value = parsePrimary();
    if (value === null) {
      return null;
    }
    while (true) {
      const token = peek();
      if (!token || token.kind !== 'op' || !isHigh(token.op)) {
        break;
      }
      const op = token.op;
      consume();
      const right = parsePrimary();
      if (right === null) {
        return null;
      }
      const next = applyOp(value, op, right);
      if (next === null) {
        return null;
      }
      value = next;
    }
    return value;
  }

  function parseExpr(): number | null {
    let value = parseTerm();
    if (value === null) {
      return null;
    }
    while (true) {
      const token = peek();
      if (!token || token.kind !== 'op' || !isLow(token.op)) {
        break;
      }
      const op = token.op;
      consume();
      const right = parseTerm();
      if (right === null) {
        return null;
      }
      const next = applyOp(value, op, right);
      if (next === null) {
        return null;
      }
      value = next;
    }
    return value;
  }

  try {
    const value = parseExpr();
    if (value === null || index !== tokens.length) {
      return null;
    }
    if (!Number.isInteger(value) || value <= 0) {
      return null;
    }
    return value;
  } catch {
    return null;
  }
}

/** Все действия строго слева направо, скобки игнорируются как группировка (снимаются). */
export function evaluateLeftToRight(tokens: readonly ExpressionToken[]): number | null {
  const flat = tokens.filter((token) => token.kind === 'num' || token.kind === 'op') as Array<
    { kind: 'num'; value: number } | { kind: 'op'; op: ExpressionOp }
  >;
  if (flat.length < 3 || flat[0]?.kind !== 'num') {
    return null;
  }
  let value = flat[0].value;
  for (let index = 1; index < flat.length; index += 2) {
    const opToken = flat[index];
    const numToken = flat[index + 1];
    if (!opToken || opToken.kind !== 'op' || !numToken || numToken.kind !== 'num') {
      return null;
    }
    const next = applyOp(value, opToken.op, numToken.value);
    if (next === null || next <= 0 || !Number.isInteger(next)) {
      return null;
    }
    value = next;
  }
  return value;
}

/** Скобки сняты, далее обычный приоритет. */
export function evaluateIgnoringParens(tokens: readonly ExpressionToken[]): number | null {
  const stripped = tokens.filter((token) => token.kind !== 'lparen' && token.kind !== 'rparen');
  return evaluateExpression(stripped);
}

/** Сначала все +/− слева направо по «низким» связкам наивно — упрощённая модель путаницы. */
export function evaluateAddFirst(tokens: readonly ExpressionToken[]): number | null {
  // Модель: выполнить все низкоприоритетные операции до высокоприоритетных,
  // идя слева направо по плоскому списку без скобок.
  const flat = tokens.filter((token) => token.kind === 'num' || token.kind === 'op') as Array<
    { kind: 'num'; value: number } | { kind: 'op'; op: ExpressionOp }
  >;
  if (flat.length < 3) {
    return null;
  }
  const values: number[] = [];
  const ops: ExpressionOp[] = [];
  for (const token of flat) {
    if (token.kind === 'num') {
      values.push(token.value);
    } else {
      ops.push(token.op);
    }
  }
  if (values.length !== ops.length + 1) {
    return null;
  }

  // Сначала свернуть все low-ops
  let changed = true;
  while (changed) {
    changed = false;
    for (let index = 0; index < ops.length; index += 1) {
      const op = ops[index];
      if (!op || !isLow(op)) {
        continue;
      }
      const left = values[index];
      const right = values[index + 1];
      if (left === undefined || right === undefined) {
        return null;
      }
      const next = applyOp(left, op, right);
      if (next === null || next <= 0 || !Number.isInteger(next)) {
        return null;
      }
      values.splice(index, 2, next);
      ops.splice(index, 1);
      changed = true;
      break;
    }
  }

  // Затем high-ops слева направо
  while (ops.length > 0) {
    const op = ops[0];
    const left = values[0];
    const right = values[1];
    if (!op || left === undefined || right === undefined) {
      return null;
    }
    const next = applyOp(left, op, right);
    if (next === null || next <= 0 || !Number.isInteger(next)) {
      return null;
    }
    values.splice(0, 2, next);
    ops.splice(0, 1);
  }

  const result = values[0];
  return result !== undefined && result > 0 && Number.isInteger(result) ? result : null;
}

export function countOps(tokens: readonly ExpressionToken[]): number {
  return tokens.filter((token) => token.kind === 'op').length;
}

export function hasParens(tokens: readonly ExpressionToken[]): boolean {
  return tokens.some((token) => token.kind === 'lparen');
}

export function collectOps(tokens: readonly ExpressionToken[]): ExpressionOp[] {
  return tokens.filter((token): token is { kind: 'op'; op: ExpressionOp } => token.kind === 'op').map((token) => token.op);
}

export function classifyPriorities(tokens: readonly ExpressionToken[]): PriorityClass | null {
  const ops = collectOps(tokens);
  if (ops.length === 0) {
    return null;
  }
  const highs = ops.some(isHigh);
  const lows = ops.some(isLow);
  if (highs && lows) {
    return 'mixed';
  }
  if (lows && !highs) {
    return 'same_add_sub';
  }
  if (highs && !lows) {
    return 'same_mul_div';
  }
  return null;
}

export function expressionFingerprint(tokens: readonly ExpressionToken[]): string {
  return formatExpression(tokens);
}

function num(value: number): ExpressionToken {
  return { kind: 'num', value };
}

function op(value: ExpressionOp): ExpressionToken {
  return { kind: 'op', op: value };
}

const LP: ExpressionToken = { kind: 'lparen' };
const RP: ExpressionToken = { kind: 'rparen' };

function tokensOf(...parts: Array<number | ExpressionOp | 'LP' | 'RP'>): ExpressionToken[] {
  return parts.map((part) => {
    if (part === 'LP') {
      return LP;
    }
    if (part === 'RP') {
      return RP;
    }
    if (typeof part === 'number') {
      return num(part);
    }
    return op(part);
  });
}

export function isValidM08Level(tokens: readonly ExpressionToken[], difficulty: 1 | 2 | 3): boolean {
  const value = evaluateExpression(tokens);
  if (value === null || value <= 0) {
    return false;
  }
  const opsCount = countOps(tokens);
  const parens = hasParens(tokens);
  const priorities = classifyPriorities(tokens);
  if (!priorities || opsCount < 2) {
    return false;
  }

  if (difficulty === 1) {
    if (parens || priorities === 'mixed') {
      return false;
    }
    if (opsCount < 2 || opsCount > 3) {
      return false;
    }
    return priorities === 'same_add_sub' || priorities === 'same_mul_div';
  }

  if (difficulty === 2) {
    if (parens || priorities !== 'mixed') {
      return false;
    }
    return opsCount === 2 || opsCount === 3;
  }

  // L3
  if (!parens || opsCount < 3 || opsCount > 4) {
    return false;
  }
  const ignored = evaluateIgnoringParens(tokens);
  const ltr = evaluateLeftToRight(tokens);
  const ignoreDiffers = ignored !== null && ignored !== value;
  const ltrDiffers = ltr !== null && ltr !== value;
  // Скобки содержательны: хотя бы одна типичная ошибка порядка даёт другой положительный ответ.
  if (!ignoreDiffers && !ltrDiffers) {
    return false;
  }
  return true;
}

function isTooEasyForLevel(tokens: readonly ExpressionToken[], difficulty: 1 | 2 | 3): boolean {
  if (difficulty === 2) {
    return isValidM08Level(tokens, 1);
  }
  if (difficulty === 3) {
    return isValidM08Level(tokens, 1) || isValidM08Level(tokens, 2);
  }
  return false;
}

function subtypeFits(subtype: ExpressionSubtype, tokens: readonly ExpressionToken[]): boolean {
  const priorities = classifyPriorities(tokens);
  const parens = hasParens(tokens);
  switch (subtype) {
    case 'same_priority_add_sub':
      return !parens && priorities === 'same_add_sub';
    case 'same_priority_mul_div':
      return !parens && priorities === 'same_mul_div';
    case 'mixed_no_parens':
      return !parens && priorities === 'mixed';
    case 'with_parens':
      return parens;
  }
}

export function collectFeatures(tokens: readonly ExpressionToken[]): ExpressionFeature[] {
  const features: ExpressionFeature[] = [];
  const opsCount = countOps(tokens);
  if (opsCount === 2) {
    features.push('two_ops');
  }
  if (opsCount === 3) {
    features.push('three_ops');
  }
  if (opsCount === 4) {
    features.push('four_ops');
  }
  const ops = collectOps(tokens);
  if (ops.includes('×')) {
    features.push('has_multiplication');
  }
  if (ops.includes(':')) {
    features.push('has_division');
  }
  if (ops.includes('+')) {
    features.push('has_addition');
  }
  if (ops.includes('-')) {
    features.push('has_subtraction');
  }
  if (ops.includes(':')) {
    features.push('exact_division');
  }
  const value = evaluateExpression(tokens);
  const ltr = evaluateLeftToRight(tokens);
  if (value !== null && ltr !== null && ltr !== value) {
    features.push('left_to_right_trap');
  }
  if (hasParens(tokens)) {
    const ignored = evaluateIgnoringParens(tokens);
    if (value !== null && ignored !== null && ignored !== value) {
      features.push('parens_change_value');
    }
  }
  return features;
}

function allowedSubtypes(difficulty: 1 | 2 | 3): ExpressionSubtype[] {
  if (difficulty === 1) {
    return L1_SUBTYPES;
  }
  if (difficulty === 2) {
    return L2_SUBTYPES;
  }
  return L3_SUBTYPES;
}

function resolveSubtype(
  difficulty: 1 | 2 | 3,
  requested: ExpressionSubtype | undefined,
  rng: SeededRng,
): ExpressionSubtype {
  const allowed = allowedSubtypes(difficulty);
  if (requested && allowed.includes(requested)) {
    return requested;
  }
  if (difficulty === 1) {
    return pickOne(rng, ['same_priority_add_sub', 'same_priority_add_sub', 'same_priority_mul_div']);
  }
  if (difficulty === 2) {
    return 'mixed_no_parens';
  }
  return 'with_parens';
}

function smallAddend(rng: SeededRng): number {
  return randomInt(rng, 2, 24);
}

function tableDigit(rng: SeededRng): number {
  return randomInt(rng, 2, 9);
}

function buildL1AddSub(rng: SeededRng): ExpressionToken[] | null {
  const threeOps = pickOne(rng, [false, false, true]); // чаще 2 действия (3 числа)
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const a = smallAddend(rng);
    const b = smallAddend(rng);
    const c = smallAddend(rng);
    const op1: ExpressionOp = pickOne(rng, ['+', '-']);
    const op2: ExpressionOp = pickOne(rng, ['+', '-']);
    const tokens = threeOps
      ? tokensOf(a, op1, b, op2, c, pickOne(rng, ['+', '-']), smallAddend(rng))
      : tokensOf(a, op1, b, op2, c);
    // threeOps выше даёт 3 действия; иначе ровно 2.
    const value = evaluateExpression(tokens);
    if (value !== null && value > 0 && isValidM08Level(tokens, 1)) {
      return tokens;
    }
  }
  return null;
}

function buildL1MulDiv(rng: SeededRng): ExpressionToken[] | null {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (pickOne(rng, [true, false])) {
      const a = tableDigit(rng);
      const b = tableDigit(rng);
      const product = a * b;
      const divisors = [2, 3, 4, 5, 6, 7, 8, 9].filter(
        (d) => product % d === 0 && product / d >= 2 && product / d <= 81 && d !== a && d !== b,
      );
      if (divisors.length === 0) {
        continue;
      }
      const d = pickOne(rng, divisors);
      const tokens = tokensOf(a, '×', b, ':', d);
      const value = evaluateExpression(tokens);
      if (value !== null && value > 1 && isValidM08Level(tokens, 1)) {
        return tokens;
      }
    } else {
      const a = tableDigit(rng);
      const b = tableDigit(rng);
      const c = pickOne(rng, [2, 3, 4, 5]);
      if (a * b * c > 200) {
        continue;
      }
      const tokens = tokensOf(a, '×', b, '×', c);
      if (evaluateExpression(tokens) !== null && isValidM08Level(tokens, 1)) {
        return tokens;
      }
    }
  }
  const a = tableDigit(rng);
  const b = tableDigit(rng);
  const c = tableDigit(rng);
  if ((a * b) % c === 0 && c !== a && c !== b && a * b / c > 1) {
    return tokensOf(a, '×', b, ':', c);
  }
  return tokensOf(a, '×', b, '×', 2);
}

function buildL2Mixed(rng: SeededRng): ExpressionToken[] | null {
  const pattern = pickOne(rng, [
    'a+b×c',
    'a×b+c',
    'a×b−c',
    'a−b×c',
    'a+b×c−d',
    'a×b+c−d',
  ] as const);

  for (let attempt = 0; attempt < 50; attempt += 1) {
    let tokens: ExpressionToken[] | null = null;
    if (pattern === 'a+b×c') {
      const b = tableDigit(rng);
      const c = tableDigit(rng);
      const a = smallAddend(rng);
      tokens = tokensOf(a, '+', b, '×', c);
    } else if (pattern === 'a×b+c') {
      const a = tableDigit(rng);
      const b = tableDigit(rng);
      const c = smallAddend(rng);
      tokens = tokensOf(a, '×', b, '+', c);
    } else if (pattern === 'a×b−c') {
      const a = tableDigit(rng);
      const b = tableDigit(rng);
      const product = a * b;
      if (product <= 4) {
        continue;
      }
      const c = randomInt(rng, 2, Math.min(20, product - 1));
      tokens = tokensOf(a, '×', b, '-', c);
    } else if (pattern === 'a−b×c') {
      const b = tableDigit(rng);
      const c = tableDigit(rng);
      const product = b * c;
      const a = product + randomInt(rng, 2, 15);
      tokens = tokensOf(a, '-', b, '×', c);
    } else if (pattern === 'a+b×c−d') {
      const b = tableDigit(rng);
      const c = tableDigit(rng);
      const a = smallAddend(rng);
      const mid = a + b * c;
      const d = randomInt(rng, 1, Math.min(15, mid - 1));
      tokens = tokensOf(a, '+', b, '×', c, '-', d);
    } else {
      const a = tableDigit(rng);
      const b = tableDigit(rng);
      const c = smallAddend(rng);
      const mid = a * b + c;
      if (mid <= 2) {
        continue;
      }
      const d = randomInt(rng, 1, Math.min(12, mid - 1));
      tokens = tokensOf(a, '×', b, '+', c, '-', d);
    }

    if (!tokens) {
      continue;
    }
    const value = evaluateExpression(tokens);
    const ltr = evaluateLeftToRight(tokens);
    if (value === null || !isValidM08Level(tokens, 2)) {
      continue;
    }
    // Предпочитаем ловушку left-to-right, но не требуем всегда.
    if (ltr === value && pickOne(rng, [true, false, false])) {
      continue;
    }
    return tokens;
  }
  return null;
}

function buildL3Parens(rng: SeededRng): ExpressionToken[] | null {
  const pattern = pickOne(rng, [
    '(a+b)×c',
    '(a−b)×c',
    'a×(b+c)',
    'a×(b−c)',
    '(a+b)×c−d',
    'a+(b+c)×d',
    '(a+b)×c+d',
    'a×(b−c)+d',
    '(a−b)×c+d',
  ] as const);

  for (let attempt = 0; attempt < 60; attempt += 1) {
    let tokens: ExpressionToken[] | null = null;
    if (pattern === '(a+b)×c') {
      const a = smallAddend(rng);
      const b = smallAddend(rng);
      const c = tableDigit(rng);
      tokens = tokensOf('LP', a, '+', b, 'RP', '×', c);
    } else if (pattern === '(a−b)×c') {
      const b = smallAddend(rng);
      const a = b + randomInt(rng, 2, 12);
      const c = tableDigit(rng);
      tokens = tokensOf('LP', a, '-', b, 'RP', '×', c);
    } else if (pattern === 'a×(b+c)') {
      const a = tableDigit(rng);
      const b = smallAddend(rng);
      const c = smallAddend(rng);
      tokens = tokensOf(a, '×', 'LP', b, '+', c, 'RP');
    } else if (pattern === 'a×(b−c)') {
      const c = smallAddend(rng);
      const b = c + randomInt(rng, 2, 10);
      const a = tableDigit(rng);
      tokens = tokensOf(a, '×', 'LP', b, '-', c, 'RP');
    } else if (pattern === '(a+b)×c−d') {
      const a = smallAddend(rng);
      const b = smallAddend(rng);
      const c = tableDigit(rng);
      const product = (a + b) * c;
      if (product <= 3) {
        continue;
      }
      const d = randomInt(rng, 1, Math.min(20, product - 1));
      tokens = tokensOf('LP', a, '+', b, 'RP', '×', c, '-', d);
    } else if (pattern === 'a+(b+c)×d') {
      // Содержательные скобки: без них было бы a+b+c×d иначе; с (b+c)×d
      const b = smallAddend(rng);
      const c = smallAddend(rng);
      const d = tableDigit(rng);
      const a = smallAddend(rng);
      tokens = tokensOf(a, '+', 'LP', b, '+', c, 'RP', '×', d);
    } else if (pattern === 'a×(b−c)+d') {
      const c = smallAddend(rng);
      const b = c + randomInt(rng, 2, 10);
      const a = tableDigit(rng);
      const d = smallAddend(rng);
      tokens = tokensOf(a, '×', 'LP', b, '-', c, 'RP', '+', d);
    } else if (pattern === '(a−b)×c+d') {
      const b = smallAddend(rng);
      const a = b + randomInt(rng, 2, 12);
      const c = tableDigit(rng);
      const d = smallAddend(rng);
      tokens = tokensOf('LP', a, '-', b, 'RP', '×', c, '+', d);
    } else {
      const a = smallAddend(rng);
      const b = smallAddend(rng);
      const c = tableDigit(rng);
      const d = smallAddend(rng);
      tokens = tokensOf('LP', a, '+', b, 'RP', '×', c, '+', d);
    }

    if (!tokens || !isValidM08Level(tokens, 3) || isTooEasyForLevel(tokens, 3)) {
      continue;
    }
    return tokens;
  }
  return null;
}

function buildTokens(
  rng: SeededRng,
  difficulty: 1 | 2 | 3,
  subtype: ExpressionSubtype,
): ExpressionToken[] | null {
  if (difficulty === 1) {
    if (subtype === 'same_priority_mul_div') {
      return buildL1MulDiv(rng);
    }
    return buildL1AddSub(rng);
  }
  if (difficulty === 2) {
    return buildL2Mixed(rng);
  }
  return buildL3Parens(rng);
}

function firstOpOnly(tokens: readonly ExpressionToken[]): number | null {
  const flat = tokens.filter((token) => token.kind === 'num' || token.kind === 'op') as Array<
    { kind: 'num'; value: number } | { kind: 'op'; op: ExpressionOp }
  >;
  if (flat.length < 3 || flat[0]?.kind !== 'num' || flat[1]?.kind !== 'op' || flat[2]?.kind !== 'num') {
    return null;
  }
  return applyOp(flat[0].value, flat[1].op, flat[2].value);
}

function uniqueDistractors(tokens: readonly ExpressionToken[], correct: number, rng: SeededRng): string[] {
  const byKind: Record<string, number[]> = {
    left_to_right: [],
    ignore_parens: [],
    add_first: [],
    first_op_only: [],
    arith_slip: [],
  };

  const add = (kind: keyof typeof byKind, value: number | null) => {
    if (value === null || !Number.isInteger(value) || value <= 0 || value === correct) {
      return;
    }
    if (Math.abs(String(value).length - String(correct).length) > 1) {
      return;
    }
    if (value < Math.floor(correct * 0.25) && value !== firstOpOnly(tokens)) {
      return;
    }
    if (!byKind[kind].includes(value)) {
      byKind[kind].push(value);
    }
  };

  add('left_to_right', evaluateLeftToRight(tokens));
  if (hasParens(tokens)) {
    add('ignore_parens', evaluateIgnoringParens(tokens));
  }
  add('add_first', evaluateAddFirst(tokens));
  add('first_op_only', firstOpOnly(tokens));

  add('arith_slip', correct + 1);
  if (correct > 1) {
    add('arith_slip', correct - 1);
  }
  if (correct > 10) {
    add('arith_slip', correct + 10);
    add('arith_slip', correct - 10);
  }
  // соседний табличный сдвиг: если есть ×, слегка меняем множитель в модели add_first/ltr уже покрыто

  const unique: number[] = [];
  const kindOrder = ['left_to_right', 'ignore_parens', 'add_first', 'first_op_only', 'arith_slip'];
  for (const kind of kindOrder) {
    const pool = shuffleSeeded(byKind[kind] ?? [], rng);
    const chosen = pool.find((value) => !unique.includes(value));
    if (chosen !== undefined) {
      unique.push(chosen);
    }
    if (unique.length === 3) {
      break;
    }
  }
  for (const value of shuffleSeeded(Object.values(byKind).flat(), rng)) {
    if (unique.length === 3) {
      break;
    }
    if (!unique.includes(value)) {
      unique.push(value);
    }
  }
  return unique.slice(0, 3).map(String);
}

function buildExplanation(tokens: readonly ExpressionToken[], value: number): string {
  const expression = formatExpression(tokens);
  if (hasParens(tokens)) {
    return `Сначала действия в скобках, затем умножение и деление, потом сложение и вычитание. ${expression} = ${value}.`;
  }
  const priorities = classifyPriorities(tokens);
  if (priorities === 'mixed') {
    return `Сначала умножение и деление, затем сложение и вычитание слева направо. ${expression} = ${value}.`;
  }
  return `Действия одного приоритета выполняй слева направо. ${expression} = ${value}.`;
}

function buildHints(tokens: readonly ExpressionToken[], value: number): Pick<Task, 'hint1' | 'hint2' | 'hint3'> {
  return {
    hint1: 'Посмотри, есть ли скобки и операции разного приоритета.',
    hint2: 'Помни: × и : выполняют раньше, чем + и −. Действия одного приоритета — слева направо.',
    hint3: `${formatExpression(tokens)} = ${value}.`,
  };
}

function assertGeneratedM08(task: Task, expectedDifficulty: 1 | 2 | 3, requested: ExpressionSubtype): void {
  const params = task.generatorParams as M08GeneratorParams | undefined;
  if (!params || !Array.isArray(params.tokens)) {
    throw new Error('M08: нет generatorParams.tokens');
  }
  const computed = evaluateExpression(params.tokens);
  if (computed === null) {
    throw new Error('M08: выражение не вычисляется');
  }
  if (!isValidM08Level(params.tokens, expectedDifficulty)) {
    throw new Error(`M08: структура не соответствует L${expectedDifficulty}`);
  }
  if (isTooEasyForLevel(params.tokens, expectedDifficulty)) {
    throw new Error(`M08: слишком легко для L${expectedDifficulty}`);
  }
  if (!subtypeFits(requested, params.tokens)) {
    throw new Error(`M08: subtype ${requested} не соответствует выражению`);
  }
  if (Number(task.correctAnswer) !== computed && String(task.correctAnswer) !== String(computed)) {
    throw new Error('M08: correctAnswer не совпадает с пересчётом');
  }
  if (task.taskType === 'singleChoice') {
    const answers = task.answers ?? [];
    if (answers.length !== 4 || new Set(answers).size !== 4) {
      throw new Error('M08: нужны 4 уникальных варианта');
    }
    if (answers.filter((item) => item === String(computed)).length !== 1) {
      throw new Error('M08: должен быть ровно один правильный вариант');
    }
  }
}

function toTask(
  tokens: ExpressionToken[],
  difficulty: 1 | 2 | 3,
  seed: number,
  rng: SeededRng,
  requested: ExpressionSubtype,
): Task {
  const value = evaluateExpression(tokens);
  if (value === null) {
    throw new Error('M08: не удалось вычислить выражение');
  }
  const expression = formatExpression(tokens);
  const taskType = difficulty === 3 ? 'numberAnswer' : 'singleChoice';
  const distractors = taskType === 'singleChoice' ? uniqueDistractors(tokens, value, rng) : [];
  if (taskType === 'singleChoice' && distractors.length !== 3) {
    throw new Error(`M08: не удалось собрать дистракторы для ${expression}`);
  }
  const answers =
    taskType === 'singleChoice' ? shuffleSeeded([String(value), ...distractors], rng) : undefined;
  const priorities = classifyPriorities(tokens);
  if (!priorities) {
    throw new Error('M08: не удалось классифицировать приоритеты');
  }

  const task: Task = {
    id: `generated-m08-${difficulty}-${expressionFingerprint(tokens).replace(/\s+/g, '')}`,
    subject: 'mathematics',
    section: 'Порядок действий',
    topic: 'Выражения с несколькими действиями',
    skill: SUBTYPE_TITLES[requested],
    topicId: M08_TOPIC_ID,
    skillId: M08_SKILL_ID,
    difficulty,
    vprVersion: 2027,
    taskType,
    question: `Найди значение выражения: ${expression}.`,
    answers,
    correctAnswer: taskType === 'numberAnswer' ? value : String(value),
    explanation: buildExplanation(tokens, value),
    ...buildHints(tokens, value),
    sourceType: 'generated',
    generatorId: M08_GENERATOR_ID,
    generatorParams: {
      expression,
      tokens,
      opsCount: countOps(tokens),
      hasParens: hasParens(tokens),
      priorities,
      subtype: requested,
      features: collectFeatures(tokens),
      value,
      seed,
    } satisfies M08GeneratorParams,
  };

  assertGeneratedM08(task, difficulty, requested);
  return task;
}

function tryBuild(
  rng: SeededRng,
  difficulty: 1 | 2 | 3,
  subtype: ExpressionSubtype,
): ExpressionToken[] | null {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const tokens = buildTokens(rng, difficulty, subtype);
    if (!tokens) {
      continue;
    }
    if (!isValidM08Level(tokens, difficulty) || isTooEasyForLevel(tokens, difficulty)) {
      continue;
    }
    if (!subtypeFits(subtype, tokens)) {
      continue;
    }
    return tokens;
  }
  return null;
}

export function generateM08Task(options: M08GenerateOptions): Task {
  if (options.difficulty === 4 || options.difficulty === 5) {
    throw new Error(
      'Генератор M08 пока не создаёт уровни 4–5: L4 — формат ВПР, L5 — выбор порядка шагов и значения.',
    );
  }
  if (options.difficulty !== 1 && options.difficulty !== 2 && options.difficulty !== 3) {
    throw new Error(`Генератор M08: неподдерживаемый уровень ${options.difficulty}`);
  }

  const rng = createSeededRng(options.seed >>> 0);
  const difficulty = options.difficulty;
  const requested = resolveSubtype(difficulty, options.subtype, rng);

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const tokens = tryBuild(rng, difficulty, requested);
    if (!tokens) {
      continue;
    }
    try {
      return toTask(tokens, difficulty, options.seed, rng, requested);
    } catch {
      // следующий attempt
    }
  }

  throw new Error(`M08: не удалось сгенерировать задание L${difficulty} (seed=${options.seed})`);
}

export function generateM08Series(options: M08SeriesOptions): Task[] {
  const countPerLevel = options.countPerLevel ?? 10;
  const tasks: Task[] = [];
  const seen = new Set<string>();
  let salt = 0;

  for (const difficulty of [1, 2, 3] as const) {
    const subtypes = allowedSubtypes(difficulty);
    let produced = 0;
    let guard = 0;
    while (produced < countPerLevel && guard < countPerLevel * 40) {
      guard += 1;
      const subtype = subtypes[produced % subtypes.length] ?? subtypes[0];
      const seed = (options.seed + difficulty * 997 + produced * 131 + salt * 17) >>> 0;
      salt += 1;
      try {
        const task = generateM08Task({ difficulty, seed, subtype });
        const params = task.generatorParams as M08GeneratorParams;
        const fingerprint = expressionFingerprint(params.tokens);
        if (seen.has(fingerprint)) {
          continue;
        }
        seen.add(fingerprint);
        tasks.push(task);
        produced += 1;
      } catch {
        // retry
      }
    }
    if (produced < countPerLevel) {
      throw new Error(`M08 series: не удалось набрать ${countPerLevel} заданий L${difficulty}`);
    }
  }

  return tasks;
}
