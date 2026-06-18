import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { isMfaMandatoryForUser } from "@/lib/auth/mfa-policy";
import { getMfaAccessState } from "@/lib/auth/mfa-session";
import { resolveStaffRole } from "@/lib/auth/tenant-staff";
import { resolveRequestTenant } from "@/lib/tenant/active";
import { getTenantMemberRole } from "@/services/tenant-members";
import { MfaEnrollmentPanel } from "@/components/admin/settings/MfaEnrollmentPanel";
import { localeRedirect as redirect } from "@/i18n/server-redirect";

export default async function AdminMfaSecurityPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const [t, params, supabase] = await Promise.all([
    getTranslations("admin.mfa"),
    searchParams,
    createClient(),
  ]);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    await redirect("/admin/login?next=/admin/security/mfa");
    throw new Error("auth_required");
  }

  const authUser = user;

  const tenant = await resolveRequestTenant();
  const role = await resolveStaffRole(authUser);
  const memberRole = tenant ? await getTenantMemberRole(tenant.id, authUser.id) : null;

  if (tenant && !role) {
    await redirect("/admin/login?error=unauthorized");
  }

  const mfaState = await getMfaAccessState(supabase, {
    email: authUser.email,
    memberRole,
  });

  const next =
    params.next?.startsWith("/") &&
    !params.next.startsWith("//") &&
    !params.next.includes("://")
      ? params.next
      : "/admin";

  if (mfaState.kind === "ok") {
    await redirect(next);
  }

  const mandatory = isMfaMandatoryForUser({ email: authUser.email, memberRole });

  return (
    <main className="admin-login-page ml-content flex min-h-dvh items-center justify-center p-4">
      <div className="admin-login-card w-full max-w-md rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-blue-700">
          {t("securityEyebrow")}
        </p>
        <h1 className="mt-1 text-xl font-semibold text-zinc-900">{t("securityTitle")}</h1>
        <p className="admin-login-lead mt-2 text-sm">{t("securityLead")}</p>
        <MfaEnrollmentPanel mandatory={mandatory} next={next} />
        {!mandatory ? (
          <Link href={next} className="admin-login-back mt-4 inline-block">
            {t("skipForNow")}
          </Link>
        ) : null}
      </div>
    </main>
  );
}
