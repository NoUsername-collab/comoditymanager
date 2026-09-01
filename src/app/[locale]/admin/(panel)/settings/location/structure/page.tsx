import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { SettingsPageLayout } from "@/components/admin/settings/SettingsPageLayout";
import { AdminLinkButton } from "@/components/admin/ui/AdminLinkButton";
import { BuildingStructureCard } from "@/features/buildings/ui/BuildingStructureCard";
import { requireLocationAdmin } from "@/lib/auth/require-staff";
import { formatAdminError } from "@/lib/admin/format-error";
import { loadLocationStructurePage } from "@/features/settings/loaders";

export default async function LocationStructurePage() {
  const [, t, tCommon] = await Promise.all([
    requireLocationAdmin(),
    getTranslations("admin.locationStructure"),
    getTranslations("admin.common"),
  ]);

  let structures: Awaited<
    ReturnType<typeof loadLocationStructurePage>
  >["structures"] = [];
  let catalogOptions: Awaited<
    ReturnType<typeof loadLocationStructurePage>
  >["catalogOptions"] = [];
  let policiesByBuilding: Awaited<
    ReturnType<typeof loadLocationStructurePage>
  >["policiesByBuilding"] = {};
  let error: string | null = null;

  try {
    const loaded = await loadLocationStructurePage();
    structures = loaded.structures;
    catalogOptions = loaded.catalogOptions;
    policiesByBuilding = loaded.policiesByBuilding;
  } catch (e) {
    error = formatAdminError(e, tCommon);
  }

  const totalRooms = structures.reduce((n, s) => n + s.roomCount, 0);
  const totalFloors = structures.reduce((n, s) => n + s.floors.length, 0);

  return (
    <SettingsPageLayout
      title={t("pageTitle")}
      description={t("pageDescription")}
      alerts={error ? [{ tone: "error", message: error }] : []}
      actions={
        <Link
          href="/admin/buildings/new?return_to=structure"
          className="settings-primary-link"
        >
          {tCommon("newBuilding")}
        </Link>
      }
    >
      <div className="admin-settings-summary mb-4">
        <div className="admin-settings-summary__chip">
          <span className="admin-settings-summary__label">{tCommon("buildings")}</span>
          <span className="admin-settings-summary__value">{structures.length}</span>
        </div>
        <div className="admin-settings-summary__chip">
          <span className="admin-settings-summary__label">{tCommon("floors")}</span>
          <span className="admin-settings-summary__value">{totalFloors}</span>
        </div>
        <div className="admin-settings-summary__chip">
          <span className="admin-settings-summary__label">{tCommon("rooms")}</span>
          <span className="admin-settings-summary__value">{totalRooms}</span>
        </div>
      </div>
      <div className="admin-settings-summary mb-4">
        {structures.map((s) => (
          <BuildingStructureCard
            key={s.building.id}
            data={s}
            catalogOptions={catalogOptions}
            catalogPolicies={policiesByBuilding[s.building.id] ?? []}
          />
        ))}
      </div>

      {structures.length === 0 && !error && (
        <div className="settings-empty settings-empty--bordered mt-4">
          <p>{t("noBuildingsYet")}</p>
          <AdminLinkButton
            href="/admin/buildings/new?return_to=structure"
            variant="primary"
            size="lg"
            className="mt-4"
          >
            {t("createFirstBuilding")}
          </AdminLinkButton>
        </div>
      )}

      <div className="settings-dialog-actions mt-5 border-t border-zinc-200 pt-4">
        <AdminLinkButton href="/admin/buildings" variant="secondary" size="md">
          {t("linkOccupancy")}
        </AdminLinkButton>
        <AdminLinkButton href="/admin/rooms" variant="secondary" size="md">
          {t("linkRoomsList")}
        </AdminLinkButton>
      </div>
    </SettingsPageLayout>
  );
}
