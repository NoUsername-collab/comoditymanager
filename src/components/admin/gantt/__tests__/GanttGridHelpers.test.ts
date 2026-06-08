import { describe, expect, it } from "vitest";
import {
  DAY_COL_MIN_W,
  ROOM_COL_W,
  resolveGanttColumnMetrics,
} from "../GanttGridHelpers";

describe("resolveGanttColumnMetrics", () => {
  it("returns desktop widths when not compact chrome", () => {
    expect(resolveGanttColumnMetrics(false, "portrait")).toEqual({
      roomCol: ROOM_COL_W,
      dayMin: DAY_COL_MIN_W,
    });
  });

  it("narrows columns in portrait compact chrome", () => {
    const m = resolveGanttColumnMetrics(true, "portrait");
    expect(m.roomCol).toBe("5.25rem");
    expect(m.dayMin).toBe("1.375rem");
  });

  it("narrows further in landscape compact chrome", () => {
    const m = resolveGanttColumnMetrics(true, "landscape");
    expect(m.roomCol).toBe("4.25rem");
    expect(m.dayMin).toBe("1.125rem");
  });
});
