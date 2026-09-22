import { describe, expect, it } from "vitest";
import {
  GANTT_ROW_H,
  GANTT_ROW_H_COMPACT,
  parseGanttCoverage,
  resolveGanttRowMetrics,
} from "@/domain/gantt/layout";

describe("parseGanttCoverage", () => {
  it("reads 10, 20, and 30", () => {
    expect(parseGanttCoverage("10")).toBe(10);
    expect(parseGanttCoverage("20")).toBe(20);
    expect(parseGanttCoverage("30")).toBe(30);
  });

  it("migrates the old density toggle", () => {
    expect(parseGanttCoverage("comfortable")).toBe(10);
    expect(parseGanttCoverage("compact")).toBe(30);
  });

  it("defaults to 20 rooms", () => {
    expect(parseGanttCoverage(null)).toBe(20);
    expect(parseGanttCoverage("nope")).toBe(20);
  });
});

describe("resolveGanttRowMetrics", () => {
  it("falls back to preset row heights without a viewport", () => {
    expect(resolveGanttRowMetrics(10).rowH).toBe(GANTT_ROW_H);
    expect(resolveGanttRowMetrics(20).rowH).toBe(36);
    expect(resolveGanttRowMetrics(30).rowH).toBe(GANTT_ROW_H_COMPACT);
  });

  it("sizes rows so the chosen room count fills the viewport", () => {
    expect(resolveGanttRowMetrics(20, 720).rowH).toBe(36);
    expect(resolveGanttRowMetrics(10, 800).rowH).toBe(56);
    expect(resolveGanttRowMetrics(30, 400).rowH).toBe(22);
  });
});
