import { describe, expect, it } from "vitest";
import {
  ganttLayerQueryValue,
  parseGanttLayerFilter,
} from "@/domain/gantt/occupancy-layer";

describe("parseGanttLayerFilter", () => {
  it("maps Romanian query aliases to English internals", () => {
    expect(parseGanttLayerFilter("cereri")).toBe("requests");
    expect(parseGanttLayerFilter("confirmate")).toBe("confirmed");
    expect(parseGanttLayerFilter("trecute")).toBe("past");
  });

  it("accepts English query values", () => {
    expect(parseGanttLayerFilter("requests")).toBe("requests");
    expect(parseGanttLayerFilter("confirmed")).toBe("confirmed");
    expect(parseGanttLayerFilter("past")).toBe("past");
  });

  it("defaults unknown or empty to all", () => {
    expect(parseGanttLayerFilter(undefined)).toBe("all");
    expect(parseGanttLayerFilter("")).toBe("all");
    expect(parseGanttLayerFilter("nope")).toBe("all");
  });
});

describe("ganttLayerQueryValue", () => {
  it("writes Romanian aliases for operator URLs", () => {
    expect(ganttLayerQueryValue("all")).toBeNull();
    expect(ganttLayerQueryValue("requests")).toBe("cereri");
    expect(ganttLayerQueryValue("confirmed")).toBe("confirmate");
    expect(ganttLayerQueryValue("past")).toBe("trecute");
  });
});
