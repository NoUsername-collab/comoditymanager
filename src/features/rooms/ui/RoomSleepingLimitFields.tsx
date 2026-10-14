"use client";

import { useTranslations } from "next-intl";
import { AdminInput } from "@/components/admin/ui/AdminInput";
import {
  MAX_COTS_PER_ROOM,
  MAX_ROOM_OCCUPANCY,
} from "@/domain/room/sleeping-limits";

/** Baby cots (not extra beds) and the people limit, read by parseRoomSleepingLimits. */
export function RoomSleepingLimitFields({
  maxCots = 0,
  maxOccupancy = null,
}: {
  maxCots?: number;
  maxOccupancy?: number | null;
}) {
  const t = useTranslations("party");
  return (
    <div className="grid grid-cols-2 gap-4">
      <label className="block">
        <span className="text-sm font-medium">{t("roomCots")}</span>
        <AdminInput
          name="max_cots"
          type="number"
          min={0}
          max={MAX_COTS_PER_ROOM}
          defaultValue={maxCots}
          className="mt-1"
        />
        <span className="mt-1 block text-xs text-zinc-500">{t("roomCotsHint")}</span>
      </label>
      <label className="block">
        <span className="text-sm font-medium">{t("roomMaxPeople")}</span>
        <AdminInput
          name="max_occupancy"
          type="number"
          min={1}
          max={MAX_ROOM_OCCUPANCY}
          defaultValue={maxOccupancy ?? ""}
          placeholder={t("roomMaxPeoplePlaceholder")}
          className="mt-1"
        />
        <span className="mt-1 block text-xs text-zinc-500">{t("roomMaxPeopleHint")}</span>
      </label>
    </div>
  );
}
