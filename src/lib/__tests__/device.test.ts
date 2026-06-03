import { describe, it, expect } from "vitest";
import {
  detectDeviceFromUserAgent,
  isTouchDeviceClass,
} from "@/lib/device";

// ---------------------------------------------------------------------------
// detectDeviceFromUserAgent
// ---------------------------------------------------------------------------
describe("detectDeviceFromUserAgent", () => {
  it('returns "android" for Android user agents', () => {
    expect(
      detectDeviceFromUserAgent(
        "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36"
      )
    ).toBe("android");
  });

  it('returns "ios" for iPhone user agents', () => {
    expect(
      detectDeviceFromUserAgent(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)"
      )
    ).toBe("ios");
  });

  it('returns "ios" for iPad user agents', () => {
    expect(
      detectDeviceFromUserAgent(
        "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)"
      )
    ).toBe("ios");
  });

  it('returns "mobile" for generic mobile user agents', () => {
    expect(
      detectDeviceFromUserAgent(
        "Mozilla/5.0 (Mobile; rv:48.0) Gecko/48.0 Firefox/48.0"
      )
    ).toBe("mobile");
  });

  it('returns "desktop" for desktop user agents', () => {
    expect(
      detectDeviceFromUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      )
    ).toBe("desktop");
  });

  it('returns "desktop" for null/undefined user agent', () => {
    expect(detectDeviceFromUserAgent(null)).toBe("desktop");
    expect(detectDeviceFromUserAgent(undefined)).toBe("desktop");
  });

  it('returns "desktop" for empty string', () => {
    expect(detectDeviceFromUserAgent("")).toBe("desktop");
  });
});

// ---------------------------------------------------------------------------
// isTouchDeviceClass
// ---------------------------------------------------------------------------
describe("isTouchDeviceClass", () => {
  it("returns true for android", () => {
    expect(isTouchDeviceClass("android")).toBe(true);
  });

  it("returns true for ios", () => {
    expect(isTouchDeviceClass("ios")).toBe(true);
  });

  it("returns true for mobile", () => {
    expect(isTouchDeviceClass("mobile")).toBe(true);
  });

  it("returns false for desktop", () => {
    expect(isTouchDeviceClass("desktop")).toBe(false);
  });
});
