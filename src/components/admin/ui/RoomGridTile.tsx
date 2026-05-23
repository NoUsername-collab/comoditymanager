import Link from "next/link";
import { roomShortLabel } from "@/lib/building-theme";
import type { RoomNightStatus } from "@/domain/availability/room-night-status";

export function RoomGridTile({
  id,
  name,
  floorName,
  isActive,
  statusOnDate,
  guestOnDate,
  dateLabel,
}: {
  id: string;
  name: string;
  floorName?: string | null;
  isActive: boolean;
  statusOnDate: RoomNightStatus;
  guestOnDate?: string | null;
  dateLabel?: string;
}) {
  const label = roomShortLabel(name);
  const title = [
    name,
    floorName,
    dateLabel && `Data: ${dateLabel}`,
    statusOnDate === "occupied"
      ? `Ocupată — ${guestOnDate ?? "oaspete"}`
      : statusOnDate === "pending"
        ? `Cerere — ${guestOnDate ?? "oaspete"}`
        : statusOnDate === "free"
          ? "Liberă"
          : "Inactivă",
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Link
      href={`/admin/rooms/${id}/edit`}
      title={title}
      className={[
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-md border text-[11px] font-bold leading-none shadow-sm transition hover:scale-105 hover:shadow",
        statusOnDate === "inactive" &&
          "border-zinc-200 bg-zinc-100 text-zinc-400 line-through",
        statusOnDate === "free" &&
          "border-emerald-200/80 bg-white text-emerald-900 hover:border-emerald-300",
        statusOnDate === "occupied" && "status-occupied-tile",
        statusOnDate === "pending" &&
          "border-amber-400/70 bg-amber-300 text-amber-950 hover:bg-amber-400",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {label}
    </Link>
  );
}
