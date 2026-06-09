export type CazariHorizonKey = "1d" | "7d" | "30d" | "60d" | "180d" | "365d";

export type CazariTab = "ops" | "refuzate";

export const CAZARI_HORIZON_DAYS: Record<CazariHorizonKey, number> = {
  "1d": 1,
  "7d": 7,
  "30d": 30,
  "60d": 60,
  "180d": 180,
  "365d": 365,
};

export function firstCazariQueryValue(
  value: string | string[] | undefined
): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export function readCazariHorizon(
  input: string | string[] | undefined
): CazariHorizonKey {
  const value = firstCazariQueryValue(input).trim();
  if (
    value === "1d" ||
    value === "7d" ||
    value === "60d" ||
    value === "180d" ||
    value === "365d"
  ) {
    return value;
  }
  return "30d";
}

export function readCazariTab(
  input: string | string[] | undefined
): CazariTab {
  const value = firstCazariQueryValue(input).trim();
  return value === "refuzate" ? "refuzate" : "ops";
}

export function buildCazariPageHref(opts: {
  q?: string;
  h?: CazariHorizonKey;
  tab?: CazariTab;
}): string {
  const params = new URLSearchParams();
  if (opts.q) params.set("q", opts.q);
  if (opts.h && opts.h !== "30d") params.set("h", opts.h);
  if (opts.tab && opts.tab !== "ops") params.set("tab", opts.tab);
  const qs = params.toString();
  return qs ? `/admin/cazari?${qs}` : "/admin/cazari";
}
