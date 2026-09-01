import { Link } from "@/i18n/navigation";
import { localeRedirect as redirect } from "@/i18n/server-redirect";
import { AdminQuickPanel } from "@/features/public-site/ui/AdminQuickPanel";
import { loadReceptiePage } from "@/features/public-site/loaders";
import { getAdminUser } from "@/lib/auth/require-admin";
import { getTranslations } from "next-intl/server";

export default async function ReceptiePage({
  searchParams,
}: {
  searchParams: Promise<{ confirmed?: string }>;
}) {
  const [t, admin, params, settings] = await Promise.all([
    getTranslations("public.receptie"),
    getAdminUser(),
    searchParams,
    loadReceptiePage(),
  ]);

  if (!admin) {
    await redirect("/admin/login?next=/receptie");
  }

  const checkInTime = settings?.default_check_in_time ?? "14:00";
  const checkOutTime = settings?.default_check_out_time ?? "11:00";

  return (
    <main className="receptie-page ml-content mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-6 public-page">
      <nav className="receptie-page__nav flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <Link href="/admin" className="receptie-page__back-admin font-semibold text-emerald-700 hover:text-emerald-900">
          {t("backToAdmin")}
        </Link>
        <Link href="/" className="receptie-page__back-site text-zinc-500 hover:text-zinc-800">
          {t("backToSite")}
        </Link>
      </nav>

      {params.confirmed === "1" && (
        <p className="rounded-lg bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
          {t("confirmedBanner")}
        </p>
      )}

      <AdminQuickPanel
        checkInTime={checkInTime}
        checkOutTime={checkOutTime}
        adminVerified
      />
    </main>
  );
}
