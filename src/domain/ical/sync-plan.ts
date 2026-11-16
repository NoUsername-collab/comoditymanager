import type { IcalEvent } from "@/domain/ical/parse";

/** A block already on the room that came from this feed. */
export type ImportedBlock = {
  id: string;
  uid: string;
  checkIn: string;
  checkOut: string;
  reason: string;
};

export type IcalSyncPlan = {
  insert: { uid: string; checkIn: string; checkOut: string; reason: string }[];
  update: { id: string; checkIn: string; checkOut: string; reason: string }[];
  remove: string[];
};

/** What the calendar shows on the block: the feed's name and the other site's own words. */
export function importedBlockReason(feedName: string, summary: string): string {
  const name = feedName.trim();
  const text = summary.trim();
  return (text && text.toLowerCase() !== name.toLowerCase() ? `${name} · ${text}` : name).slice(
    0,
    120,
  );
}

/**
 * What one sync changes on the room. Only nights from today on are touched:
 * sites drop past reservations from their calendars, and that must not erase
 * them from the room's history. A reservation that left the calendar (it was
 * cancelled) is removed; one that moved is updated in place.
 */
export function planIcalSync(args: {
  feedName: string;
  events: IcalEvent[];
  existing: ImportedBlock[];
  today: string;
}): IcalSyncPlan {
  const upcoming = new Map<string, IcalEvent>();
  for (const event of args.events) {
    if (event.checkOut <= args.today) continue;
    if (!upcoming.has(event.uid)) upcoming.set(event.uid, event);
  }

  const plan: IcalSyncPlan = { insert: [], update: [], remove: [] };
  const seen = new Set<string>();
  for (const block of args.existing) {
    const event = upcoming.get(block.uid);
    if (!event) {
      if (block.checkOut > args.today) plan.remove.push(block.id);
      continue;
    }
    seen.add(block.uid);
    const reason = importedBlockReason(args.feedName, event.summary);
    if (
      block.checkIn !== event.checkIn ||
      block.checkOut !== event.checkOut ||
      block.reason !== reason
    ) {
      plan.update.push({ id: block.id, checkIn: event.checkIn, checkOut: event.checkOut, reason });
    }
  }
  for (const event of upcoming.values()) {
    if (seen.has(event.uid)) continue;
    plan.insert.push({
      uid: event.uid,
      checkIn: event.checkIn,
      checkOut: event.checkOut,
      reason: importedBlockReason(args.feedName, event.summary),
    });
  }
  return plan;
}

/** Nights the other site sold that Zalmox already gave to someone (half-open ranges). */
export function countImportConflicts(
  imported: { checkIn: string; checkOut: string }[],
  taken: { checkIn: string; checkOut: string }[],
): number {
  let count = 0;
  for (const a of imported) {
    if (taken.some((b) => a.checkIn < b.checkOut && b.checkIn < a.checkOut)) count += 1;
  }
  return count;
}
