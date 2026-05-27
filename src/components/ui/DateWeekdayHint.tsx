"use client";

"use client";

import { useLocale } from "next-intl";
import { dayInitialFromIso, formatDateWithDay } from "@/lib/ro-calendar";

export function DateWeekdayHint({ iso }: { iso: string }) {
  const locale = useLocale();
  if (!iso) return null;
  return (
    <span className="mt-1 block text-[11px] font-medium text-zinc-500">
      {formatDateWithDay(iso, locale)}
    </span>
  );
}

export function DateWeekdayBadge({ iso }: { iso: string }) {
  const locale = useLocale();
  if (!iso) return null;
  return (
    <span className="ml-1.5 inline-flex min-w-[2rem] justify-center rounded bg-zinc-100 px-1 py-0.5 text-[10px] font-semibold text-zinc-600">
      {dayInitialFromIso(iso, locale)}
    </span>
  );
}
