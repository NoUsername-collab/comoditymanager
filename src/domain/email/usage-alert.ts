export type EmailUsageAlertLevel = "ok" | "warning" | "exceeded" | "unlimited";

const WARNING_RATIO = 0.9;

export function emailUsageAlertLevel(
  sentCount: number,
  cap: number | null,
): EmailUsageAlertLevel {
  if (cap == null) return "unlimited";
  if (sentCount >= cap) return "exceeded";
  if (sentCount >= Math.ceil(cap * WARNING_RATIO)) return "warning";
  return "ok";
}

export function emailUsagePercent(sentCount: number, cap: number | null): number | null {
  if (cap == null || cap <= 0) return null;
  return Math.min(100, Math.round((sentCount / cap) * 100));
}
