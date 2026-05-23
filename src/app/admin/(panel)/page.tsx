import { AdminDashboard } from "@/components/admin/dashboard/AdminDashboard";
import { loadAdminDashboard } from "@/services/admin-dashboard";

export default async function AdminHomePage() {
  const data = await loadAdminDashboard();
  return <AdminDashboard data={data} />;
}
