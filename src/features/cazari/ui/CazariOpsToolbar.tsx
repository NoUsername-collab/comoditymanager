import { Link } from "@/i18n/navigation";
import type { CazariHorizonKey, CazariView } from "@/domain/cazari/horizon";
import type { CazariLabels } from "@/features/cazari/ui/types";

const VIEWS: CazariView[] = ["cereri", "confirmate", "anulate"];

export function CazariOpsToolbar({
  labels,
  view,
  horizon,
  metrics,
  buildViewHref,
  buildHorizonHref,
  filterLabels,
  filtersAria,
}: {
  labels: CazariLabels;
  view: CazariView;
  horizon: CazariHorizonKey;
  metrics: {
    cereri: number;
    confirmate: number;
    anulate: number;
  };
  buildViewHref: (next: CazariView) => string;
  buildHorizonHref: (next: CazariHorizonKey) => string;
  filterLabels: {
    cereri: string;
    confirmate: string;
    anulate: string;
  };
  filtersAria: string;
}) {
  const counts: Record<CazariView, number> = {
    cereri: metrics.cereri,
    confirmate: metrics.confirmate,
    anulate: metrics.anulate,
  };

  return (
    <div className="cazari-sticky-toolbar">
      <div className="cazari-view-filters" role="tablist" aria-label={filtersAria}>
        {VIEWS.map((key) => {
          const active = view === key;
          const count = counts[key];
          const cereriAlert = key === "cereri" && count > 0 && !active;

          return (
            <Link
              key={key}
              href={buildViewHref(key)}
              role="tab"
              aria-selected={active}
              className={[
                "cazari-view-filter",
                active && "cazari-view-filter--active",
                key === "cereri" && active && "cazari-view-filter--cereri-active",
                key === "cereri" && cereriAlert && "cazari-view-filter--cereri-alert",
                key === "confirmate" && active && "cazari-view-filter--confirm-active",
                key === "anulate" && active && "cazari-view-filter--anulate-active",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <span className="cazari-view-filter__label">{filterLabels[key]}</span>
              <span className="cazari-view-filter__count">{count}</span>
            </Link>
          );
        })}
      </div>

      <div className="cazari-horizon flex flex-wrap items-center gap-2">
        <span className="cazari-horizon__label text-[11px] font-semibold text-zinc-600">
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
              "cazari-horizon__pill rounded-full border px-2 py-0.5 text-[11px] font-semibold",
              horizon === key
                ? "cazari-horizon__pill--active"
                : "cazari-horizon__pill--idle",
            ].join(" ")}
          >
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}
