import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { ResetPasswordForm } from "@/components/admin/auth/ResetPasswordForm";
import "@/app/admin-login.css";

export default async function ResetPasswordPage() {
  const t = await getTranslations("admin.resetPassword");

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
          <ResetPasswordForm />
        </div>
        <Link href="/admin/login" className="admin-login-back">
          {t("backToLogin")}
        </Link>
      </div>
    </main>
  );
}
