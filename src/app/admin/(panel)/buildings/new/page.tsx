import { BuildingForm } from "@/components/admin/BuildingForm";
import { AdminRetroPageFrame } from "@/components/admin/retro/AdminRetroPageFrame";
import { listRoomOptions } from "@/services/room-catalog";
import { createBuildingAction } from "../actions";

export default async function NewBuildingPage() {
  let catalogOptions: Awaited<ReturnType<typeof listRoomOptions>> = [];
  try {
    catalogOptions = await listRoomOptions();
  } catch {
    catalogOptions = [];
  }

  return (
    <AdminRetroPageFrame
      title="Clădire nouă — Casa Emil"
      backHref="/admin/buildings"
      backLabel="Clădiri"
      className="max-w-lg"
      description={
        <>
          Politicile AC și opțiunile modulare (frigider etc.) se aplică la{" "}
          <strong>camere noi</strong>. Culoarea apare în calendar.
        </>
      }
    >
      <BuildingForm action={createBuildingAction} catalogOptions={catalogOptions} />
    </AdminRetroPageFrame>
  );
}
