import { getPensionSettings } from "@/services/pension-settings";
import { listBuildings } from "@/services/buildings";
import { listRoomTypes } from "@/services/room-catalog";
import { getOnboardingSnapshot } from "@/services/onboarding";

export async function loadOnboardingPage() {
  const [settings, buildings, roomTypes, snapshot] = await Promise.all([
    getPensionSettings(),
    listBuildings().catch(() => []),
    listRoomTypes().catch(() => []),
    getOnboardingSnapshot().catch(() => null),
  ]);

  const building = buildings[0]
    ? { id: buildings[0].id, name: buildings[0].name }
    : null;

  return {
    settings,
    building,
    roomTypes: roomTypes
      .filter((type) => type.is_active !== false)
      .map((type) => ({ id: type.id, name: type.name })),
    roomCount: snapshot?.roomCount ?? 0,
  };
}
