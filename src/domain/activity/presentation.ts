import type { ActivityAction } from "./types";

export type ActivityTone = "booking" | "auth" | "structure" | "settings";

export function activityTone(action: ActivityAction): ActivityTone {
  if (action.startsWith("booking.")) return "booking";
  if (action.startsWith("guest.")) return "booking";
  if (action.startsWith("auth.")) return "auth";
  if (action === "settings.updated") return "settings";
  return "structure";
}

export function activityIcon(action: ActivityAction): string {
  const map: Partial<Record<ActivityAction, string>> = {
    "booking.request_created": "✉",
    "booking.confirmed": "✓",
    "booking.cancelled": "✕",
    "booking.shifted": "↔",
    "booking.room_moved": "⇄",
    "booking.rebooked": "↻",
    "booking.flagged": "!",
    "guest.created": "👤",
    "guest.updated": "👤",
    "guest.merged": "⇶",
    "guest.reviewed": "★",
    "guest.flagged": "!",
    "guest.blacklisted": "⛔",
    "guest.unblacklisted": "✓",
    "guest.adjusted": "±",
    "building.created": "🏠",
    "building.deleted": "🏠",
    "building.price_updated": "RON",
    "floor.created": "▤",
    "room.created": "🛏",
    "room.updated": "🛏",
    "room.deleted": "🛏",
    "settings.updated": "⚙",
    "auth.login": "→",
    "auth.logout": "←",
  };
  return map[action] ?? "·";
}

export const ACTIVITY_TONE_CLASS: Record<
  ActivityTone,
  { dot: string; badge: string; icon: string }
> = {
  booking: {
    dot: "bg-sky-500 ring-sky-200",
    badge: "border-sky-200/80 bg-sky-50 text-sky-900",
    icon: "bg-sky-100 text-sky-800",
  },
  auth: {
    dot: "bg-violet-500 ring-violet-200",
    badge: "border-violet-200/80 bg-violet-50 text-violet-900",
    icon: "bg-violet-100 text-violet-800",
  },
  structure: {
    dot: "bg-amber-500 ring-amber-200",
    badge: "border-amber-200/80 bg-amber-50 text-amber-950",
    icon: "bg-amber-100 text-amber-900",
  },
  settings: {
    dot: "bg-zinc-500 ring-zinc-200",
    badge: "border-zinc-200/80 bg-zinc-100 text-zinc-800",
    icon: "bg-zinc-200 text-zinc-700",
  },
};
