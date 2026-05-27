import { BuildingForm } from "@/components/admin/BuildingForm";
import { AdminRetroPageFrame } from "@/components/admin/retro/AdminRetroPageFrame";
import { listRoomOptions } from "@/services/room-catalog";
import { createBuildingAction } from "../actions";
import { getTranslations } from "next-intl/server";

export default async function NewBuildingPage() {
  const tPage = await getTranslations("admin.pages.buildingsNew");
  const tCommon = await getTranslations("admin.common");
  let catalogOptions: Awaited<ReturnType<typeof listRoomOptions>> = [];
  try {
    catalogOptions = await listRoomOptions();
  } catch {
    catalogOptions = [];
  }

  return (
    <AdminRetroPageFrame
      title={tCommon("newBuilding")}
      backHref="/admin/buildings"
      backLabel={tCommon("buildings")}
      className="max-w-lg"
      description={
        <>
          {tPage("descriptionPrefix")} <strong>{tPage("newRooms")}</strong>. {tPage("descriptionSuffix")}
        </>
      }
    >
      <BuildingForm action={createBuildingAction} catalogOptions={catalogOptions} />
    </AdminRetroPageFrame>
  );
}
