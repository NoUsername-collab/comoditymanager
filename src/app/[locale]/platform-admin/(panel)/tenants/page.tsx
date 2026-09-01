import { loadPlatformTenantsPage } from "@/features/platform-admin/loaders";
import { TenantList } from "@/features/platform-admin/ui/TenantList";

export default async function TenantsListPage() {
  const tenants = await loadPlatformTenantsPage();

  return <TenantList tenants={tenants} />;
}
