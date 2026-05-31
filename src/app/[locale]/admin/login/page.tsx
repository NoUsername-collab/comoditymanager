import { Link } from "@/i18n/navigation";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";
import { getTranslations } from "next-intl/server";

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
  const t = await getTranslations("admin.login");
  const params = await searchParams;
  const next = params.next?.startsWith("/admin") ? params.next : "/admin";
  const authError =
    params.error === "unauthorized" ? t("notMemberOfPension") : null;
  const signupSuccess = params.signup === "1" ? t("signupSuccess") : null;
  const initialUsername = params.email?.trim() ?? "";

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-100 p-6">
      <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-8 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-amber-700">
          {t("eyebrow")}
        </p>
        <h1 className="mt-1 text-2xl font-semibold">{t("title")}</h1>
        <p className="mt-2 text-sm text-zinc-500">{t("lead")}</p>
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
        <Link
          href="/"
          className="mt-6 block text-center text-xs text-zinc-500 hover:text-zinc-800"
        >
          {t("backToSite")}
        </Link>
      </div>
    </main>
  );
}
