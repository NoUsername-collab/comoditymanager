function dayMs(isoDate: string): number {
  return new Date(`${isoDate}T12:00:00`).getTime();
}

export function daysUntilDate(today: string, target: string): number {
  return Math.round((dayMs(target) - dayMs(today)) / 86_400_000);
}

/** 0 at check-in day, 1 at check-out day (inclusive stay arc). */
export function stayProgressRatio(input: {
  today: string;
  checkIn: string;
  checkOut: string;
}): number {
  const total = dayMs(input.checkOut) - dayMs(input.checkIn);
  if (total <= 0) return 1;
  const elapsed = dayMs(input.today) - dayMs(input.checkIn);
  return Math.min(1, Math.max(0, elapsed / total));
}
