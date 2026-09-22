import { Link } from "@/i18n/navigation";
import type { StayHorizonKey, StayListView } from "@/domain/stays/horizon";
import type { StayListLabels } from "@/features/stays/ui/types";

const VIEWS: StayListView[] = ["requests", "confirmed", "cancelled"];

export function StayOpsToolbar({
  labels,
  view,
  horizon,
  metrics,
  buildViewHref,
  buildHorizonHref,
  filterLabels,
  filtersAria,
}: {
  labels: StayListLabels;
  view: StayListView;
  horizon: StayHorizonKey;
  metrics: Record<StayListView, number>;
  buildViewHref: (next: StayListView) => string;
  buildHorizonHref: (next: StayHorizonKey) => string;
  filterLabels: Record<StayListView, string>;
  filtersAria: string;
}) {
  return (
    <div className="stays-sticky-toolbar">
      <div className="stays-view-filters" role="tablist" aria-label={filtersAria}>
        {VIEWS.map((key) => {
          const active = view === key;
          const count = metrics[key];
          const requestsAlert = key === "requests" && count > 0 && !active;

          return (
            <Link
              key={key}
              href={buildViewHref(key)}
              role="tab"
              aria-selected={active}
              className={[
                "stays-view-filter",
                active && "stays-view-filter--active",
                key === "requests" && active && "stays-view-filter--requests-active",
                key === "requests" && requestsAlert && "stays-view-filter--requests-alert",
                key === "confirmed" && active && "stays-view-filter--confirmed-active",
                key === "cancelled" && active && "stays-view-filter--cancelled-active",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <span className="stays-view-filter__label">{filterLabels[key]}</span>
              <span className="stays-view-filter__count">{count}</span>
            </Link>
          );
        })}
      </div>

      <div className="stays-horizon flex flex-wrap items-center gap-2">
        <span className="stays-horizon__label text-[11px] font-semibold text-zinc-600">
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
              "stays-horizon__pill rounded-full border px-2 py-0.5 text-[11px] font-semibold",
              horizon === key
                ? "stays-horizon__pill--active"
                : "stays-horizon__pill--idle",
            ].join(" ")}
          >
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}
