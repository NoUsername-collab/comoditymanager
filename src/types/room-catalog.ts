import type { AcMode } from "@/types/database";

export type OptionPolicyMode = AcMode;

export type RoomTypeDefinition = {
  id: string;
  slug: string;
  name: string;
  capacity_base: number;
  base_price_per_night: number;
  sort_order: number;
  is_system: boolean;
  is_active: boolean;
  default_option_ids: string[];
};

export type RoomOptionDefinition = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  price_per_night_addon: number;
  sort_order: number;
  is_system: boolean;
  is_active: boolean;
};

export type BuildingOptionPolicy = {
  building_id: string;
  option_id: string;
  mode: OptionPolicyMode;
};

export type RoomCatalogContext = {
  types: RoomTypeDefinition[];
  options: RoomOptionDefinition[];
  buildingPolicies: BuildingOptionPolicy[];
};

export type ResolvedRoomOption = {
  option: RoomOptionDefinition;
  enabled: boolean;
  editable: boolean;
  source: "policy_all" | "policy_none" | "room" | "type_default";
};
