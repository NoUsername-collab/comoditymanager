"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { MonthAvailabilityKpis } from "@/services/availability-month";
import { AdminFloatingPanel } from "@/components/admin/overlay/AdminFloatingPanel";

type KpiKey = "relaxed" | "full" | "min" | "cereri";

export function AvailabilityKpiStrip({ kpis }: { kpis: MonthAvailabilityKpis }) {
  const [kpiHelp, setKpiHelp] = useState<KpiKey | null>(null);
  const tAvail = useTranslations("admin.availabilityDashboard");
  const locale = useLocale();

  const kpiHelpMap: Record<KpiKey, { title: string; body: string }> = {
    relaxed: { title: tAvail("kpiRelaxedTitle"), body: tAvail("kpiRelaxedBody") },
    full: { title: tAvail("kpiFullTitle"), body: tAvail("kpiFullBody") },
    min: { title: tAvail("kpiMinTitle"), body: tAvail("kpiMinBody") },
    cereri: { title: tAvail("kpiRequestsTitle"), body: tAvail("kpiRequestsBody") },
  };

  return (
    <>
      <div className="avail-kpi-strip">
        {(
          [
            ["relaxed", kpis.days_relaxed, tAvail("kpiRelaxedLabel"), "avail-kpi-card--good"],
            ["full", kpis.days_full, tAvail("kpiFullLabel"), ""],
            [
              "min",
              kpis.min_free_rooms,
              tAvail("kpiMinLabel"),
              "",
              kpis.min_free_day_iso
                ? tAvail("onDate", {
                    date: new Date(kpis.min_free_day_iso).toLocaleDateString(locale),
                  })
                : undefined,
            ],
            [
              "cereri",
              kpis.unassigned_nights,
              tAvail("kpiUnassignedNightsLabel"),
              kpis.unassigned_nights > 0 ? "avail-kpi-card--alert" : "",
            ],
          ] as const
        ).map(([key, value, label, extra, sub]) => (
          <button
            key={key}
            type="button"
            className={["avail-kpi-card text-left", extra].filter(Boolean).join(" ")}
            onClick={() => setKpiHelp(key)}
            title={tAvail("clickForExplanation")}
          >
            <p className="avail-kpi-card__value">{value}</p>
            <p className="avail-kpi-card__label">
              {label}
              {sub && (
                <span className="block font-normal normal-case text-zinc-500">{sub}</span>
              )}
            </p>
          </button>
        ))}
      </div>

      {kpis.vs_prev_full_delta !== 0 && (
        <p className="text-xs text-zinc-600">
          {tAvail("vsLastMonth")}:{" "}
          <strong
            className={
              kpis.vs_prev_full_delta > 0 ? "text-rose-700" : "text-emerald-700"
            }
          >
            {kpis.vs_prev_full_delta > 0 ? "+" : ""}
            {kpis.vs_prev_full_delta} {tAvail("fullDays")}
          </strong>
        </p>
      )}

      <AdminFloatingPanel
        open={!!kpiHelp && !!kpiHelpMap[kpiHelp]}
        onClose={() => setKpiHelp(null)}
        title={kpiHelp ? kpiHelpMap[kpiHelp].title : undefined}
        variant="modal"
        width={400}
      >
        {kpiHelp && (
          <p className="admin-alert-dialog__message">{kpiHelpMap[kpiHelp].body}</p>
        )}
      </AdminFloatingPanel>
    </>
  );
}
