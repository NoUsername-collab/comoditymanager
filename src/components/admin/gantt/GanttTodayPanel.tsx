"use client";

import Link from "next/link";
import type { GanttTodaySummary } from "@/domain/gantt/today-activity";
import { formatDateWithDay } from "@/lib/ro-calendar";

export function GanttTodayPanel({
  summary,
  checkInTime,
  checkOutTime,
  onScrollToToday,
}: {
  summary: GanttTodaySummary;
  checkInTime: string;
  checkOutTime: string;
  onScrollToToday: () => void;
}) {
  if (!summary.inView) {
    return (
      <div className="gantt-today-panel gantt-today-panel--away mx-4 mt-3 rounded-xl border border-dashed border-zinc-200 bg-zinc-50/80 px-4 py-2.5 text-xs text-zinc-500">
        Ziua de azi nu e în această perioadă — folosește săgețile sau zoom „Lună”
        curentă.
      </div>
    );
  }

  const { arrivals, departures, stayingTonight, todayIso } = summary;

  return (
    <div className="gantt-today-panel mx-3 mt-3 rounded-xl border border-emerald-200/80 bg-gradient-to-r from-amber-50/80 via-white to-slate-100/90 px-3 py-2.5 shadow-sm ring-1 ring-emerald-500/10">
      <div className="flex flex-wrap items-center gap-2">
        <span className="gantt-today-panel__pulse inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">
          <span className="gantt-today-panel__dot" aria-hidden />
          Azi
        </span>
        <span className="text-xs font-medium text-zinc-700">
          {formatDateWithDay(todayIso, true)}
        </span>
        <span className="hidden text-[10px] text-zinc-500 sm:inline">
          Check-in {checkInTime} · Check-out {checkOutTime}
        </span>

        <div className="flex flex-wrap items-center gap-1.5 sm:ml-1">
          <span className="gantt-today-chip gantt-today-chip--arrival">
            {arrivals.length}{" "}
            {arrivals.length === 1 ? "sosire" : "sosiri"}
          </span>
          <span className="gantt-today-chip gantt-today-chip--departure">
            {departures.length} plecări
          </span>
          <span className="gantt-today-chip gantt-today-chip--night">
            {stayingTonight} diseară
          </span>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onScrollToToday}
            className="rounded-lg border border-emerald-300/80 bg-white px-2.5 py-1 text-[11px] font-semibold text-emerald-800 shadow-sm transition hover:border-emerald-400 hover:bg-emerald-50"
          >
            Centrare azi
          </button>
          <Link
            href="/receptie"
            className="rounded-lg bg-emerald-700 px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm transition hover:bg-emerald-800"
          >
            Recepție →
          </Link>
        </div>
      </div>
    </div>
  );
}
