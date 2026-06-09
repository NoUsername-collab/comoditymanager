import { Link } from "@/i18n/navigation";
import { StayMetricChip } from "@/components/admin/cazari/StayMetricChip";
import type { CazariHorizonKey, CazariTab } from "@/domain/cazari/horizon";
import type { CazariLabels } from "@/components/admin/cazari/types";

export function CazariOpsToolbar({
  labels,
  tab,
  horizon,
  q,
  metrics,
  buildTabHref,
  buildHorizonHref,
  metricLabels,
}: {
  labels: CazariLabels;
  tab: CazariTab;
  horizon: CazariHorizonKey;
  q: string;
  metrics: {
    filteredStays: number;
    cereri: number;
    confirmate: number;
    filteredHistory: number;
    filteredRefused: number;
  };
  buildTabHref: (next: CazariTab) => string;
  buildHorizonHref: (next: CazariHorizonKey) => string;
  metricLabels: {
    results: string;
    operational: string;
    requests: string;
    confirmed: string;
    past: string;
  };
}) {
  return (
    <>
      <div className="cazari-tabs flex flex-wrap gap-2 border-b border-zinc-200 pb-2">
        <Link
          href={buildTabHref("ops")}
          className={[
            "rounded-md border px-3 py-1.5 text-xs font-semibold",
            tab === "ops"
              ? "border-emerald-300 bg-emerald-50 text-emerald-900"
              : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50",
          ].join(" ")}
        >
          {labels.tabOperational}
        </Link>
        <Link
          href={buildTabHref("refuzate")}
          className={[
            "rounded-md border px-3 py-1.5 text-xs font-semibold",
            tab === "refuzate"
              ? "border-red-300 bg-red-50 text-red-900"
              : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50",
          ].join(" ")}
        >
          {labels.tabRefused} ({metrics.filteredRefused})
        </Link>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
        <StayMetricChip
          label={q ? metricLabels.results : metricLabels.operational}
          value={metrics.filteredStays}
          tone="sky"
        />
        <StayMetricChip
          label={metricLabels.requests}
          value={metrics.cereri}
          tone="amber"
        />
        <StayMetricChip
          label={metricLabels.confirmed}
          value={metrics.confirmate}
          tone="emerald"
        />
        <StayMetricChip
          label={metricLabels.past}
          value={metrics.filteredHistory}
          tone="zinc"
        />
        <StayMetricChip
          label={labels.tabRefused}
          value={metrics.filteredRefused}
          tone="red"
        />
      </div>
      <div className="cazari-horizon flex flex-wrap items-center gap-2 pt-1">
        <span className="text-[11px] font-semibold text-zinc-600">
          {labels.visibleWindow}
        </span>
        {(
          [
            ["1d", labels.horizonToday],
            ["7d", labels.horizonWeek],
            ["30d", labels.horizon30d],
            ["60d", labels.horizon60d],
            ["180d", labels.horizon180d],
            ["365d", labels.horizon365d],
          ] as const
        ).map(([key, label]) => (
          <Link
            key={key}
            href={buildHorizonHref(key)}
            className={[
              "rounded-full border px-2 py-0.5 text-[11px] font-semibold",
              horizon === key
                ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                : "border-zinc-200 bg-white text-zinc-700",
            ].join(" ")}
          >
            {label}
          </Link>
        ))}
      </div>
    </>
  );
}
