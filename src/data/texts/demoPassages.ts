export const DEMO_PASSAGES: Record<string, string> = {
  'demo-hedgehog':
    'DEMO-текст. Ёж шёл по тропинке. Сначала он увидел яблоко. Потом положил яблоко на спину. Затем пошёл домой.',
};

export function getPassage(textId?: string): string | undefined {
  if (!textId) {
    return undefined;
  }
  return DEMO_PASSAGES[textId];
}
