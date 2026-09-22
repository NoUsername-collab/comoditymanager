import { Link } from "@/i18n/navigation";
import { AdminLocationLockBar } from "@/features/settings/ui/AdminLocationLockBar";
import { SettingsPageLayout } from "@/components/admin/settings/SettingsPageLayout";
import { SettingsSection } from "@/components/admin/settings/SettingsSection";
import type { SettingsAlert } from "@/components/admin/settings/SettingsAlerts";
import { requireLocationAdmin } from "@/lib/auth/require-staff";
import { getTranslations } from "next-intl/server";

export default async function LocationAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ unlocked?: string; locked?: string }>;
}) {
  const [tPage, tCommon, , params] = await Promise.all([
    getTranslations("admin.pages.settingsLocation"),
    getTranslations("admin.common"),
    requireLocationAdmin(),
    searchParams,
  ]);

  const alerts: SettingsAlert[] = [
    params.unlocked === "1"
      ? { tone: "success", message: tPage("unlockedForTwoHours") }
      : null,
    params.locked === "1"
      ? { tone: "info", message: tPage("unlock.ownerLockClosed") }
      : null,
  ].filter((alert): alert is SettingsAlert => alert !== null);

  return (
    <SettingsPageLayout
      title={tPage("title")}
      description={tPage("roomsHubDescription")}
      alerts={alerts}
      actions={<AdminLocationLockBar />}
    >
      <div className="settings-location-steps">
        <div className="settings-location-steps__card">
          <p className="settings-location-steps__label">{tPage("steps.structureTitle")}</p>
          <p className="settings-location-steps__headline">{tPage("steps.structureHeadline")}</p>
          <p className="settings-location-steps__body">{tPage("steps.structureBody")}</p>
        </div>
        <div className="settings-location-steps__card">
          <p className="settings-location-steps__label">{tPage("steps.modularTitle")}</p>
          <p className="settings-location-steps__headline">{tPage("steps.modularHeadline")}</p>
          <p className="settings-location-steps__body">{tPage("steps.modularBody")}</p>
        </div>
      </div>

      <SettingsSection
        title={tPage("structure.title")}
        description={tPage("structure.subtitle")}
      >
        <div className="settings-form-stack">
          <p className="admin-settings-hint">{tPage("structure.hint")}</p>
          <div className="settings-overview__grid">
            <Link href="/admin/settings/location/structure" className="settings-overview-card">
              <span className="settings-overview-card__title">{tPage("structure.cardStructureTitle")}</span>
              <span className="settings-overview-card__desc">{tPage("structure.cardStructureBody")}</span>
            </Link>
            <Link href="/admin/settings/location/setup" className="settings-overview-card">
              <span className="settings-overview-card__title">{tPage("structure.cardModularTitle")}</span>
              <span className="settings-overview-card__desc">{tPage("structure.cardModularBody")}</span>
            </Link>
          </div>
          <Link href="/admin/rooms" className="settings-overview-card">
            <span className="settings-overview-card__title">{tCommon("rooms")}</span>
            <span className="settings-overview-card__desc">{tPage("structure.cardRoomsBody")}</span>
          </Link>
        </div>
      </SettingsSection>
    </SettingsPageLayout>
  );
}
