import { ensureTenantContextFromRequest } from "@/lib/tenant/bind-request-context";

/**
 * Re-runs on every client navigation within admin (unlike layout.tsx).
 * Binds tenant context before page/server-action segments that skip layout.
 */
export default async function AdminPanelTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  await ensureTenantContextFromRequest();
  return children;
}
