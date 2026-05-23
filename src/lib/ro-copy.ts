/** Texte în română corect gramatical (UI admin + public) */

export function cereriNoiLinkText(count: number): string {
  if (count === 1) return "1 cerere nouă";
  return `${count} cereri noi`;
}

export function cereriNoiPulsText(count: number): string {
  if (count === 1) return "1 cerere de procesat";
  return `${count} cereri de procesat`;
}
