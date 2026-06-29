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
      <div className="admin-login-wrap">
        <div className="admin-login-brand">
          <span className="admin-login-brand__icon" aria-hidden>⚡</span>
          <span className="admin-login-brand__name">Zalmox</span>
        </div>
        <div className="admin-login-card w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 shadow-lg">
          <p className="admin-login-eyebrow">{t("eyebrow")}</p>
          <h1 className="admin-login-title">{t("title")}</h1>
          <p className="admin-login-lead">{t("lead")}</p>
          {signupSuccess && (
            <p className="admin-login-success-banner">
              {signupSuccess}
            </p>
          )}
          <AdminLoginForm
            next={next}
            initialError={authError}
            initialUsername={initialUsername}
          />
        </div>
        <Link href="/" className="admin-login-back">
          ← {t("backToSite")}
        </Link>
      </div>
    </main>
  );
}
