/** Fracție 0–1 din zi pentru HH:MM (pentru poziționare în celulă). */
export function timeToDayFraction(time: string): number {
  const [hh, mm] = time.split(":").map(Number);
  const h = Number.isFinite(hh) ? hh : 0;
  const m = Number.isFinite(mm) ? mm : 0;
  return Math.min(1, Math.max(0, (h * 60 + m) / (24 * 60)));
}

/** Ora din HH:MM pentru etichete scurte (ex. „Check-out 11”). */
export function ganttTimeHourLabel(time: string): string {
  const [hh] = time.split(":");
  const h = Number.parseInt(hh ?? "", 10);
  return Number.isFinite(h) ? String(h) : time.trim();
}

export function ganttDayTimeStyle(
  checkInTime: string,
  checkOutTime: string
): Record<string, string> {
  const outPct = timeToDayFraction(checkOutTime) * 100;
  const inPct = timeToDayFraction(checkInTime) * 100;
  return {
    "--gantt-check-out-pct": `${outPct}%`,
    "--gantt-check-in-pct": `${inPct}%`,
  };
}
