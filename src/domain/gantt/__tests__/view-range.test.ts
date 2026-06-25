import { describe, it, expect } from "vitest";
import {
  buildMonthRange,
  buildQuarterRange,
  buildRollingRange,
  buildWeekRange,
  mondayOfWeekContaining,
} from "@/domain/gantt/view-range";

describe("GanttDayColumn isPast", () => {
  const today = "2025-06-15";

  it("marks days before reference date as isPast: true", () => {
    const range = buildMonthRange(2025, 5, "en", today); // June 2025 (month is 0-indexed)
    const june1 = range.days.find((d) => d.iso === "2025-06-01");
    expect(june1).toBeDefined();
    expect(june1!.isPast).toBe(true);
  });

  it("marks the reference date itself as isPast: false", () => {
    const range = buildMonthRange(2025, 5, "en", today);
    const june15 = range.days.find((d) => d.iso === "2025-06-15");
    expect(june15).toBeDefined();
    expect(june15!.isPast).toBe(false);
  });

  it("marks days after reference date as isPast: false", () => {
    const range = buildMonthRange(2025, 5, "en", today);
    const june20 = range.days.find((d) => d.iso === "2025-06-20");
    expect(june20).toBeDefined();
    expect(june20!.isPast).toBe(false);
  });

  it("marks the day before reference as isPast: true", () => {
    const range = buildMonthRange(2025, 5, "en", today);
    const june14 = range.days.find((d) => d.iso === "2025-06-14");
    expect(june14).toBeDefined();
    expect(june14!.isPast).toBe(true);
  });
});

describe("GanttDayColumn isToday", () => {
  const today = "2025-06-15";

  it("marks only the reference date as isToday: true", () => {
    const range = buildMonthRange(2025, 5, "en", today);
    const todayCol = range.days.filter((d) => d.isToday);
    expect(todayCol).toHaveLength(1);
    expect(todayCol[0].iso).toBe("2025-06-15");
  });

  it("marks other days as isToday: false", () => {
    const range = buildMonthRange(2025, 5, "en", today);
    const june1 = range.days.find((d) => d.iso === "2025-06-01");
    expect(june1!.isToday).toBe(false);
  });
});

describe("GanttDayColumn isWeekend", () => {
  it("marks Saturday and Sunday as weekend", () => {
    // 2025-06-14 is Saturday, 2025-06-15 is Sunday
    const range = buildMonthRange(2025, 5, "en", "2025-06-01");
    const sat = range.days.find((d) => d.iso === "2025-06-14");
    const sun = range.days.find((d) => d.iso === "2025-06-15");
    expect(sat!.isWeekend).toBe(true);
    expect(sun!.isWeekend).toBe(true);
  });

  it("marks weekdays as not weekend", () => {
    // 2025-06-16 is Monday
    const range = buildMonthRange(2025, 5, "en", "2025-06-01");
    const mon = range.days.find((d) => d.iso === "2025-06-16");
    expect(mon!.isWeekend).toBe(false);
  });
});

describe("buildMonthRange", () => {
  it("returns 30 days for June", () => {
    const range = buildMonthRange(2025, 5, "en", "2025-06-15");
    expect(range.days).toHaveLength(30);
  });

  it("returns 31 days for July", () => {
    const range = buildMonthRange(2025, 6, "en", "2025-07-15");
    expect(range.days).toHaveLength(31);
  });

  it("returns 28 days for Feb in non-leap year", () => {
    const range = buildMonthRange(2025, 1, "en", "2025-02-15");
    expect(range.days).toHaveLength(28);
  });

  it("returns 29 days for Feb in leap year", () => {
    const range = buildMonthRange(2024, 1, "en", "2024-02-15");
    expect(range.days).toHaveLength(29);
  });

  it("sets rangeStart to first of month", () => {
    const range = buildMonthRange(2025, 5, "en");
    expect(range.rangeStart).toBe("2025-06-01");
  });

  it("sets rangeEnd to first of next month", () => {
    const range = buildMonthRange(2025, 5, "en");
    expect(range.rangeEnd).toBe("2025-07-01");
  });
});

describe("buildRollingRange", () => {
  it("builds a 7-day rolling range", () => {
    const range = buildRollingRange("2025-06-10", "days7", "en", undefined, "2025-06-10");
    expect(range.days).toHaveLength(7);
    expect(range.days[0].iso).toBe("2025-06-10");
    expect(range.days[6].iso).toBe("2025-06-16");
  });

  it("builds a 15-day rolling range", () => {
    const range = buildRollingRange("2025-06-01", "days15", "en", undefined, "2025-06-01");
    expect(range.days).toHaveLength(15);
  });

  it("builds a single-day range for 'today' zoom", () => {
    const range = buildRollingRange("2025-06-15", "today", "en", undefined, "2025-06-15");
    expect(range.days).toHaveLength(1);
    expect(range.days[0].iso).toBe("2025-06-15");
    expect(range.days[0].isToday).toBe(true);
  });
});

describe("buildQuarterRange", () => {
  it("uses week columns (~13) instead of daily columns", () => {
    const range = buildQuarterRange(2025, 1, "en", undefined, "2025-04-15");
    expect(range.columnGranularity).toBe("week");
    expect(range.days.length).toBeGreaterThanOrEqual(12);
    expect(range.days.length).toBeLessThanOrEqual(14);
    expect(range.days[0].weekEndIso).toBeDefined();
    expect(range.rangeStart).toBe("2025-04-01");
    expect(range.rangeEnd).toBe("2025-07-01");
  });
});

describe("mondayOfWeekContaining", () => {
  it("returns Monday for a Wednesday", () => {
    // 2025-06-11 is Wednesday → Monday = 2025-06-09
    expect(mondayOfWeekContaining("2025-06-11")).toBe("2025-06-09");
  });

  it("returns same day if it's already Monday", () => {
    // 2025-06-09 is Monday
    expect(mondayOfWeekContaining("2025-06-09")).toBe("2025-06-09");
  });

  it("returns previous Monday for a Sunday", () => {
    // 2025-06-15 is Sunday → Monday = 2025-06-09
    expect(mondayOfWeekContaining("2025-06-15")).toBe("2025-06-09");
  });
});
