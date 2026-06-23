import { Link } from "@/i18n/navigation";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";
import { getTranslations } from "next-intl/server";
import "@/app/admin-login.css";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    next?: string;
    error?: string;
    signup?: string;
    email?: string;
  }>;
}) {
  const [t, params] = await Promise.all([
    getTranslations("admin.login"),
    searchParams,
  ]);
  const next =
    params.next?.startsWith("/admin") || params.next?.startsWith("/hospira-admin")
      ? params.next
      : "/admin";
  const authError =
    params.error === "unauthorized"
      ? t("notMemberOfPension")
      : params.error === "no_tenant"
        ? t("noTenantLinked")
        : null;
  const signupSuccess = params.signup === "1" ? t("signupSuccess") : null;
  const initialUsername = params.email?.trim() ?? "";

  return (
    <main className="admin-login-page ml-content flex min-h-dvh items-center justify-center p-4">
      <div className="admin-login-card w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-blue-700">
          {t("eyebrow")}
        </p>
        <h1 className="mt-1 text-xl font-semibold text-zinc-900">{t("title")}</h1>
        <p className="admin-login-lead mt-2 text-sm">{t("lead")}</p>
        {signupSuccess && (
          <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            {signupSuccess}
          </p>
        )}
        <AdminLoginForm
          next={next}
          initialError={authError}
          initialUsername={initialUsername}
        />
        <Link href="/" className="admin-login-back">
          {t("backToSite")}
        </Link>
      </div>
    </main>
  );
}
