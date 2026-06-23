import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { SettingsPageLayout } from "@/components/admin/settings/SettingsPageLayout";
import { AdminLinkButton } from "@/components/admin/ui/AdminLinkButton";
import { BuildingStructureCard } from "@/components/admin/structure/BuildingStructureCard";
import { requireLocationAdmin } from "@/lib/auth/require-staff";
import { formatAdminError } from "@/lib/admin/format-error";
import { listLocationStructure } from "@/services/location-structure";
import {
  ensureBuildingPoliciesFromLegacy,
  listRoomOptions,
} from "@/services/room-catalog";

export default async function LocationStructurePage() {
  const [, t, tCommon] = await Promise.all([
    requireLocationAdmin(),
    getTranslations("admin.locationStructure"),
    getTranslations("admin.common"),
  ]);

  let structures: Awaited<ReturnType<typeof listLocationStructure>> = [];
  let catalogOptions: Awaited<ReturnType<typeof listRoomOptions>> = [];
  const policiesByBuilding: Record<
    string,
    Awaited<ReturnType<typeof ensureBuildingPoliciesFromLegacy>>
  > = {};
  let error: string | null = null;

  try {
    const structuresPromise = listLocationStructure();
    const [structuresResult, catalogResult, policyEntriesResult] =
      await Promise.allSettled([
        structuresPromise,
        listRoomOptions(true),
        structuresPromise.then((loadedStructures) =>
          Promise.all(
            loadedStructures.map(async (s) => {
              try {
                const policies = await ensureBuildingPoliciesFromLegacy(
                  s.building.id,
                  s.building.ac_mode
                );
                return [s.building.id, policies] as const;
              } catch {
                return [s.building.id, [] as Awaited<
                  ReturnType<typeof ensureBuildingPoliciesFromLegacy>
                >] as const;
              }
            })
          )
        ),
      ]);
    if (structuresResult.status === "rejected") {
      throw structuresResult.reason;
    }
    structures = structuresResult.value;
    catalogOptions =
      catalogResult.status === "fulfilled" ? catalogResult.value : [];
    if (policyEntriesResult.status === "fulfilled") {
      for (const [buildingId, policies] of policyEntriesResult.value) {
        policiesByBuilding[buildingId] = policies;
      }
    }
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
