import { AdminRetroPageFrame } from "@/components/admin/retro/AdminRetroPageFrame";
import { AvailabilityDashboardShell } from "@/components/admin/availability/AvailabilityDashboardShell";

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
    feat?: string;
  }>;
}) {
  const params = await searchParams;

  return (
    <AdminRetroPageFrame
      title="Disponibilitate — Casa Emil"
      description="Heat map, KPI, weekend-uri libere, filtru clădire, interval Shift+click, live."
      className="mx-auto max-w-[1600px]"
    >
      <AvailabilityDashboardShell searchParams={params} basePath="/admin/disponibilitate" />
    </AdminRetroPageFrame>
  );
}
