"use client";

"use client";

import { useLocale } from "next-intl";
import { formatDateWithDay } from "@/lib/ro-calendar";

export function DateWeekdayHint({ iso }: { iso: string }) {
  const locale = useLocale();
  if (!iso) return null;
  return (
    <span className="mt-1 block text-[11px] font-medium text-zinc-500">
      {formatDateWithDay(iso, locale)}
    </span>
  );
}
