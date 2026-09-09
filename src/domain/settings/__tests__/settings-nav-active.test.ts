import { describe, expect, it } from "vitest";
import { resolveActiveSettingsNavId } from "@/domain/settings/settings-nav";

describe("resolveActiveSettingsNavId", () => {
  it("marks overview only on the settings index", () => {
    expect(resolveActiveSettingsNavId("/admin/settings")).toBe("overview");
    expect(resolveActiveSettingsNavId("/admin/settings/")).toBe("overview");
  });

  it("highlights public-site instead of overview on the public site page", () => {
    expect(resolveActiveSettingsNavId("/admin/settings/public-site")).toBe(
      "public-site",
    );
    expect(resolveActiveSettingsNavId("/ro/admin/settings/public-site")).toBe(
      "public-site",
    );
    expect(resolveActiveSettingsNavId("/en/admin/settings/public-site")).toBe(
      "public-site",
    );
  });

  it("uses the layout child segment when the pathname still looks like overview", () => {
    expect(
      resolveActiveSettingsNavId("/admin/settings", "public-site"),
    ).toBe("public-site");
    expect(resolveActiveSettingsNavId("/admin/settings", "staff")).toBe("team");
    expect(resolveActiveSettingsNavId("/admin/settings", null)).toBe("overview");
  });

  it("keeps nested location routes on location", () => {
    expect(
      resolveActiveSettingsNavId("/admin/settings/location/setup"),
    ).toBe("location");
  });
});
