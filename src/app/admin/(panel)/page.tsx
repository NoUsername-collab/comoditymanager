import { AdminDashboard } from "@/components/admin/dashboard/AdminDashboard";
import {
  AvailabilityDashboardShell,
  type AvailabilityShellSearchParams,
} from "@/components/admin/availability/AvailabilityDashboardShell";
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
        <AvailabilityDashboardShell
          searchParams={availabilityParams}
          basePath="/admin"
          anchorHash="#disponibilitate"
        />
      }
    />
  );
}
