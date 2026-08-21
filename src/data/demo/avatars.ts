export const AVATAR_COLORS = [
  '#4F6BFF',
  '#0D9F8A',
  '#E08A2C',
  '#7B61FF',
  '#3BA55C',
  '#D35B5B',
] as const;

export function getInitial(name: string): string {
  const trimmed = name.trim();
  return trimmed ? trimmed[0].toUpperCase() : 'У';
}
