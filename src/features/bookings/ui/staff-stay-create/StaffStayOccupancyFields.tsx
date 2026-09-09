"use client";

import { useTranslations } from "next-intl";
import { AdminInput } from "@/components/admin/ui/AdminInput";

const labelClass = "admin-field__label block uppercase tracking-[0.08em]";

export function StaffStayOccupancyFields({
  numAdults,
  numChildren,
  onAdultsChange,
  onChildrenChange,
  appearance,
}: {
  numAdults: number;
  numChildren: number;
  onAdultsChange: (value: number) => void;
  onChildrenChange: (value: number) => void;
  appearance: "admin" | "reception";
}) {
  const t = useTranslations("admin.gantt.quick");
  const reception = appearance === "reception";

  function parseAdults(raw: string) {
    const next = Number(raw);
    onAdultsChange(Number.isFinite(next) && next >= 1 ? Math.floor(next) : 1);
  }

  function parseChildren(raw: string) {
    const next = Number(raw);
    onChildrenChange(Number.isFinite(next) && next >= 0 ? Math.floor(next) : 0);
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:gap-3">
      <label className={reception ? "block text-sm" : labelClass}>
        {t("adultsLabel")}
        {reception ? (
          <input
            type="number"
            min={1}
            value={numAdults}
            onChange={(e) => parseAdults(e.target.value)}
            className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5"
          />
        ) : (
          <AdminInput
            type="number"
            min={1}
            className="mt-1"
            value={numAdults}
            onChange={(e) => parseAdults(e.target.value)}
          />
        )}
      </label>
      <label className={reception ? "block text-sm" : labelClass}>
        {t("childrenLabel")}
        {reception ? (
          <input
            type="number"
            min={0}
            value={numChildren}
            onChange={(e) => parseChildren(e.target.value)}
            className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5"
          />
        ) : (
          <AdminInput
            type="number"
            min={0}
            className="mt-1"
            value={numChildren}
            onChange={(e) => parseChildren(e.target.value)}
          />
        )}
      </label>
    </div>
  );
}
