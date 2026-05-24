import type { AcMode } from "@/types/database";
import type {
  OptionPolicyMode,
  ResolvedRoomOption,
  RoomOptionDefinition,
  RoomTypeDefinition,
} from "@/types/room-catalog";

export function acModeToPolicyMode(acMode: AcMode): OptionPolicyMode {
  return acMode;
}

export function policyModeForOption(
  policies: { option_id: string; mode: OptionPolicyMode }[],
  optionId: string,
  fallback: OptionPolicyMode = "per_room"
): OptionPolicyMode {
  return policies.find((p) => p.option_id === optionId)?.mode ?? fallback;
}

export function resolveOptionEnabled(
  mode: OptionPolicyMode,
  roomSelected: boolean,
  typeDefault: boolean
): { enabled: boolean; editable: boolean; source: ResolvedRoomOption["source"] } {
  if (mode === "all_rooms") {
    return { enabled: true, editable: false, source: "policy_all" };
  }
  if (mode === "none") {
    return { enabled: false, editable: false, source: "policy_none" };
  }
  if (roomSelected) {
    return { enabled: true, editable: true, source: "room" };
  }
  if (typeDefault) {
    return { enabled: true, editable: true, source: "type_default" };
  }
  return { enabled: false, editable: true, source: "room" };
}

export function computeRoomPrice(input: {
  type: Pick<RoomTypeDefinition, "base_price_per_night"> | null;
  buildingDefaultPrice: number;
  enabledOptions: Pick<RoomOptionDefinition, "price_per_night_addon">[];
  overridePrice?: number | null;
}): number {
  if (input.overridePrice != null && input.overridePrice > 0) {
    return input.overridePrice;
  }
  const base =
    input.type && input.type.base_price_per_night > 0
      ? input.type.base_price_per_night
      : input.buildingDefaultPrice;
  const addons = input.enabledOptions.reduce(
    (sum, o) => sum + Number(o.price_per_night_addon ?? 0),
    0
  );
  return Math.max(0, base + addons);
}

export function slugifyCatalogName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 48);
}
