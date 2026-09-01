import { Link } from "@/i18n/navigation";
import { AdminRoomCatalogPanel } from "@/features/rooms/ui/AdminRoomCatalogPanel";
import { SettingsPageLayout } from "@/components/admin/settings/SettingsPageLayout";
import { SettingsSection } from "@/components/admin/settings/SettingsSection";
import { loadLocationSetupCatalog } from "@/features/settings/loaders";
import { requireLocationAdmin } from "@/lib/auth/require-staff";
import { getTranslations } from "next-intl/server";

export default async function LocationSetupPage() {
  const [tPage, tCommon, , catalogResult] = await Promise.all([
    getTranslations("admin.pages.settingsLocation"),
    getTranslations("admin.common"),
    requireLocationAdmin(),
    loadLocationSetupCatalog(),
  ]);

  const catalogTypes = catalogResult.ok ? catalogResult.catalogTypes : [];
  const catalogOptions = catalogResult.ok ? catalogResult.catalogOptions : [];
  const catalogError = catalogResult.ok
    ? null
    : catalogResult.error === "catalogUnavailable"
      ? tPage("catalogUnavailable")
      : catalogResult.error;

  return (
    <SettingsPageLayout title={tPage("setup.title")} description={tPage("setup.description")}>
      <div className="settings-overview__grid mb-4">
        <Link href="/admin/settings/location/structure" className="settings-overview-card">
          <span className="settings-overview-card__title">{tPage("structure.cardStructureTitle")}</span>
          <span className="settings-overview-card__desc">{tPage("structure.cardStructureBody")}</span>
        </Link>
        <Link href="/admin/rooms/new?return_to=structure" className="settings-overview-card">
          <span className="settings-overview-card__title">{tPage("setup.addRoomsTitle")}</span>
          <span className="settings-overview-card__desc">{tPage("setup.addRoomsBody")}</span>
        </Link>
      </div>

      <SettingsSection title={tCommon("modularCatalog")} description={tPage("catalog.subtitle")}>
        <AdminRoomCatalogPanel
          types={catalogTypes}
          options={catalogOptions}
          catalogError={catalogError}
        />
      </SettingsSection>
    </SettingsPageLayout>
  );
}
