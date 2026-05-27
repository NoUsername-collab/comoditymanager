"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
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
  href,
}: {
  id: string;
  name: string;
  floorName?: string | null;
  isActive: boolean;
  statusOnDate: RoomNightStatus;
  guestOnDate?: string | null;
  dateLabel?: string;
  href?: string | null;
}) {
  const tCommon = useTranslations("admin.common");
  const label = roomShortLabel(name);
  const title = [
    name,
    floorName,
    dateLabel && tCommon("dateLabel", { date: dateLabel }),
    statusOnDate === "occupied"
      ? tCommon("occupiedGuestLabel", { guest: guestOnDate ?? tCommon("guestFallback") })
      : statusOnDate === "pending"
        ? tCommon("pendingGuestLabel", { guest: guestOnDate ?? tCommon("guestFallback") })
        : statusOnDate === "free"
          ? tCommon("freeFemale")
          : tCommon("inactiveFemale"),
  ]
    .filter(Boolean)
    .join(" · ");

  const className = [
    "flex h-9 w-9 shrink-0 items-center justify-center rounded-md border text-[11px] font-bold leading-none shadow-sm transition",
    href && "hover:scale-105 hover:shadow",
    statusOnDate === "inactive" &&
      "border-zinc-200 bg-zinc-100 text-zinc-400 line-through",
    statusOnDate === "free" &&
      "border-emerald-200/80 bg-white text-emerald-900",
    statusOnDate === "occupied" && "status-occupied-tile",
    statusOnDate === "pending" &&
      "border-amber-400/70 bg-amber-300 text-amber-950",
    href && statusOnDate === "free" && "hover:border-emerald-300",
    href && statusOnDate === "pending" && "hover:bg-amber-400",
  ]
    .filter(Boolean)
    .join(" ");

  if (!href) {
    return (
      <span title={title} className={className}>
        {label}
      </span>
    );
  }

  return (
    <Link href={href} title={title} className={className}>
      {label}
    </Link>
  );
}
