import { listAllTenants } from "@/services/platform-admin";
import { HospiraTenantList } from "@/components/hospira-admin/HospiraTenantList";

export default async function TenantsListPage() {
  const tenants = await listAllTenants();

  return <HospiraTenantList tenants={tenants} />;
}
