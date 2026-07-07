import { listAllTenants } from "@/services/platform-admin";
import { TenantList } from "@/components/platform-admin/TenantList";

export default async function TenantsListPage() {
  const tenants = await listAllTenants();

  return <TenantList tenants={tenants} />;
}
