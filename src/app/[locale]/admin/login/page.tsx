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
    params.next?.startsWith("/admin") || params.next?.startsWith("/platform-admin")
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

  const features = [
    t("featureCalendar"),
    t("featureGuests"),
    t("featureReports"),
    t("featureTheme"),
  ] as const;

  return (
    <main className="admin-login-page ml-content min-h-dvh flex items-center justify-center p-4">
      <div className="admin-login-shell">
        {/* Left panel — brand + features */}
        <div className="admin-login-panel admin-login-panel--left" aria-hidden="true">
          <div className="admin-login-panel__brand">
            <span className="admin-login-panel__icon">⚡</span>
            <span className="admin-login-panel__name">Zalmox</span>
          </div>
          <p className="admin-login-panel__tagline">{t("lead")}</p>
          <ul className="admin-login-panel__features">
            {features.map((f) => (
              <li key={f} className="admin-login-panel__feature">
                <span className="admin-login-panel__feature-check" aria-hidden>✓</span>
                {f}
              </li>
            ))}
          </ul>
        </div>

        {/* Right panel — form */}
        <div className="admin-login-panel admin-login-panel--right">
          <div className="admin-login-brand admin-login-brand--mobile">
            <span className="admin-login-brand__icon" aria-hidden>⚡</span>
            <span className="admin-login-brand__name">Zalmox</span>
          </div>
          <p className="admin-login-eyebrow">{t("eyebrow")}</p>
          <h1 className="admin-login-title">{t("title")}</h1>
          {signupSuccess && (
            <p className="admin-login-success-banner">{signupSuccess}</p>
          )}
          <AdminLoginForm
            next={next}
            initialError={authError}
            initialUsername={initialUsername}
          />
          <p className="admin-login-signup-cta">
            {t("signupCta")}{" "}
            <Link href="/signup" className="admin-login-signup-link">
              {t("signupLink")}
            </Link>
          </p>
          <Link href="/" className="admin-login-back">
            {t("backToSite")}
          </Link>
        </div>
      </div>
    </main>
  );
}
