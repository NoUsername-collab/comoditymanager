import Link from "next/link";
import { RetroXpWindow } from "@/components/admin/retro/RetroXpWindow";
import { AdminMetricHint } from "@/components/admin/ui/AdminMetricHint";
import type { MonthComparison } from "@/domain/statistics/month-compare";
import { formatRon } from "@/domain/invoice/informal-invoice";

function deltaLabel(delta: number | null, suffix = "%"): string {
  if (delta == null) return "—";
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta}${suffix}`;
}

function roomNightCapacityHint(activeRooms: number, daysInMonth: number): string {
  return `Capacitate lunară = camere active × zilele lunii. Exemplu: ${activeRooms} camere × ${daysInMonth} zile = ${activeRooms * daysInMonth} camere-nopți posibile. Nu înseamnă ${activeRooms} camere fizice, ci câte nopți poți vinde în total luna asta.`;
}

function roomNightOccupiedHint(): string {
  return "Fiecare cameră ocupată o noapte = 1 cameră-noapte. 2 camere × 4 nopți = 8 camere-nopți. Se numără doar rezervările confirmate.";
}

function occupancyHint(activeRooms: number, daysInMonth: number): string {
  return `Procent din camere-nopțile posibile luna asta (${activeRooms} cam. × ${daysInMonth} zile). 100% = toate camerele pline în fiecare noapte a lunii.`;
}

export function MonthCompareCards({ compare }: { compare: MonthComparison }) {
  const { current, previousYear } = compare;
  const py = previousYear;
  const capHint = roomNightCapacityHint(current.activeRooms, current.daysInMonth);

  return (
    <RetroXpWindow
      title={`${current.monthLabel} ${current.year} — statistici`}
      bodyClassName="admin-home-window-body"
    >
      <section className="admin-panel-section !border-0 !bg-transparent !p-0 !shadow-none">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="admin-panel-section__title">
              {current.monthLabel} {current.year}
            </h2>
            <p className="admin-panel-section__desc">
              Comparativ cu aceeași lună anul trecut
              {py ? ` (${py.monthLabel} ${py.year})` : ""}
            </p>
          </div>
          <Link
            href="/admin/statistics"
            className="text-sm font-medium text-emerald-800 hover:underline"
          >
            Statistici complete →
          </Link>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Ocupare luna curentă"
            hint={occupancyHint(current.activeRooms, current.daysInMonth)}
            value={`${current.occupancyPct}%`}
            sub={
              py
                ? `Anul trecut: ${py.occupancyPct}% · ${deltaLabel(compare.occupancyDeltaPct)}`
                : "Fără date anul trecut"
            }
          />
          <MetricCard
            label="Sejururi confirmate"
            hint="Rezervări confirmate care se suprapun cu luna curentă (sosire, ședere sau plecare în lună)."
            value={String(current.confirmedStays)}
            sub={py ? `Anul trecut: ${py.confirmedStays}` : undefined}
          />
          <MetricCard
            label="Venituri luna curentă"
            hint="Suma prețurilor totale înregistrate la confirmare, pentru sejururile din luna curentă."
            value={current.revenueComplete ? formatRon(current.revenueRon) : "—"}
            sub={
              py?.revenueComplete && current.revenueComplete
                ? `Anul trecut: ${formatRon(py.revenueRon)} · ${deltaLabel(compare.revenueDeltaPct)}`
                : !current.revenueComplete
                  ? "Completează prețul la confirmare"
                  : py
                    ? `Anul trecut: ${py.revenueComplete ? formatRon(py.revenueRon) : "—"}`
                    : undefined
            }
          />
          <MetricCard
            label="Camere-nopți ocupate"
            hint={roomNightOccupiedHint()}
            value={String(current.occupiedRoomNights)}
            sub={
              py
                ? `Anul trecut: ${py.occupiedRoomNights} / ${py.capacityRoomNights} c-nopți`
                : `${current.activeRooms} cam. × ${current.daysInMonth} zile = ${current.capacityRoomNights} posibile`
            }
            subHint={capHint}
          />
        </div>
      </section>
    </RetroXpWindow>
  );
}

function MetricCard({
  label,
  value,
  sub,
  hint,
  subHint,
}: {
  label: string;
  value: string;
  sub?: string;
  hint?: string;
  subHint?: string;
}) {
  return (
    <div className="admin-metric-card">
      <p className="admin-metric-card__label">
        <span>{label}</span>
        {hint ? <AdminMetricHint text={hint} label={`Despre: ${label}`} /> : null}
      </p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-zinc-900">{value}</p>
      {sub ? (
        <p className="mt-1 text-xs text-zinc-500">
          {sub}
          {subHint ? (
            <>
              {" "}
              <AdminMetricHint text={subHint} label="Cum se calculează capacitatea" />
            </>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}
