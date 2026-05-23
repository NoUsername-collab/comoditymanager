"use client";

import { dayInitialFromIso, formatDateWithDay } from "@/lib/ro-calendar";

/** Afișează ziua săptămânii când utilizatorul alege o dată */
export function DateWeekdayHint({ iso }: { iso: string }) {
  if (!iso) return null;
  return (
    <span className="mt-1 block text-[11px] font-medium text-zinc-500">
      {formatDateWithDay(iso)}
    </span>
  );
}

export function DateWeekdayBadge({ iso }: { iso: string }) {
  if (!iso) return null;
  return (
    <span className="ml-1.5 inline-flex min-w-[2rem] justify-center rounded bg-zinc-100 px-1 py-0.5 text-[10px] font-semibold text-zinc-600">
      {dayInitialFromIso(iso)}
    </span>
  );
}
