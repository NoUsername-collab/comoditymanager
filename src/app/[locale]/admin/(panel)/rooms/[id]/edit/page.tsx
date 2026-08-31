import { notFound } from "next/navigation";
import { RoomEditForm } from "@/features/rooms/ui/RoomEditForm";
import { AdminPageFrame } from "@/components/admin/shell/AdminPageFrame";
import { loadEditRoomPage } from "@/features/rooms/loaders";
import { updateRoomAction } from "./actions";
import { guardOperatorRoute } from "@/lib/auth/require-staff";
import { getTranslations } from "next-intl/server";

export default async function EditRoomPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ return_to?: string }>;
}) {
  await guardOperatorRoute("/admin/rooms/edit");
  const [tPage, tCommon, tStruct, { id }, { return_to }] = await Promise.all([
    getTranslations("admin.pages.roomEdit"),
    getTranslations("admin.common"),
    getTranslations("admin.locationStructure"),
    params,
    searchParams,
  ]);
  const backToStructure = return_to === "structure";

  const data = await loadEditRoomPage(id);
  if (!data) notFound();
  const { room, buildings, types, options, allFloors, policyResults } = data;
  const floorsByBuilding: Record<string, typeof allFloors> = {};
  const policiesByBuilding: Record<string, (typeof policyResults)[number]> = {};
  for (let i = 0; i < buildings.length; i += 1) {
    const building = buildings[i];
    floorsByBuilding[building.id] = allFloors.filter(
      (floor) => floor.building_id === building.id
    );
    policiesByBuilding[building.id] = policyResults[i];
  }

  return (
    <AdminPageFrame
      title={room ? tPage("titleWithName", { name: room.name }) : tPage("title")}
      backHref={
        backToStructure
          ? "/admin/settings/location/structure"
          : "/admin/rooms"
      }
      backLabel={
        backToStructure ? tStruct("pageTitle") : tCommon("rooms")
      }
      className="max-w-lg"
    >
      {room && types.length > 0 && (
        <RoomEditForm
          room={room}
          buildings={buildings}
          floorsByBuilding={floorsByBuilding}
          types={types}
          options={options}
          policiesByBuilding={policiesByBuilding}
          updateRoomAction={updateRoomAction}
          returnTo={backToStructure ? "structure" : undefined}
        />
      )}
    </AdminPageFrame>
  );
}
