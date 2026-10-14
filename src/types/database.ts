export type AcMode = "all_rooms" | "none" | "per_room";

export type Building = {
  id: string;
  name: string;
  sort_order: number;
  color_hex: string | null;
  ac_mode: AcMode;
  is_active: boolean;
  default_price_per_night?: number;
};

export type Floor = {
  id: string;
  building_id: string;
  name: string;
  level_number: number | null;
  sort_order: number;
  is_active: boolean;
};

export type Room = {
  id: string;
  building_id: string;
  floor_id: string | null;
  name: string;
  room_type: string;
  capacity_base: number;
  allows_extra_beds: boolean;
  max_extra_beds_per_room: number;
  /** Baby cots that fit in the room. */
  max_cots: number;
  /** Most people allowed, babies included; null = only the beds limit. */
  max_occupancy: number | null;
  has_ac: boolean;
  price_per_night: number;
  is_active: boolean;
  sort_order: number;
};
