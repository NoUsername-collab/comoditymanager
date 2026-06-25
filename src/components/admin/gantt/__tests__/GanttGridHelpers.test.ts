import { describe, expect, it } from "vitest";
import {
  DAY_COL_MIN_W,
  ROOM_COL_W,
  drillDownZoomFrom,
  ganttDayGridStyle,
  resolveGanttColumnMetrics,
  resolveGanttDayGridOptions,
  resolveGanttShellZoom,
  resolveGanttTableLayout,
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
    expect(m.roomCol).toBe("3.5rem");
    expect(m.dayMin).toBe(DAY_COL_MIN_W);
  });

  it("narrows further in landscape compact chrome", () => {
    const m = resolveGanttColumnMetrics(true, "landscape");
    expect(m.roomCol).toBe("4.25rem");
    expect(m.dayMin).toBe("1.125rem");
  });
});

describe("resolveGanttDayGridOptions", () => {
  it("stretches 7d or fewer on portrait compact", () => {
    expect(resolveGanttDayGridOptions(true, "compact", true, DAY_COL_MIN_W, 7)).toEqual({
      dayMin: DAY_COL_MIN_W,
      fixed: false,
    });
    expect(resolveGanttDayGridOptions(true, "compact", true, DAY_COL_MIN_W, 1)).toEqual({
      dayMin: DAY_COL_MIN_W,
      fixed: false,
    });
  });

  it("uses fixed columns for 15d+ on portrait compact", () => {
    expect(resolveGanttDayGridOptions(true, "compact", true, DAY_COL_MIN_W, 15)).toEqual({
      dayMin: DAY_COL_MIN_W,
      fixed: true,
    });
    expect(resolveGanttDayGridOptions(true, "compact", true, DAY_COL_MIN_W, 30)).toEqual({
      dayMin: DAY_COL_MIN_W,
      fixed: true,
    });
  });

  it("uses fixed columns for comfortable desktop when range > 7 days", () => {
    expect(
      resolveGanttDayGridOptions(false, "comfortable", false, DAY_COL_MIN_W, 30),
    ).toEqual({
      dayMin: DAY_COL_MIN_W,
      fixed: true,
    });
  });

  it("returns undefined on landscape compact or compact desktop overview", () => {
    expect(resolveGanttDayGridOptions(true, "compact", false, "1rem", 30)).toBeUndefined();
    expect(resolveGanttDayGridOptions(false, "compact", true, DAY_COL_MIN_W, 30)).toBeUndefined();
  });
});

describe("resolveGanttTableLayout", () => {
  it("always fills viewport width with scroll min when needed", () => {
    const metrics = { roomCol: ROOM_COL_W, dayMin: DAY_COL_MIN_W };
    expect(resolveGanttTableLayout(30, metrics)).toEqual({
      roomCol: ROOM_COL_W,
      daysCol: "auto",
      tableWidth: "100%",
      tableMinWidth: `max(100%, calc(${ROOM_COL_W} + calc(30 * ${DAY_COL_MIN_W})))`,
    });
  });
});

describe("ganttDayGridStyle", () => {
  it("uses fixed columns when fixed", () => {
    expect(ganttDayGridStyle(30, { dayMin: DAY_COL_MIN_W, fixed: true })).toEqual({
      gridTemplateColumns: `repeat(30, minmax(${DAY_COL_MIN_W}, 1fr))`,
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

describe("resolveGanttShellZoom", () => {
  it("maps rolling zooms to shell tokens", () => {
    expect(resolveGanttShellZoom("today")).toBe("7z");
    expect(resolveGanttShellZoom("days7")).toBe("7z");
    expect(resolveGanttShellZoom("days15")).toBe("15z");
    expect(resolveGanttShellZoom("days30")).toBe("30z");
    expect(resolveGanttShellZoom("quarter")).toBe("quarter");
  });
});

describe("drillDownZoomFrom", () => {
  it("steps down zoom levels", () => {
    expect(drillDownZoomFrom("quarter")).toBe("days30");
    expect(drillDownZoomFrom("days30")).toBe("days7");
    expect(drillDownZoomFrom("days15")).toBe("days7");
    expect(drillDownZoomFrom("days7")).toBe("today");
    expect(drillDownZoomFrom("today")).toBeNull();
  });
});
