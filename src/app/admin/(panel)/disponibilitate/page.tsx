import { Suspense } from "react";
import Link from "next/link";
import { AvailabilityDashboard } from "@/components/admin/availability/AvailabilityDashboard";
import { AdminRetroPageFrame } from "@/components/admin/retro/AdminRetroPageFrame";
import { RetroXpWindow } from "@/components/admin/retro/RetroXpWindow";
import { loadAvailabilityDashboard } from "@/services/availability-month";
import { mondayOfWeekIso } from "@/domain/availability/week-range";
import { todayIso } from "@/lib/stay-dates";

function buildQuery(year: number, month: number, day?: string) {
  const p = new URLSearchParams({ y: String(year), m: String(month) });
  if (day) p.set("day", day);
  return p.toString();
}

export default async function AdminDisponibilitatePage({
  searchParams,
}: {
  searchParams: Promise<{
    y?: string;
    m?: string;
    day?: string;
    building?: string;
    view?: string;
    ws?: string;
  }>;
}) {
  const params = await searchParams;
  const now = new Date();
  const year = Number(params.y) || now.getFullYear();
  const month = params.m !== undefined ? Number(params.m) : now.getMonth();
  const buildingId = params.building?.length ? params.building : null;
  const view = params.view === "week" ? "week" : "month";
  const weekStart =
    params.ws ?? (view === "week" ? mondayOfWeekIso(params.day ?? todayIso()) : null);

  const prevM = month === 0 ? 11 : month - 1;
  const prevY = month === 0 ? year - 1 : year;
  const nextM = month === 11 ? 0 : month + 1;
  const nextY = month === 11 ? year + 1 : year;

  let dashboard: Awaited<ReturnType<typeof loadAvailabilityDashboard>> | null = null;
  let error: string | null = null;

  try {
    dashboard = await loadAvailabilityDashboard(year, month, buildingId);
  } catch (e) {
    error = e instanceof Error ? e.message : "Eroare";
  }

  return (
    <AdminRetroPageFrame
      title="Disponibilitate — Casa Emil"
      description="Heat map, KPI, weekend-uri libere, filtru clădire, interval Shift+click, live."
      className="mx-auto max-w-[1600px]"
    >
      {error && (
        <p className="mb-4 border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </p>
      )}

      {dashboard && (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Link
                href={`/admin/disponibilitate?${buildQuery(prevY, prevM)}${buildingId ? `&building=${buildingId}` : ""}${view === "week" ? "&view=week" : ""}`}
                className="border border-zinc-300 px-3 py-2 text-sm font-medium"
              >
                ←
              </Link>
              <span className="px-2 py-1.5 text-sm font-medium capitalize">
                {dashboard.title}
              </span>
              <Link
                href={`/admin/disponibilitate?${buildQuery(nextY, nextM)}${buildingId ? `&building=${buildingId}` : ""}${view === "week" ? "&view=week" : ""}`}
                className="border border-zinc-300 px-3 py-2 text-sm font-medium"
              >
                →
              </Link>
            </div>
            <p className="text-sm">
              <strong>{dashboard.total_rooms}</strong> camere
              {buildingId && " (filtru clădire)"}
            </p>
          </div>

          <RetroXpWindow title="Heat map & KPI" className="w-full">
            <Suspense
              fallback={
                <div className="border border-dashed border-zinc-200 p-12 text-center text-sm text-zinc-500">
                  Se încarcă panoul…
                </div>
              }
            >
              <AvailabilityDashboard
                dashboard={dashboard}
                initialDay={params.day}
                buildingId={buildingId}
                view={view}
                weekStart={weekStart}
              />
            </Suspense>
          </RetroXpWindow>
        </>
      )}
    </AdminRetroPageFrame>
  );
}
