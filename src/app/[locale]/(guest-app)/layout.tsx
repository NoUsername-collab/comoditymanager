import { tryBindTenantContextFromRequest } from "@/lib/tenant/bind-request-context";
import { AreaMessages } from "@/i18n/AreaMessages";
import "@/styles/features/guest/guest-app.css";
import "@/styles/features/guest/guest-app-loyalty.css";
import "@/styles/features/layout/mobile-public.css";

export default async function GuestAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // /stay on platform apex (test.zalmox.app) has no tenant — child routes show access unavailable.
  await tryBindTenantContextFromRequest();
  return <AreaMessages only={["guestApp"]}>{children}</AreaMessages>;
}
