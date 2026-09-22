export type StayHorizonKey = "1d" | "7d" | "30d" | "60d" | "180d" | "365d";

/** @deprecated Legacy query `tab=` — use StayListView */
export type StayListTab = "ops" | "refused";

export type StayListView = "requests" | "confirmed" | "cancelled";

const VIEW_FROM_QUERY: Record<string, StayListView> = {
  cereri: "requests",
  requests: "requests",
  confirmate: "confirmed",
  confirmed: "confirmed",
  anulate: "cancelled",
  cancelled: "cancelled",
};

const TAB_FROM_QUERY: Record<string, StayListTab> = {
  refuzate: "refused",
  refused: "refused",
};

/** Public URL values. Default `confirmed` is omitted from the query string. */
const VIEW_TO_QUERY: Record<StayListView, string | null> = {
  requests: "cereri",
  confirmed: null,
  cancelled: "anulate",
};

export const STAY_HORIZON_DAYS: Record<StayHorizonKey, number> = {
  "1d": 1,
  "7d": 7,
  "30d": 30,
  "60d": 60,
  "180d": 180,
  "365d": 365,
};

export function firstStayQueryValue(
  value: string | string[] | undefined
): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export function readStayHorizon(
  input: string | string[] | undefined
): StayHorizonKey {
  const value = firstStayQueryValue(input).trim();
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

export function readStayListTab(
  input: string | string[] | undefined
): StayListTab {
  const value = firstStayQueryValue(input).trim();
  return TAB_FROM_QUERY[value] ?? "ops";
}

export function readStayListView(
  viewInput: string | string[] | undefined,
  tabInput?: string | string[] | undefined
): StayListView {
  const view = firstStayQueryValue(viewInput).trim();
  const mapped = VIEW_FROM_QUERY[view];
  if (mapped) return mapped;
  if (readStayListTab(tabInput) === "refused") {
    return "cancelled";
  }
  return "confirmed";
}

export function buildStaysPageHref(opts: {
  q?: string;
  h?: StayHorizonKey;
  view?: StayListView;
  /** @deprecated — maps refused → cancelled */
  tab?: StayListTab;
}): string {
  const params = new URLSearchParams();
  if (opts.q) params.set("q", opts.q);
  if (opts.h && opts.h !== "30d") params.set("h", opts.h);
  const view =
    opts.view ??
    (opts.tab === "refused" ? "cancelled" : opts.tab ? "confirmed" : undefined);
  const queryView = view ? VIEW_TO_QUERY[view] : null;
  if (queryView) params.set("view", queryView);
  const qs = params.toString();
  return qs ? `/admin/cazari?${qs}` : "/admin/cazari";
}
