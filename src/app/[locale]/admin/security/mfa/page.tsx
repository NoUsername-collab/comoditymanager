import { getTranslations } from "next-intl/server";
import { MFA_SETUP_PATH } from "@/lib/auth/admin-path";
import { localeRedirect as redirect } from "@/i18n/server-redirect";

/** Legacy route — enrollment lives in settings shell. */
export default async function AdminMfaSecurityRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const next =
    params.next?.startsWith("/") &&
    !params.next.startsWith("//") &&
    !params.next.includes("://")
      ? params.next
      : null;

  if (next) {
    await redirect(`${MFA_SETUP_PATH}?next=${encodeURIComponent(next)}`);
  }

  await redirect(MFA_SETUP_PATH);
}
