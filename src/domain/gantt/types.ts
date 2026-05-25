import type { AcMode } from "@/types/database";

export type GanttRoom = {
  id: string;
  name: string;
  building_id: string;
  building_name: string;
  building_color: string | null;
  building_ac_mode: AcMode;
  has_ac: boolean;
  room_type_name?: string | null;
  option_slugs?: string[];
};
