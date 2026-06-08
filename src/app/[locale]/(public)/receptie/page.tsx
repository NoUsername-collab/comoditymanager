import { Link } from "@/i18n/navigation";
import { localeRedirect as redirect } from "@/i18n/server-redirect";
import { AdminQuickPanel } from "@/components/calendar/AdminQuickPanel";
import { getPensionSettings } from "@/services/pension-settings";
import { getAdminUser } from "@/lib/auth/require-admin";
import { getTranslations } from "next-intl/server";

export default async function ReceptiePage({
  searchParams,
}: {
  searchParams: Promise<{ confirmed?: string }>;
}) {
  const t = await getTranslations("public.receptie");
  const admin = await getAdminUser();
  if (!admin) {
    await redirect("/admin/login?next=/receptie");
  }

  const params = await searchParams;
  let settings: Awaited<ReturnType<typeof getPensionSettings>> = null;
  try {
    settings = await getPensionSettings();
  } catch {
    settings = null;
  }

  const checkInTime = settings?.default_check_in_time ?? "14:00";
  const checkOutTime = settings?.default_check_out_time ?? "11:00";

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-10 public-page">
      <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-800">
        {t("backToSite")}
      </Link>

      {params.confirmed === "1" && (
        <p className="rounded-lg bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
          {t("confirmedBanner")}
        </p>
      )}

      <AdminQuickPanel checkInTime={checkInTime} checkOutTime={checkOutTime} />
    </main>
  );
}
