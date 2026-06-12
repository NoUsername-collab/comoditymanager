import { tryBindTenantContextFromRequest } from "@/lib/tenant/bind-request-context";
import "@/app/guest-app.css";

export default async function GuestAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // /stay on platform apex (test.hospira.ro) has no tenant — child routes show access unavailable.
  await tryBindTenantContextFromRequest();
  return children;
}
