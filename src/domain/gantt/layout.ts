/** Înălțime rând Gantt (−15% față de 56px). */
export const GANTT_ROW_H = 48;

/** Desktop compact density — sync cu --gantt-row-h din gantt-premium-shell.css */
export const GANTT_ROW_H_COMPACT = 28;

/** Înălțime bare rezervare pe Gantt (+10% față de 30px). */
export const GANTT_STAY_H = 33;

/** Înălțime bare hold/block (+10% față de 24px). */
export const GANTT_OCC_BAR_H = 26;

/** Rând nerepartizat (−15% față de 44px). */
export const GANTT_UNASSIGNED_ROW_H = 37;

export function ganttBarTop(rowH: number, barH: number): number {
  return Math.round((rowH - barH) / 2);
}

export const GANTT_STAY_TOP = ganttBarTop(GANTT_ROW_H, GANTT_STAY_H);
export const GANTT_OCC_BAR_TOP = ganttBarTop(GANTT_ROW_H, GANTT_OCC_BAR_H);
