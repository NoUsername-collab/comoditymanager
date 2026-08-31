"use client";

import { useSearchParams } from "next/navigation"
import { usePathname, useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { AdminInput } from "@/components/admin/ui/AdminInput";
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
    <div className="availability-date-picker admin-surface-card flex flex-wrap items-center gap-2 px-3 py-2.5">
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
        <AdminInput
          type="date"
          value={selectedDate}
          onChange={(e) => setDate(e.target.value)}
        />
      </label>
      {selectedDate !== effectiveToday && (
        <AdminButton variant="secondary" size="sm" onClick={() => setDate(effectiveToday)}>
          {tCommon("todayShort")}
        </AdminButton>
      )}
    </div>
  );
}
