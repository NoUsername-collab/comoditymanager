/** Colțuri bară Gantt: stânga-jos + dreapta-sus rotunjite; stânga-sus + dreapta-jos drepte */

export const GANTT_STAY_SLANT_R = 14;
export const GANTT_STAY_SLANT_JOIN = 3;

/** CSS border-radius: tl tr br bl */
export function ganttStaySlantRadius(
  continuesBefore: boolean,
  continuesAfter: boolean
): string {
  const tl = continuesBefore ? GANTT_STAY_SLANT_JOIN : 0;
  const bl = continuesBefore ? GANTT_STAY_SLANT_JOIN : GANTT_STAY_SLANT_R;
  const tr = continuesAfter ? GANTT_STAY_SLANT_JOIN : GANTT_STAY_SLANT_R;
  const br = continuesAfter ? GANTT_STAY_SLANT_JOIN : 0;
  return `${tl}px ${tr}px ${br}px ${bl}px`;
}

/** Card singular (weekend etc.) — ambele capete vizibile */
export function ganttStaySlantRadiusClosed(): string {
  return `0 ${GANTT_STAY_SLANT_R}px 0 ${GANTT_STAY_SLANT_R}px`;
}
