"use client";

import type { ReactNode } from "react";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { AdminInput, AdminSelect } from "@/components/admin/ui/AdminInput";
import { ganttQuickNightsBetween } from "@/domain/gantt/quick-interval";
import { formatStayPeriod } from "@/lib/ro-calendar";
import {
  minCheckOutDate,
} from "@/lib/stay-dates";

import { GANTT_QUICK_LABEL_CLASS } from "./types";

export function GanttQuickSummaryCard({
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
      ? "admin-banner admin-banner--warning"
      : tone === "info"
        ? "admin-banner admin-banner--info"
        : "admin-banner admin-banner--muted";

  return (
    <div className={["rounded-xl px-3 py-2.5", toneClass].join(" ")}>
      <div className="text-[11px] font-semibold uppercase tracking-[0.08em] opacity-70">
        {title}
      </div>
      <div className="mt-1 text-sm font-medium">{body}</div>
    </div>
  );
}

export function GanttQuickIntervalPlanner({
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
    checkIn && checkOut && !invalidInterval
      ? ganttQuickNightsBetween(checkIn, checkOut)
      : 0;
  const period =
    checkIn && checkOut && !invalidInterval
      ? formatStayPeriod(checkIn, checkOut, locale, true)
      : invalidMessage;

  return (
    <section className="admin-surface-card rounded-[1.65rem] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
            {title}
          </p>
          <div className="mt-1 text-base font-bold text-zinc-900">{subtitle}</div>
          <p
            className={[
              "mt-1 text-sm",
              invalidInterval ? "admin-text--danger" : "text-zinc-600",
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

export function GanttQuickActionRadial({
  disabled,
  onSelect,
  tGantt,
}: {
  disabled: {
    hold: boolean;
    block: boolean;
    cerere: boolean;
    direct: boolean;
  };
  onSelect: (mode: "hold" | "block" | "cerere" | "direct") => void;
  tGantt: (key: string) => string;
}) {
  const actions = [
    {
      id: "cerere",
      label: tGantt("quick.radial.request"),
      hint: tGantt("quick.radial.unconfirmed"),
      offsetX: -126,
      offsetY: -82,
      tone: "admin-booking-tone--cerere",
    },
    {
      id: "direct",
      label: tGantt("quick.radial.direct"),
      hint: tGantt("quick.radial.confirmed"),
      offsetX: 126,
      offsetY: -82,
      tone: "admin-booking-tone--direct",
    },
    {
      id: "hold",
      label: tGantt("quick.radial.hold"),
      hint: tGantt("quick.radial.temporary"),
      offsetX: -126,
      offsetY: 82,
      tone: "admin-booking-tone--hold",
    },
    {
      id: "block",
      label: tGantt("quick.radial.block"),
      hint: tGantt("quick.radial.unavailable"),
      offsetX: 126,
      offsetY: 82,
      tone: "admin-booking-tone--block",
    },
  ] as const;

  return (
    <div className="relative mx-auto h-[20rem] max-w-[30rem] overflow-visible">
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full border gantt-radial-ring" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-zinc-200/80" />
      <div className="gantt-radial-hub absolute left-1/2 top-1/2 z-20 flex h-24 w-24 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[2rem] border bg-white px-3 text-center shadow-none">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
            {tGantt("quick.radial.release")}
          </div>
          <div className="mt-1 text-base font-extrabold text-zinc-800">{tGantt("quick.radial.choose")}</div>
        </div>
      </div>

      {actions.map((action) => {
        const isDisabled = disabled[action.id];
        return (
          <button
            key={action.id}
            type="button"
            disabled={isDisabled}
            onClick={() => onSelect(action.id)}
            style={{
              left: "50%",
              top: "50%",
              transform: `translate(calc(-50% + ${action.offsetX}px), calc(-50% + ${action.offsetY}px))`,
            }}
            className={[
              "absolute z-10 flex min-h-[5.3rem] w-[10.5rem] flex-col items-center justify-center rounded-[1.55rem] admin-booking-tone px-4 text-center shadow-[0_18px_45px_-24px_rgba(15,23,42,0.5)] transition",
              action.tone,
              isDisabled
                ? "cursor-not-allowed opacity-45 shadow-none"
                : "hover:scale-[1.02] hover:shadow-[0_24px_55px_-24px_rgba(15,23,42,0.5)]",
            ].join(" ")}
          >
            <span className="text-[1.03rem] font-extrabold leading-none">
              {action.label}
            </span>
            <span className="mt-1 text-[11px] font-bold uppercase tracking-[0.08em] opacity-75">
              {action.hint}
            </span>
          </button>
        );
      })}
    </div>
  );
}