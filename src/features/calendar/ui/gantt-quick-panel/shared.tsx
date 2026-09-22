"use client";

import type { ReactNode } from "react";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { AdminInput } from "@/components/admin/ui/AdminInput";
import { formatStayPeriod } from "@/lib/ro-calendar";
import { minCheckOutDate, parseIso } from "@/lib/stay-dates";
import { GANTT_QUICK_LABEL_CLASS } from "./types";

export { GANTT_QUICK_LABEL_CLASS };

export const LIST_SEPARATOR = "\u00B7";

export function SummaryCard({
  title,
  body,
  tone = "default",
}: {
  title: string;
  body: ReactNode;
  tone?: "default" | "warn" | "info";
}) {
  const toneClass =
    tone === "warn"
      ? "admin-banner--warning"
      : tone === "info"
        ? "admin-banner--info"
        : "admin-banner--muted";

  return (
    <div className={["admin-banner", toneClass].join(" ")}>
      <div className="text-[11px] font-semibold uppercase tracking-[0.08em] opacity-70">
        {title}
      </div>
      <div className="mt-1 text-sm font-medium">{body}</div>
    </div>
  );
}

export function nightsBetween(checkIn: string, checkOut: string) {
  return Math.max(
    0,
    Math.round(
      (parseIso(checkOut).getTime() - parseIso(checkIn).getTime()) /
        (1000 * 60 * 60 * 24)
    )
  );
}

export function IntervalPlanner({
  title,
  subtitle,
  checkIn,
  checkOut,
  onCheckInChange,
  onCheckOutChange,
  onShift,
  onSetDuration,
  onToday,
  minCheckIn,
  invalidInterval,
  hasConflict,
  invalidMessage,
  nightLabel,
  locale,
  tGantt,
}: {
  title: string;
  subtitle: ReactNode;
  checkIn: string;
  checkOut: string;
  onCheckInChange: (value: string) => void;
  onCheckOutChange: (value: string) => void;
  onShift: (days: number) => void;
  onSetDuration: (nights: number) => void;
  onToday: () => void;
  minCheckIn: string;
  invalidInterval: boolean;
  hasConflict: boolean;
  invalidMessage: string;
  nightLabel: (count: number) => string;
  locale: string;
  tGantt: (key: string) => string;
}) {
  const nights =
    checkIn && checkOut && !invalidInterval ? nightsBetween(checkIn, checkOut) : 0;
  const period =
    checkIn && checkOut && !invalidInterval
      ? formatStayPeriod(checkIn, checkOut, locale, true)
      : invalidMessage;

  return (
    <section className="admin-surface-card gantt-quick-panel__planner p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="gantt-quick-panel__eyebrow text-[11px] font-semibold uppercase tracking-[0.14em]">
            {title}
          </p>
          <div className="gantt-quick-panel__value mt-1 text-base font-bold">{subtitle}</div>
          <p
            className={[
              "mt-1 text-sm",
              invalidInterval ? "admin-text--danger" : "gantt-quick-panel__muted",
            ].join(" ")}
          >
            {period}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="admin-status-badge admin-status-badge--confirmed px-3 py-1 text-[11px]">
            {nights > 0 ? nightLabel(nights) : tGantt("quick.intervalBadge")}
          </span>
          {hasConflict ? (
            <span className="admin-status-badge admin-status-badge--pending px-3 py-1 text-[11px]">
              {tGantt("quick.conflict")}
            </span>
          ) : null}
          {invalidInterval ? (
            <span className="admin-status-badge admin-status-badge--cancelled px-3 py-1 text-[11px]">
              {tGantt("quick.invalidDates")}
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className={GANTT_QUICK_LABEL_CLASS}>
          {tGantt("quick.checkInLabel")}
          <AdminInput
            type="date"
            className="mt-1"
            value={checkIn}
            min={minCheckIn}
            onChange={(e) => onCheckInChange(e.target.value)}
          />
        </label>
        <label className={GANTT_QUICK_LABEL_CLASS}>
          {tGantt("quick.checkOutLabel")}
          <AdminInput
            type="date"
            className="mt-1"
            value={checkOut}
            min={checkIn ? minCheckOutDate(checkIn, minCheckIn) : minCheckIn}
            onChange={(e) => onCheckOutChange(e.target.value)}
          />
        </label>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <AdminButton variant="soft" size="sm" onClick={() => onShift(-7)}>
          {tGantt("quick.shiftMinus7")}
        </AdminButton>
        <AdminButton variant="soft" size="sm" onClick={() => onShift(-1)}>
          {tGantt("quick.shiftMinus1")}
        </AdminButton>
        <AdminButton variant="soft" size="sm" onClick={() => onShift(1)}>
          {tGantt("quick.shiftPlus1")}
        </AdminButton>
        <AdminButton variant="soft" size="sm" onClick={() => onShift(7)}>
          {tGantt("quick.shiftPlus7")}
        </AdminButton>
        <AdminButton variant="soft" size="sm" onClick={onToday}>
          {tGantt("quick.todayButton")}
        </AdminButton>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        {[1, 2, 3, 7].map((value) => (
          <AdminButton
            key={value}
            variant="soft"
            size="sm"
            onClick={() => onSetDuration(value)}
          >
            {nightLabel(value)}
          </AdminButton>
        ))}
      </div>
    </section>
  );
}

export function StaySummary({
  roomLabel,
  period,
  nights,
  nightLabel,
}: {
  roomLabel: ReactNode;
  period: string;
  nights: number;
  nightLabel: (count: number) => string;
}) {
  return (
    <div className="admin-surface-card gantt-quick-panel__stay-summary">
      <p className="gantt-quick-panel__stay-summary-line">
        <span className="gantt-quick-panel__value">{roomLabel}</span>
        {period ? (
          <span className="gantt-quick-panel__stay-summary-meta">
            {LIST_SEPARATOR} {period}
          </span>
        ) : null}
        {nights > 0 ? (
          <span className="gantt-quick-panel__stay-summary-meta">
            {LIST_SEPARATOR} {nightLabel(nights)}
          </span>
        ) : null}
      </p>
    </div>
  );
}
