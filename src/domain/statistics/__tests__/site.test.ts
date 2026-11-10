import { describe, expect, it } from "vitest";
import { buildSiteStatistics, siteStatisticsSince } from "@/domain/statistics/site";

describe("site statistics", () => {
  const today = "2026-11-10";

  it("reads 12 whole months back", () => {
    expect(siteStatisticsSince(today)).toBe("2025-12-01");
  });

  it("adds up the last 30 days and the share of visitors who asked", () => {
    const stats = buildSiteStatistics({
      today,
      visitDays: [
        { day: "2026-11-10", visits: 30, visitors: 20 },
        { day: "2026-10-12", visits: 10, visitors: 5 },
        // 30 days back is the 12th; the 11th is outside the window
        { day: "2026-10-11", visits: 100, visitors: 100 },
      ],
      bookingDays: [
        { day: "2026-11-09", source: "site", requests: 2, confirmed: 1 },
        { day: "2026-11-02", source: "staff", requests: 4, confirmed: 4 },
        { day: "2026-11-01", source: "phone", requests: 1, confirmed: 0 },
      ],
    });
    expect(stats.last30).toMatchObject({ visits: 40, visitors: 25, siteRequests: 2, siteConfirmed: 1 });
    expect(stats.last30.conversion).toBeCloseTo(0.08);
    expect(stats.last30.bySource).toEqual({ site: 2, staff: 4, phone: 1, unknown: 0 });
  });

  it("lists 12 months, newest first, with empty months kept", () => {
    const stats = buildSiteStatistics({
      today,
      visitDays: [{ day: "2026-09-03", visits: 7, visitors: 4 }],
      bookingDays: [{ day: "2026-09-04", source: "site", requests: 1, confirmed: 1 }],
    });
    expect(stats.months).toHaveLength(12);
    expect(stats.months[0]?.month).toBe("2026-11");
    expect(stats.months[11]?.month).toBe("2025-12");
    expect(stats.months.find((m) => m.month === "2026-09")).toEqual({
      month: "2026-09",
      visits: 7,
      visitors: 4,
      siteRequests: 1,
      siteConfirmed: 1,
    });
    expect(stats.last30.conversion).toBeNull();
  });
});
