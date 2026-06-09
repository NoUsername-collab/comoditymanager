import { describe, expect, it } from "vitest";
import {
  computeFixedPointerMenuPosition,
  getViewportClampMargin,
} from "../viewport-position";

describe("getViewportClampMargin", () => {
  it("returns at least fallback when document is unavailable", () => {
    expect(getViewportClampMargin(8)).toBeGreaterThanOrEqual(8);
  });
});

const phoneViewport = {
  width: 390,
  height: 844,
  offsetTop: 0,
  offsetLeft: 0,
};

describe("computeFixedPointerMenuPosition", () => {
  it("keeps wide menus inside a 390px phone viewport when tapped on the right", () => {
    const pos = computeFixedPointerMenuPosition(
      350,
      400,
      { width: 260, height: 320 },
      { margin: 12, viewport: phoneViewport }
    );
    expect(pos.left).toBeLessThanOrEqual(390 - 260 - 12);
    expect(pos.left).toBeGreaterThanOrEqual(12);
    expect(pos.top).toBeLessThanOrEqual(400);
  });

  it("clamps menus that would extend below the viewport", () => {
    const pos = computeFixedPointerMenuPosition(
      40,
      800,
      { width: 240, height: 320 },
      { margin: 12, viewport: phoneViewport }
    );
    expect(pos.top).toBeLessThanOrEqual(844 - 320 - 12);
  });
});
