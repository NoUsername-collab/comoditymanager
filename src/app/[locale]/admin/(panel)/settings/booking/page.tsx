import { getLocale, getTranslations } from "next-intl/server";
import { localeRedirect as redirect } from "@/i18n/server-redirect";
import { BookingRulesSettingsPanel } from "@/components/admin/settings/BookingRulesSettingsPanel";
import { SettingsPageHeader } from "@/components/admin/settings/SettingsPageHeader";
import { SettingsSection } from "@/components/admin/settings/SettingsSection";
import { SettingsAlerts } from "@/components/admin/settings/SettingsAlerts";
import { getBookingRulesSettings } from "@/services/booking-rules-settings";
import {
  buildSettingsAlerts,
  loadSettingsStaffContext,
  pensionSettingsErrorMessage,
} from "@/lib/settings/page-context";

export const dynamic = "force-dynamic";

export default async function SettingsBookingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const [t, params, ctx, bookingRules, locale] = await Promise.all([
    getTranslations("admin.pages.settings"),
    searchParams,
    loadSettingsStaffContext(),
    getBookingRulesSettings().catch(() => null),
    getLocale(),
  ]);

  const { memberRole } = ctx.staff;
  const isOwner = memberRole === "owner";
  if (!isOwner && memberRole !== "admin") {
    await redirect("/admin/settings?statistics=forbidden");
  }

  const alerts = await buildSettingsAlerts(params);
  const error = pensionSettingsErrorMessage(ctx.pensionResult.error, t);
  if (error) alerts.push({ tone: "error", message: error });

  const settings = ctx.pensionResult.settings;
  if (!settings || !bookingRules) {
    return (
      <>
        <SettingsPageHeader title={t("navBooking")} />
        <SettingsAlerts alerts={alerts} />
      </>
    );
  }

  return (
    <>
      <SettingsAlerts alerts={alerts} />
      <SettingsPageHeader title={t("navBooking")} description={t("bookingSubtitle")} />
      <SettingsSection title={t("bookingTitle")} description={t("bookingSubtitle")}>
        <BookingRulesSettingsPanel
          settings={bookingRules}
          locale={locale === "bg" ? "bg" : locale === "en" ? "en" : "ro"}
        />
      </SettingsSection>
    </>
  );
}
