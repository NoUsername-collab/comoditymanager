import { BuildingForm } from "@/components/admin/BuildingForm";
import { AdminRetroPageFrame } from "@/components/admin/retro/AdminRetroPageFrame";
import { createBuildingAction } from "../actions";

export default function NewBuildingPage() {
  return (
    <AdminRetroPageFrame
      title="Clădire nouă — Casa Emil"
      backHref="/admin/buildings"
      backLabel="Clădiri"
      className="max-w-lg"
      description={
        <>
          Politica AC se aplică la <strong>camere noi</strong> create în această
          clădire. Culoarea aleasă apare în calendar pentru toate camerele din
          clădire.
        </>
      }
    >
      <BuildingForm action={createBuildingAction} />
    </AdminRetroPageFrame>
  );
}
