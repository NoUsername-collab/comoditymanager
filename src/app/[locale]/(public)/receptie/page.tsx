import { Link } from "@/i18n/navigation";
import { localeRedirect as redirect } from "@/i18n/server-redirect";
import { AdminQuickPanel } from "@/features/public-site/ui/AdminQuickPanel";
import { loadReceptionPage } from "@/features/public-site/loaders";
import { getAdminUser } from "@/lib/auth/require-admin";
import { getTranslations } from "next-intl/server";
import { resolvePensionStayTimes } from "@/lib/constants";
import "@/styles/features/admin/staff-stay-create.css";

export default async function ReceptionPage({
  searchParams,
}: {
  searchParams: Promise<{ confirmed?: string }>;
}) {
  const [t, admin, params, settings] = await Promise.all([
    getTranslations("public.reception"),
    getAdminUser(),
    searchParams,
    loadReceptionPage(),
  ]);

  if (!admin) {
    await redirect("/admin/login?next=/receptie");
  }

  const { checkIn: checkInTime, checkOut: checkOutTime } =
    resolvePensionStayTimes(settings);

  return (
    <main className="reception-page ml-content mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-6 public-page">
      <nav className="reception-page__nav flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <Link href="/admin" className="reception-page__back-admin font-semibold text-emerald-700 hover:text-emerald-900">
          {t("backToAdmin")}
        </Link>
        <Link href="/" className="reception-page__back-site text-zinc-500 hover:text-zinc-800">
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
