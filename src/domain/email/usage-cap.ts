/** UTC month bucket for email usage (YYYY-MM-01). */
export function currentUtcMonthPeriod(): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}-01`;
}

export function isUnderMonthlyEmailCap(sentCount: number, cap: number | null): boolean {
  if (cap == null) return true;
  return sentCount < cap;
}

export function remainingMonthlyEmailSends(sentCount: number, cap: number | null): number | null {
  if (cap == null) return null;
  return Math.max(cap - sentCount, 0);
}

export function monthlyCapExceeded(sentCount: number, cap: number | null): boolean {
  return !isUnderMonthlyEmailCap(sentCount, cap);
}
