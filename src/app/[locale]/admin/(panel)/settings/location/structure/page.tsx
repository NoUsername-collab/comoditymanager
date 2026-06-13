import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { SettingsPageHeader } from "@/components/admin/settings/SettingsPageHeader";
import { SettingsAlerts } from "@/components/admin/settings/SettingsAlerts";
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
    <>
      <SettingsPageHeader
        title={t("pageTitle")}
        description={t("pageDescription")}
        actions={
          <Link
            href="/admin/buildings/new?return_to=structure"
            className="settings-primary-link"
          >
            {tCommon("newBuilding")}
          </Link>
        }
      />

      <SettingsAlerts alerts={error ? [{ tone: "error", message: error }] : []} />

      <div className="mb-4 grid gap-2 sm:grid-cols-3">
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            {tCommon("buildings")}
          </p>
          <p className="mt-0.5 text-xl font-bold tabular-nums text-zinc-900">
            {structures.length}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            {tCommon("floors")}
          </p>
          <p className="mt-0.5 text-xl font-bold tabular-nums text-zinc-900">
            {totalFloors}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            {tCommon("rooms")}
          </p>
          <p className="mt-0.5 text-xl font-bold tabular-nums text-zinc-900">
            {totalRooms}
          </p>
        </div>
      </div>

      <p className="mb-4 max-w-3xl text-sm leading-snug text-zinc-600">{t("workflowHint")}</p>

      <div className="space-y-4">
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
        <div className="mt-4 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-4 text-center">
          <p className="text-sm text-zinc-600">{t("noBuildingsYet")}</p>
          <Link
            href="/admin/buildings/new?return_to=structure"
            className="mt-4 inline-block rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
          >
            {t("createFirstBuilding")}
          </Link>
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-2 border-t border-zinc-200 pt-4 text-sm">
        <Link
          href="/admin/buildings"
          className="rounded-lg border border-zinc-200 px-3 py-2 text-zinc-700 hover:bg-zinc-50"
        >
          {t("linkOccupancy")}
        </Link>
        <Link
          href="/admin/rooms"
          className="rounded-lg border border-zinc-200 px-3 py-2 text-zinc-700 hover:bg-zinc-50"
        >
          {t("linkRoomsList")}
        </Link>
      </div>
    </>
  );
}
