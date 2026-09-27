import { describe, expect, it } from "vitest";
import { ganttDayTimeStyle, timeToDayFraction } from "@/lib/gantt-time";

describe("ganttDayTimeStyle", () => {
  it("maps 11:00 checkout and 14:00 check-in to day percentages", () => {
    expect(timeToDayFraction("11:00")).toBeCloseTo(11 / 24, 5);
    expect(timeToDayFraction("14:00")).toBeCloseTo(14 / 24, 5);
    expect(ganttDayTimeStyle("14:00", "11:00")).toEqual({
      "--gantt-check-out-pct": `${(11 / 24) * 100}%`,
      "--gantt-check-in-pct": `${(14 / 24) * 100}%`,
    });
  });
});
