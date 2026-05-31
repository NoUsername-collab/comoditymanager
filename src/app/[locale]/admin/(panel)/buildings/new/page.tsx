import { BuildingForm } from "@/components/admin/BuildingForm";
import { AdminRetroPageFrame } from "@/components/admin/retro/AdminRetroPageFrame";
import { listRoomOptions } from "@/services/room-catalog";
import { createBuildingAction } from "../actions";
import { getTranslations } from "next-intl/server";

export default async function NewBuildingPage({
  searchParams,
}: {
  searchParams: Promise<{ return_to?: string }>;
}) {
  const tPage = await getTranslations("admin.pages.buildingsNew");
  const tCommon = await getTranslations("admin.common");
  const tStruct = await getTranslations("admin.locationStructure");
  const { return_to } = await searchParams;
  const backToStructure = return_to === "structure";
  let catalogOptions: Awaited<ReturnType<typeof listRoomOptions>> = [];
  try {
    catalogOptions = await listRoomOptions();
  } catch {
    catalogOptions = [];
  }

  return (
    <AdminRetroPageFrame
      title={tCommon("newBuilding")}
      backHref={
        backToStructure
          ? "/admin/settings/location/structure"
          : "/admin/buildings"
      }
      backLabel={
        backToStructure ? tStruct("pageTitle") : tCommon("buildings")
      }
      className="max-w-lg"
      description={
        <>
          {tPage("descriptionPrefix")} <strong>{tPage("newRooms")}</strong>. {tPage("descriptionSuffix")}
        </>
      }
    >
      <BuildingForm
        action={createBuildingAction}
        catalogOptions={catalogOptions}
        returnTo={backToStructure ? "structure" : undefined}
      />
    </AdminRetroPageFrame>
  );
}
