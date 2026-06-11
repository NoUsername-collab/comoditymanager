import { bindTenantContextFromRequest } from "@/lib/tenant/bind-request-context";
import "@/app/guest-app.css";

export default async function GuestAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await bindTenantContextFromRequest();
  return children;
}
