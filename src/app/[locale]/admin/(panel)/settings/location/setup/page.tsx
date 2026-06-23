import { Link } from "@/i18n/navigation";
import { AdminRoomCatalogPanel } from "@/components/admin/catalog/AdminRoomCatalogPanel";
import { SettingsPageLayout } from "@/components/admin/settings/SettingsPageLayout";
import { SettingsSection } from "@/components/admin/settings/SettingsSection";
import { listRoomOptions, listRoomTypes } from "@/services/room-catalog";
import { requireLocationAdmin } from "@/lib/auth/require-staff";
import { getTranslations } from "next-intl/server";

export default async function LocationSetupPage() {
  const [tPage, tCommon, catalogResult] = await Promise.all([
    getTranslations("admin.pages.settingsLocation"),
    getTranslations("admin.common"),
    Promise.all([
      requireLocationAdmin(),
      listRoomTypes(true),
      listRoomOptions(true),
    ])
      .then(([, types, options]) => ({
        ok: true as const,
        catalogTypes: types,
        catalogOptions: options,
      }))
      .catch((e) => ({
        ok: false as const,
        error: e instanceof Error ? e.message : "catalogUnavailable",
      })),
  ]);

  let catalogError: string | null = null;
  let catalogTypes: Awaited<ReturnType<typeof listRoomTypes>> = [];
  let catalogOptions: Awaited<ReturnType<typeof listRoomOptions>> = [];
  if (catalogResult.ok) {
    catalogTypes = catalogResult.catalogTypes;
    catalogOptions = catalogResult.catalogOptions;
  } else {
    catalogError =
      catalogResult.error === "catalogUnavailable"
        ? tPage("catalogUnavailable")
        : catalogResult.error;
  }

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
