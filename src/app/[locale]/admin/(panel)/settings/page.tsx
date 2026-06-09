import { Suspense } from "react";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import {
  getPensionSettings,
  pensionAppearanceSettings,
} from "@/services/pension-settings";
import { AdminPalettePicker } from "@/components/admin/settings/AdminPalettePicker";
import { AdminDisplayLayoutPicker } from "@/components/admin/settings/AdminDisplayLayoutPicker";
import { SettingsSlidePanel } from "@/components/admin/settings/SettingsSlidePanel";
import { AdminRetroPageFrame } from "@/components/admin/retro/AdminRetroPageFrame";
import { AdminFxSettings } from "@/components/admin/settings/AdminFxSettings";
import { AdminPendingForm } from "@/components/admin/feedback/AdminPendingForm";
import { AdminSubmitButton } from "@/components/admin/feedback/AdminSubmitButton";
import { AdminLocationUnlockForm, AdminLocationLockButton } from "@/components/admin/settings/AdminLocationUnlockForm";
import { AdminActivityHistoryPanel } from "@/components/admin/activity/AdminActivityHistoryPanel";
import { CheckinSettingsPanel } from "@/components/admin/checkin/CheckinSettingsPanel";
import { StatisticsSettingsPanel } from "@/components/admin/settings/StatisticsSettingsPanel";
import { canAccessStatistics } from "@/domain/settings/statistics-visibility";
import { pensionStatisticsVisibility } from "@/services/pension-settings";
import { getCheckinSettings, DEFAULT_CHECKIN_SETTINGS } from "@/services/checkin";
import { AdminCurrentThemeSummary } from "@/components/admin/settings/AdminCurrentThemeSummary";
import { locationAccessibleForMemberRole } from "@/lib/auth/location-unlock";
import { requireStaff } from "@/lib/auth/require-staff";
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
  const [t, params, staff, checkinSettings, pensionResult, locationUnlocked] =
    await Promise.all([
      getTranslations("admin.pages.settings"),
      searchParams,
      staffPromise,
      getCheckinSettings().catch(() => DEFAULT_CHECKIN_SETTINGS),
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
      staffPromise.then((ctx) =>
        locationAccessibleForMemberRole(ctx.memberRole)
      ),
    ]);

  const { role, memberRole } = staff;
  const isOwner = memberRole === "owner";
  const { settings } = pensionResult;
  const error =
    pensionResult.error === "generic" ? t("genericError") : pensionResult.error;

  const statisticsVisibility = pensionStatisticsVisibility(settings);
  const statisticsAccess = canAccessStatistics(memberRole, statisticsVisibility);

  const appearance = settings ? pensionAppearanceSettings(settings) : null;

  return (
    <AdminRetroPageFrame
      title={t("title")}
      className="admin-settings-page w-full max-w-none"
      description={role === "operator" ? t("descriptionOperator") : t("descriptionAdmin")}
    >
      {params.saved === "1" && (
        <p className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {t("saved")}
        </p>
      )}

      {params.location === "locked" && (
        <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {t("locationLocked")}
        </p>
      )}

      {params.location === "forbidden" && (
        <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {t("locationForbidden")}
        </p>
      )}

      {params.location === "closed" && (
        <p className="mb-4 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
          {isOwner ? t("locationClosedOwner") : t("locationClosed")}
        </p>
      )}

      {params.statistics === "forbidden" && (
        <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {t("statisticsForbidden")}
        </p>
      )}

      {error && <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}

      {!settings && !error && <p className="text-zinc-500">{t("notConfigured")}</p>}

      {settings && appearance && (
        <>
          <div className="admin-settings-summary">
            <div className="admin-settings-summary__chip">
              <span className="admin-settings-summary__label">{t("property")}</span>
              <span className="admin-settings-summary__value">{settings.display_name}</span>
            </div>
            <div className="admin-settings-summary__chip">
              <span className="admin-settings-summary__label">{t("checkTimes")}</span>
              <span className="admin-settings-summary__value">
                {settings.default_check_in_time} ? {settings.default_check_out_time}
              </span>
            </div>
            <div className="admin-settings-summary__chip">
              <span className="admin-settings-summary__label">{t("activeTheme")}</span>
              <span className="admin-settings-summary__value">
                <AdminCurrentThemeSummary />
              </span>
            </div>
            <div className="admin-settings-summary__chip">
              <span className="admin-settings-summary__label">{t("role")}</span>
              <span className="admin-settings-summary__value">
                {isOwner
                  ? t("roleOwner")
                  : role === "admin"
                    ? t("roleAdmin")
                    : t("roleOperator")}
              </span>
            </div>
          </div>

          {(isOwner || statisticsAccess) && (
            <SettingsSlidePanel
              title={t("statisticsTitle")}
              subtitle={t("statisticsSubtitle")}
              icon="*"
              defaultOpen={params.section === "statistics"}
            >
              <StatisticsSettingsPanel
                visibility={statisticsVisibility}
                canConfigure={isOwner}
                canAccess={statisticsAccess}
              />
            </SettingsSlidePanel>
          )}

          <SettingsSlidePanel title={t("fxTitle")} subtitle={t("fxSubtitle")} icon="*" defaultOpen>
            <AdminFxSettings />
          </SettingsSlidePanel>

          <SettingsSlidePanel
            title={t("historyTitle")}
            subtitle={t("historySubtitle")}
            icon="*"
            defaultOpen={params.section === "history"}
          >
            <Suspense
              fallback={
                <div
                  className="min-h-[8rem] animate-pulse rounded-xl bg-zinc-100"
                  aria-busy="true"
                />
              }
            >
              <AdminActivityHistoryPanel />
            </Suspense>
          </SettingsSlidePanel>

          {role === "admin" && (
            <SettingsSlidePanel
              title={t("checkin.title")}
              subtitle={t("checkin.docRuleDesc")}
              icon="*"
              defaultOpen={params.section === "checkin"}
            >
              <CheckinSettingsPanel settings={checkinSettings} />
            </SettingsSlidePanel>
          )}

          <AdminPendingForm action={updateAppearanceSettingsAction} className="admin-settings-form mt-4">
            <input type="hidden" name="id" value={settings.id} />

            <SettingsSlidePanel title={t("visualsTitle")} subtitle={t("visualsSubtitle")} icon="*" defaultOpen>
              <AdminDisplayLayoutPicker />
              <AdminPalettePicker />
            </SettingsSlidePanel>

            <div className="admin-settings-submit">
              <AdminSubmitButton type="submit" className="admin-settings-submit__btn">
                {t("saveTheme")}
              </AdminSubmitButton>
            </div>
          </AdminPendingForm>

          {role === "admin" && (
            <SettingsSlidePanel
              title={t("staffTitle")}
              subtitle={t("staffSubtitle")}
              icon="*"
            >
              <div className="space-y-3">
                <p className="text-sm text-zinc-600">{t("staffPanelInfo")}</p>
                <Link
                  href="/admin/settings/staff"
                  className="admin-settings-cta inline-flex rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
                >
                  {t("openStaffManagement")}
                </Link>
              </div>
            </SettingsSlidePanel>
          )}

          {role === "admin" && (
            <SettingsSlidePanel
              title={t("domainsTitle")}
              subtitle={t("domainsSubtitle")}
              icon="*"
            >
              <div className="space-y-3">
                <p className="text-sm text-zinc-600">{t("domainsPanelInfo")}</p>
                <Link
                  href="/admin/settings/domains"
                  className="admin-settings-cta inline-flex rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
                >
                  {t("openDomainsManagement")}
                </Link>
              </div>
            </SettingsSlidePanel>
          )}

          {(role === "admin" || isOwner) && (
            <SettingsSlidePanel
              title={t("locationTitle")}
              subtitle={
                locationUnlocked
                  ? isOwner
                    ? t("locationSubtitleOwner")
                    : t("locationSubtitleUnlocked")
                  : t("locationSubtitleLocked")
              }
              icon="*"
              defaultOpen={params.location === "locked"}
            >
              {locationUnlocked ? (
                <div className="space-y-3">
                  <p className="text-sm text-zinc-600">
                    {isOwner ? t("locationPanelInfoOwner") : t("locationPanelInfo")}
                  </p>
                  <Link
                    href="/admin/settings/location"
                    className="admin-settings-cta inline-flex rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
                  >
                    {t("openConfigCenter")}
                  </Link>
                  {!isOwner && <AdminLocationLockButton />}
                </div>
              ) : (
                <AdminLocationUnlockForm isOwner={false} />
              )}
            </SettingsSlidePanel>
          )}
        </>
      )}
    </AdminRetroPageFrame>
  );
}


