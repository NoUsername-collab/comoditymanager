import { describe, it, expect } from "vitest";
import {
  activityJournalCategory,
  splitActivityByCategory,
} from "@/domain/activity/categories";
import type { ActivityAction, ActivityLogEntry } from "@/domain/activity/types";

// ---------------------------------------------------------------------------
// activityJournalCategory
// ---------------------------------------------------------------------------
describe("activityJournalCategory", () => {
  it('classifies booking.* actions as "rezervari"', () => {
    const bookingActions: ActivityAction[] = [
      "booking.request_created",
      "booking.confirmed",
      "booking.cancelled",
      "booking.shifted",
      "booking.room_moved",
      "booking.rebooked",
      "booking.flagged",
      "booking.checkin.set",
      "booking.checkout.set",
    ];
    for (const action of bookingActions) {
      expect(activityJournalCategory(action)).toBe("rezervari");
    }
  });

  it('classifies checkin.* actions as "rezervari"', () => {
    const checkinActions: ActivityAction[] = [
      "checkin.created",
      "checkin.updated",
    ];
    for (const action of checkinActions) {
      expect(activityJournalCategory(action)).toBe("rezervari");
    }
  });

  it('classifies non-booking actions as "admin"', () => {
    const adminActions: ActivityAction[] = [
      "auth.login",
      "auth.logout",
      "settings.updated",
      "building.created",
      "room.updated",
      "staff.invited",
      "guest.created",
    ];
    for (const action of adminActions) {
      expect(activityJournalCategory(action)).toBe("admin");
    }
  });
});

// ---------------------------------------------------------------------------
// splitActivityByCategory
// ---------------------------------------------------------------------------
function makeEntry(action: ActivityAction): ActivityLogEntry {
  return {
    id: crypto.randomUUID(),
    created_at: "2025-06-01T10:00:00Z",
    actor_id: null,
    actor_email: null,
    action,
    entity_type: "booking",
    entity_id: null,
    summary: "",
    metadata: {},
    undoable: false,
    undone_at: null,
    undone_by: null,
    reverts_log_id: null,
  };
}

describe("splitActivityByCategory", () => {
  it("splits entries into rezervari and admin buckets", () => {
    const entries = [
      makeEntry("booking.confirmed"),
      makeEntry("auth.login"),
      makeEntry("booking.cancelled"),
      makeEntry("settings.updated"),
    ];
    const result = splitActivityByCategory(entries);
    expect(result.rezervari).toHaveLength(2);
    expect(result.admin).toHaveLength(2);
  });

  it("returns empty arrays when given no entries", () => {
    const result = splitActivityByCategory([]);
    expect(result.rezervari).toHaveLength(0);
    expect(result.admin).toHaveLength(0);
  });

  it("puts all booking entries into rezervari when no admin entries exist", () => {
    const entries = [
      makeEntry("booking.confirmed"),
      makeEntry("booking.shifted"),
    ];
    const result = splitActivityByCategory(entries);
    expect(result.rezervari).toHaveLength(2);
    expect(result.admin).toHaveLength(0);
  });
});
