import { Suspense } from "react";
import "@/styles/features/admin/admin-availability-route.css";
import "@/styles/features/admin/admin-home.css";
import { AdminDashboard } from "@/features/availability/ui/AdminDashboard";
import { AvailabilityHomePreview } from "@/features/availability/ui/AvailabilityHomePreview";
import type { AvailabilityShellSearchParams } from "@/features/availability/ui/AvailabilityDashboardShell";
import { loadAdminHomePage } from "@/features/availability/loaders";

function AvailabilityHomePreviewFallback() {
  return (
    <div
      className="admin-route-skeleton admin-home-avail-skeleton rounded-xl border border-neutral-800 bg-neutral-900/60 p-4"
      aria-hidden
      aria-busy="true"
    >
      <div className="admin-route-skeleton__row h-4 w-32" />
      <div className="mt-4 grid grid-cols-7 gap-1">
        {Array.from({ length: 28 }, (_, i) => (
          <div key={i} className="admin-route-skeleton__card aspect-square" />
        ))}
      </div>
    </div>
  );
}

export default async function AdminHomePage({
  searchParams,
}: {
  searchParams: Promise<AvailabilityShellSearchParams>;
}) {
  const [availabilityParams, data] = await Promise.all([
    searchParams,
    loadAdminHomePage(),
  ]);
  return (
    <AdminDashboard
      data={data}
      availabilityPanel={
        <Suspense fallback={<AvailabilityHomePreviewFallback />}>
          <AvailabilityHomePreview searchParams={availabilityParams} />
        </Suspense>
      }
    />
  );
}
