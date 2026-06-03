import { describe, it, expect } from "vitest";
import {
  roomNightStatus,
  type NightStay,
} from "@/domain/availability/room-night-status";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function stay(
  room_id: string,
  check_in: string,
  check_out: string,
  status: "confirmata" | "cerere_noua",
  guest_name: string
): NightStay {
  return { room_id, check_in, check_out, status, guest_name };
}

// ---------------------------------------------------------------------------
// roomNightStatus
// ---------------------------------------------------------------------------

describe("roomNightStatus", () => {
  it("returns inactive for an inactive room", () => {
    expect(roomNightStatus(false, "r1", "2026-07-10", [])).toEqual({
      status: "inactive",
      guest: null,
    });
  });

  it("returns free for an active room with no stays", () => {
    expect(roomNightStatus(true, "r1", "2026-07-10", [])).toEqual({
      status: "free",
      guest: null,
    });
  });

  it("returns occupied with guest name for a confirmed stay covering the date", () => {
    const stays = [stay("r1", "2026-07-09", "2026-07-12", "confirmata", "Ion Popescu")];
    expect(roomNightStatus(true, "r1", "2026-07-10", stays)).toEqual({
      status: "occupied",
      guest: "Ion Popescu",
    });
  });

  it("returns pending with guest name for a cerere_noua stay", () => {
    const stays = [stay("r1", "2026-07-09", "2026-07-12", "cerere_noua", "Maria Ionescu")];
    expect(roomNightStatus(true, "r1", "2026-07-10", stays)).toEqual({
      status: "pending",
      guest: "Maria Ionescu",
    });
  });

  it("returns occupied when both confirmed and pending stays exist (confirmed takes precedence)", () => {
    const stays = [
      stay("r1", "2026-07-09", "2026-07-12", "cerere_noua", "Pending Guest"),
      stay("r1", "2026-07-09", "2026-07-12", "confirmata", "Confirmed Guest"),
    ];
    expect(roomNightStatus(true, "r1", "2026-07-10", stays)).toEqual({
      status: "occupied",
      guest: "Confirmed Guest",
    });
  });

  it("returns free when stay is for a different room", () => {
    const stays = [stay("r2", "2026-07-09", "2026-07-12", "confirmata", "Other Room Guest")];
    expect(roomNightStatus(true, "r1", "2026-07-10", stays)).toEqual({
      status: "free",
      guest: null,
    });
  });

  it("returns free when date is outside stay range", () => {
    const stays = [stay("r1", "2026-07-09", "2026-07-12", "confirmata", "Guest")];
    // check_out date is not occupied (nightOccupied uses date < check_out)
    expect(roomNightStatus(true, "r1", "2026-07-12", stays)).toEqual({
      status: "free",
      guest: null,
    });
  });
});
