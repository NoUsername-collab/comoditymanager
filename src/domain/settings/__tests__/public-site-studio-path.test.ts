import { describe, expect, it } from "vitest";
import {
  isPublicSiteStudioPath,
  isSettingsStudioPath,
} from "@/domain/settings/public-site-studio-path";

describe("settings studio paths", () => {
  it("matches public-site and guest-app studio routes", () => {
    expect(isSettingsStudioPath("/admin/settings/public-site")).toBe(true);
    expect(isSettingsStudioPath("/admin/settings/guest-app?saved=1")).toBe(true);
    expect(isPublicSiteStudioPath("/admin/settings/public-site?saved=1")).toBe(true);
    expect(isPublicSiteStudioPath("/admin/settings/guest-app")).toBe(false);
  });

  it("does not match other settings pages", () => {
    expect(isSettingsStudioPath("/admin/settings")).toBe(false);
    expect(isSettingsStudioPath("/admin/settings/email")).toBe(false);
    expect(isSettingsStudioPath(null)).toBe(false);
  });
});
