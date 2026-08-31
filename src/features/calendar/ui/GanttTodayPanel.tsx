"use client";

import { Link } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import type { GanttTodaySummary } from "@/domain/gantt/today-activity";
import { formatDateWithDay } from "@/lib/ro-calendar";

export function GanttTodayPanel({
  summary,
  checkInTime,
  checkOutTime,
  onScrollToToday,
  compact = false,
}: {
  summary: GanttTodaySummary;
  checkInTime: string;
  checkOutTime: string;
  onScrollToToday: () => void;
  compact?: boolean;
}) {
  const tCommon = useTranslations("admin.common");
  const tGantt = useTranslations("admin.gantt");
  const locale = useLocale();
  if (!summary.inView) {
    return (
      <div
        className={[
          "gantt-today-panel gantt-today-panel--away rounded-xl border border-dashed border-zinc-200 bg-zinc-50/80 text-xs text-zinc-500",
          compact ? "gantt-today-panel--compact" : "mx-4 mt-3 px-4 py-2.5",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {tGantt("today.outOfRange")}
      </div>
    );
  }

  const { arrivals, departures, stayingTonight, todayIso } = summary;

  return (
    <div
      className={[
        "gantt-today-panel rounded-xl border border-emerald-200/80 bg-[var(--admin-surface-bg,var(--surface))] shadow-none ring-1 ring-emerald-500/10",
        compact ? "gantt-today-panel--compact" : "mx-3 mt-3 px-3 py-2.5",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="gantt-today-panel__pulse inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">
          <span className="gantt-today-panel__dot" aria-hidden />
          {tCommon("todayPanel")}
        </span>
        <span className="text-xs font-medium text-zinc-700">
          {formatDateWithDay(todayIso, locale, true)}
        </span>
        <span
          className={[
            "text-[10px] text-zinc-500",
            compact ? "hidden xl:inline" : "hidden sm:inline",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {tCommon("checkIn")} {checkInTime} · {tCommon("checkOut")} {checkOutTime}
        </span>

        <div className="flex flex-wrap items-center gap-1.5 sm:ml-1">
          <span className="gantt-today-chip gantt-today-chip--arrival">
            {tGantt("today.arrivalsCount", { count: arrivals.length })}
          </span>
          <span className="gantt-today-chip gantt-today-chip--departure">
            {tGantt("today.departuresCount", { count: departures.length })}
          </span>
          <span className="gantt-today-chip gantt-today-chip--night">
            {tGantt("today.stayingTonightCount", { count: stayingTonight })}
          </span>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onScrollToToday}
            className={[
              "rounded-lg border border-emerald-300/80 bg-white text-[11px] font-semibold text-emerald-800 shadow-sm transition hover:border-emerald-400 hover:bg-emerald-50",
              compact ? "px-2 py-1" : "px-2.5 py-1",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {compact ? tGantt("today.center") : tGantt("today.centerToday")}
          </button>
          <Link
            href="/receptie"
            className={[
              "rounded-lg bg-emerald-700 text-[11px] font-semibold text-white shadow-sm transition hover:bg-emerald-800",
              compact ? "px-2 py-1" : "px-2.5 py-1",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {compact ? tGantt("today.reception") : tGantt("today.receptionArrow")}
          </Link>
        </div>
      </div>
    </div>
  );
}
