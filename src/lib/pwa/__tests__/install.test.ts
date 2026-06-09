import { describe, expect, it } from "vitest";
import {
  isIosSafariUserAgent,
  isMobileInstallUserAgent,
  isPwaInstalledInBrowser,
} from "@/lib/pwa/install";

describe("isPwaInstalledInBrowser", () => {
  it("detects standalone display mode", () => {
    expect(
      isPwaInstalledInBrowser((q) => q.includes("standalone"), false)
    ).toBe(true);
  });

  it("detects iOS standalone flag", () => {
    expect(isPwaInstalledInBrowser(() => false, true)).toBe(true);
  });

  it("returns false in browser tab", () => {
    expect(isPwaInstalledInBrowser(() => false, false)).toBe(false);
  });
});

describe("isIosSafariUserAgent", () => {
  it("matches iPhone Safari", () => {
    expect(
      isIosSafariUserAgent(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
      )
    ).toBe(true);
  });

  it("rejects Chrome on iOS", () => {
    expect(
      isIosSafariUserAgent(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) CriOS/120.0.0.0 Mobile/15E148 Safari/604.1"
      )
    ).toBe(false);
  });
});

describe("isMobileInstallUserAgent", () => {
  it("matches Android", () => {
    expect(isMobileInstallUserAgent("Mozilla/5.0 (Linux; Android 14)")).toBe(true);
  });

  it("rejects desktop", () => {
    expect(
      isMobileInstallUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0"
      )
    ).toBe(false);
  });
});
