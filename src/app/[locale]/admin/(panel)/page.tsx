import "@/app/admin/admin-availability-route.css";
import "@/app/admin/admin-home.css";
import { AdminDashboard } from "@/components/admin/dashboard/AdminDashboard";
import { AvailabilityHomePreview } from "@/components/admin/availability/AvailabilityHomePreview";
import type { AvailabilityShellSearchParams } from "@/components/admin/availability/AvailabilityDashboardShell";
import { loadAdminDashboard } from "@/services/admin-dashboard";

export default async function AdminHomePage({
  searchParams,
}: {
  searchParams: Promise<AvailabilityShellSearchParams>;
}) {
  const availabilityParams = await searchParams;
  const data = await loadAdminDashboard();
  return (
    <AdminDashboard
      data={data}
      availabilityPanel={
        <AvailabilityHomePreview searchParams={availabilityParams} />
      }
    />
  );
}
