import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import {
  getPensionSettings,
  pensionAppearanceSettings,
} from "@/services/pension-settings";
import { AdminPalettePicker } from "@/components/admin/settings/AdminPalettePicker";
import { AdminDisplayLayoutPicker } from "@/components/admin/settings/AdminDisplayLayoutPicker";
import { AdminFxSettings } from "@/components/admin/settings/AdminFxSettings";
import { AdminPendingForm } from "@/components/admin/feedback/AdminPendingForm";
import { AdminSubmitButton } from "@/components/admin/feedback/AdminSubmitButton";
import { AdminActivityHistoryPanel } from "@/components/admin/activity/AdminActivityHistoryPanel";
import { CheckinSettingsPanel } from "@/components/admin/checkin/CheckinSettingsPanel";
import { StatisticsSettingsPanel } from "@/components/admin/settings/StatisticsSettingsPanel";
import { canAccessStatistics } from "@/domain/settings/statistics-visibility";
import { pensionStatisticsVisibility } from "@/services/pension-settings";
import { getCheckinSettings, DEFAULT_CHECKIN_SETTINGS } from "@/services/checkin";
import { AdminCurrentThemeSummary } from "@/components/admin/settings/AdminCurrentThemeSummary";
import { requireStaff } from "@/lib/auth/require-staff";
import { SettingsPageHeader } from "@/components/admin/settings/SettingsPageHeader";
import { SettingsSection } from "@/components/admin/settings/SettingsSection";
import { SettingsOverview } from "@/components/admin/settings/SettingsOverview";
import { SettingsAlerts, type SettingsAlert } from "@/components/admin/settings/SettingsAlerts";
import { BookingRulesSettingsPanel } from "@/components/admin/settings/BookingRulesSettingsPanel";
import { getBookingRulesSettings } from "@/services/booking-rules-settings";
import { getLocale } from "next-intl/server";
import { updateAppearanceSettingsAction } from "./actions";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{
    saved?: string;
    location?: string;
    section?: string;
    statistics?: string;
  }>;
}) {
  const staffPromise = requireStaff();
  const [t, params, staff, checkinSettings, bookingRules, locale, pensionResult] =
    await Promise.all([
      getTranslations("admin.pages.settings"),
      searchParams,
      staffPromise,
      getCheckinSettings().catch(() => DEFAULT_CHECKIN_SETTINGS),
      getBookingRulesSettings().catch(() => null),
      getLocale(),
      (async () => {
        try {
          return {
            settings: await getPensionSettings(),
            error: null as string | null,
          };
        } catch (e) {
          return {
            settings: null as Awaited<ReturnType<typeof getPensionSettings>>,
            error: e instanceof Error ? e.message : "generic",
          };
        }
      })(),
    ]);

  const { role, memberRole } = staff;
  const isOwner = memberRole === "owner";
  const { settings } = pensionResult;
  const error =
    pensionResult.error === "generic" ? t("genericError") : pensionResult.error;

  const statisticsVisibility = pensionStatisticsVisibility(settings);
  const statisticsAccess = canAccessStatistics(memberRole, statisticsVisibility);

  const appearance = settings ? pensionAppearanceSettings(settings) : null;
  const inlineSections = new Set([
    "overview",
    "appearance",
    "preferences",
    "statistics",
    "booking",
    "checkin",
    "history",
  ]);
  const section = inlineSections.has(params.section ?? "overview")
    ? (params.section ?? "overview")
    : "overview";

  const alerts: SettingsAlert[] = [
    params.saved === "1" ? { tone: "success", message: t("saved") } : null,
    params.location === "locked"
      ? { tone: "warning", message: t("locationLocked") }
      : null,
    params.location === "forbidden"
      ? { tone: "warning", message: t("locationForbidden") }
      : null,
    params.location === "closed"
      ? {
          tone: "info",
          message: isOwner ? t("locationClosedOwner") : t("locationClosed"),
        }
      : null,
    params.statistics === "forbidden"
      ? { tone: "warning", message: t("statisticsForbidden") }
      : null,
    error ? { tone: "error", message: error } : null,
  ].filter((alert): alert is SettingsAlert => alert !== null);

  if (!settings && !error) {
    return (
      <>
        <SettingsPageHeader title={t("navOverview")} description={t("notConfigured")} />
        <SettingsAlerts alerts={alerts} />
        <p className="settings-empty">{t("notConfigured")}</p>
      </>
    );
  }

  if (!settings || !appearance) {
    return (
      <>
        <SettingsPageHeader title={t("navOverview")} />
        <SettingsAlerts alerts={alerts} />
      </>
    );
  }

  return (
    <>
      <SettingsAlerts alerts={alerts} />

      {section === "overview" || !section ? (
        <>
          <SettingsPageHeader
            title={t("navOverview")}
            description={t("overviewIntro")}
          />
          <SettingsOverview
            role={role}
            memberRole={memberRole ?? "operator"}
            statisticsAccess={statisticsAccess}
            propertyName={settings.display_name}
            checkInTime={settings.default_check_in_time}
            checkOutTime={settings.default_check_out_time}
            themeSummary={<AdminCurrentThemeSummary />}
          />
        </>
      ) : null}

      {section === "appearance" ? (
        <>
          <SettingsPageHeader
            title={t("navAppearance")}
            description={t("visualsSubtitle")}
          />
          <AdminPendingForm action={updateAppearanceSettingsAction} className="settings-form-stack">
            <input type="hidden" name="id" value={settings.id} />
            <SettingsSection title={t("visualsTitle")} description={t("visualsSubtitle")}>
              <AdminDisplayLayoutPicker />
              <AdminPalettePicker />
            </SettingsSection>
            <div className="settings-form-stack__submit">
              <AdminSubmitButton type="submit" className="settings-form-stack__btn">
                {t("saveTheme")}
              </AdminSubmitButton>
            </div>
          </AdminPendingForm>
        </>
      ) : null}

      {section === "preferences" ? (
        <>
          <SettingsPageHeader
            title={t("navPreferences")}
            description={t("fxSubtitle")}
          />
          <SettingsSection title={t("fxTitle")} description={t("fxSubtitle")}>
            <AdminFxSettings />
          </SettingsSection>
        </>
      ) : null}

      {section === "statistics" && (isOwner || statisticsAccess) ? (
        <>
          <SettingsPageHeader
            title={t("navStatistics")}
            description={t("statisticsSubtitle")}
          />
          <SettingsSection
            title={t("statisticsTitle")}
            description={t("statisticsSubtitle")}
          >
            <StatisticsSettingsPanel
              visibility={statisticsVisibility}
              canConfigure={isOwner}
              canAccess={statisticsAccess}
            />
          </SettingsSection>
        </>
      ) : null}

      {section === "booking" && (isOwner || memberRole === "admin") && bookingRules ? (
        <>
          <SettingsPageHeader
            title={t("navBooking")}
            description={t("bookingSubtitle")}
          />
          <SettingsSection title={t("bookingTitle")} description={t("bookingSubtitle")}>
            <BookingRulesSettingsPanel
              settings={bookingRules}
              locale={locale === "bg" ? "bg" : locale === "en" ? "en" : "ro"}
            />
          </SettingsSection>
        </>
      ) : null}

      {section === "checkin" && role === "admin" ? (
        <>
          <SettingsPageHeader
            title={t("navCheckin")}
            description={t("checkin.docRuleDesc")}
          />
          <SettingsSection
            title={t("checkin.title")}
            description={t("checkin.docRuleDesc")}
          >
            <CheckinSettingsPanel settings={checkinSettings} />
          </SettingsSection>
        </>
      ) : null}

      {section === "history" ? (
        <>
          <SettingsPageHeader
            title={t("navHistory")}
            description={t("historySubtitle")}
          />
          <SettingsSection title={t("historyTitle")} description={t("historySubtitle")}>
            <Suspense
              fallback={
                <div
                  className="settings-skeleton"
                  aria-busy="true"
                  aria-label={t("loading")}
                />
              }
            >
              <AdminActivityHistoryPanel />
            </Suspense>
          </SettingsSection>
        </>
      ) : null}
    </>
  );
}
