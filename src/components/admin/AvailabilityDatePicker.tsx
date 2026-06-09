"use client";

import { useSearchParams } from "next/navigation"
import { usePathname, useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { viewDateLabel } from "@/lib/availability-date";
import { todayIso } from "@/lib/stay-dates";

export function AvailabilityDatePicker({
  selectedDate,
  today: todayProp,
}: {
  selectedDate: string;
  today?: string;
}) {
  const tPicker = useTranslations("admin.availabilityDatePicker");
  const tCommon = useTranslations("admin.common");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const effectiveToday = todayProp ?? todayIso();

  function setDate(iso: string) {
    const next = new URLSearchParams(searchParams.toString());
    if (iso === effectiveToday) {
      next.delete("date");
    } else {
      next.set("date", iso);
    }
    const q = next.toString();
    router.push(q ? `${pathname}?${q}` : pathname);
  }

  return (
    <div className="availability-date-picker flex flex-wrap items-center gap-2 rounded-xl border border-zinc-200/90 bg-gradient-to-r from-white to-zinc-50/80 px-3 py-2.5 shadow-sm ring-1 ring-zinc-900/5">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
          {tPicker("availabilityOnDate")}
        </p>
        <p className="text-sm font-semibold text-zinc-800">
          {viewDateLabel(selectedDate)}
        </p>
      </div>
      <label className="flex items-center gap-2 text-sm text-zinc-600">
        <span className="sr-only">{tPicker("chooseDate")}</span>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-800 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
        />
      </label>
      {selectedDate !== effectiveToday && (
        <button
          type="button"
          onClick={() => setDate(effectiveToday)}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 shadow-sm hover:bg-zinc-50"
        >
          {tCommon("todayShort")}
        </button>
      )}
    </div>
  );
}
