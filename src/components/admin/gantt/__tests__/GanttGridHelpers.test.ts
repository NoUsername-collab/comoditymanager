import { describe, expect, it } from "vitest";
import {
  DAY_COL_MIN_W,
  ROOM_COL_W,
  ganttDayGridStyle,
  resolveGanttColumnMetrics,
  resolveGanttDayGridOptions,
} from "../GanttGridHelpers";

describe("resolveGanttColumnMetrics", () => {
  it("returns desktop widths when not compact chrome", () => {
    expect(resolveGanttColumnMetrics(false, "portrait")).toEqual({
      roomCol: ROOM_COL_W,
      dayMin: DAY_COL_MIN_W,
    });
  });

  it("uses readable fixed columns in portrait compact chrome", () => {
    const m = resolveGanttColumnMetrics(true, "portrait");
    expect(m.roomCol).toBe("4.75rem");
    expect(m.dayMin).toBe(DAY_COL_MIN_W);
  });

  it("narrows further in landscape compact chrome", () => {
    const m = resolveGanttColumnMetrics(true, "landscape");
    expect(m.roomCol).toBe("4.25rem");
    expect(m.dayMin).toBe("1.125rem");
  });
});

describe("resolveGanttDayGridOptions", () => {
  it("returns fixed grid on portrait compact", () => {
    expect(resolveGanttDayGridOptions(true, true, DAY_COL_MIN_W)).toEqual({
      dayMin: DAY_COL_MIN_W,
      fixed: true,
    });
  });

  it("returns undefined on landscape or desktop", () => {
    expect(resolveGanttDayGridOptions(true, false, "1rem")).toBeUndefined();
    expect(resolveGanttDayGridOptions(false, true, DAY_COL_MIN_W)).toBeUndefined();
  });
});

describe("ganttDayGridStyle", () => {
  it("uses fixed columns when fixed", () => {
    expect(ganttDayGridStyle(30, { dayMin: DAY_COL_MIN_W, fixed: true })).toEqual({
      gridTemplateColumns: `repeat(30, ${DAY_COL_MIN_W})`,
    });
  });

  it("uses minmax when dayMin without fixed", () => {
    expect(ganttDayGridStyle(7, { dayMin: "1rem" })).toEqual({
      gridTemplateColumns: "repeat(7, minmax(1rem, 1fr))",
    });
  });

  it("falls back to flexible columns", () => {
    expect(ganttDayGridStyle(14)).toEqual({
      gridTemplateColumns: "repeat(14, minmax(0, 1fr))",
    });
  });
});
