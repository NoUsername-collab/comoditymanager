import { nightOccupied } from "@/lib/stay-dates";

export type NightStay = {
  room_id: string;
  check_in: string;
  check_out: string;
  status: "confirmata" | "cerere_noua";
  guest_name: string;
};

export type RoomNightStatus = "free" | "occupied" | "pending" | "inactive";

export function roomNightStatus(
  isActive: boolean,
  roomId: string,
  date: string,
  stays: NightStay[]
): { status: RoomNightStatus; guest: string | null } {
  if (!isActive) return { status: "inactive", guest: null };

  const onNight = stays.filter(
    (s) =>
      s.room_id === roomId && nightOccupied(date, s.check_in, s.check_out)
  );
  if (onNight.length === 0) return { status: "free", guest: null };

  const confirmed = onNight.find((s) => s.status === "confirmata");
  const pick = confirmed ?? onNight[0];
  return {
    status: pick.status === "confirmata" ? "occupied" : "pending",
    guest: pick.guest_name,
  };
}
