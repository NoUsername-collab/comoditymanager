import { describe, expect, it } from "vitest";
import { DEFAULT_GUEST_APP_FEATURES } from "@/domain/guest-app/defaults";
import { buildGuestBottomNav } from "@/features/guest-app/nav";

describe("buildGuestBottomNav", () => {
  it("keeps More even when the priority features fill the bar", () => {
    const tabs = buildGuestBottomNav("stay1", DEFAULT_GUEST_APP_FEATURES);
    expect(tabs.map((tab) => tab.id)).toEqual(["home", "wifi", "online_checkin", "menu"]);
  });

  it("omits More when nothing else is published", () => {
    const tabs = buildGuestBottomNav("stay1", []);
    expect(tabs.map((tab) => tab.id)).toEqual(["home"]);
  });
});
