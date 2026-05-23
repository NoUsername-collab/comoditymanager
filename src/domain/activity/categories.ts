import type { ActivityAction, ActivityLogEntry } from "./types";

export type ActivityJournalCategory = "rezervari" | "admin";

/** Rezervări = flux booking; Admin = autentificări, setări, clădiri/camere. */
export function activityJournalCategory(
  action: ActivityAction
): ActivityJournalCategory {
  return action.startsWith("booking.") ? "rezervari" : "admin";
}

export function splitActivityByCategory(entries: ActivityLogEntry[]): {
  rezervari: ActivityLogEntry[];
  admin: ActivityLogEntry[];
} {
  const rezervari: ActivityLogEntry[] = [];
  const admin: ActivityLogEntry[] = [];
  for (const entry of entries) {
    if (activityJournalCategory(entry.action) === "rezervari") {
      rezervari.push(entry);
    } else {
      admin.push(entry);
    }
  }
  return { rezervari, admin };
}
