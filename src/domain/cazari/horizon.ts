export type CazariHorizonKey = "1d" | "7d" | "30d" | "60d" | "180d" | "365d";

/** @deprecated Legacy — use CazariView */
export type CazariTab = "ops" | "refuzate";

export type CazariView = "cereri" | "confirmate" | "anulate";

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

export function readCazariView(
  viewInput: string | string[] | undefined,
  tabInput?: string | string[] | undefined
): CazariView {
  const view = firstCazariQueryValue(viewInput).trim();
  if (view === "cereri" || view === "confirmate" || view === "anulate") {
    return view;
  }
  if (firstCazariQueryValue(tabInput).trim() === "refuzate") {
    return "anulate";
  }
  return "confirmate";
}

export function buildCazariPageHref(opts: {
  q?: string;
  h?: CazariHorizonKey;
  view?: CazariView;
  /** @deprecated — maps refuzate → anulate */
  tab?: CazariTab;
}): string {
  const params = new URLSearchParams();
  if (opts.q) params.set("q", opts.q);
  if (opts.h && opts.h !== "30d") params.set("h", opts.h);
  const view =
    opts.view ??
    (opts.tab === "refuzate" ? "anulate" : opts.tab ? "confirmate" : undefined);
  if (view && view !== "confirmate") params.set("view", view);
  const qs = params.toString();
  return qs ? `/admin/cazari?${qs}` : "/admin/cazari";
}
