import { describe, it, expect } from "vitest";
import { occupancyPhase } from "@/domain/occupancy/phase";

describe("occupancyPhase", () => {
  const ref = "2025-06-15";

  it("returns 'past' when checkOut < referenceDate", () => {
    expect(occupancyPhase("2025-06-01", "2025-06-10", ref)).toBe("past");
  });

  it("returns 'active' when checkIn <= ref && checkOut >= ref", () => {
    expect(occupancyPhase("2025-06-10", "2025-06-20", ref)).toBe("active");
  });

  it("returns 'future' when checkIn > ref", () => {
    expect(occupancyPhase("2025-06-20", "2025-06-25", ref)).toBe("future");
  });

  // Edge case: checkout day is still active — checkOut === ref returns "active"
  it("returns 'active' when checkOut === referenceDate (checkout day is still active)", () => {
    expect(occupancyPhase("2025-06-10", "2025-06-15", ref)).toBe("active");
  });

  // Edge case: check-in on reference date
  it("returns 'active' when checkIn === referenceDate", () => {
    expect(occupancyPhase("2025-06-15", "2025-06-20", ref)).toBe("active");
  });

  // Edge case: single-night stay on ref date
  it("returns 'active' for a single-night stay spanning the ref date", () => {
    expect(occupancyPhase("2025-06-15", "2025-06-16", ref)).toBe("active");
  });

  // Edge case: checkOut is day before ref → past
  it("returns 'past' when checkOut is the day before referenceDate", () => {
    expect(occupancyPhase("2025-06-10", "2025-06-14", ref)).toBe("past");
  });

  // Edge case: checkIn is day after ref → future
  it("returns 'future' when checkIn is the day after referenceDate", () => {
    expect(occupancyPhase("2025-06-16", "2025-06-20", ref)).toBe("future");
  });
});
