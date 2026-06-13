import { describe, expect, it } from "vitest";
import {
  guestAppThemeClassName,
  parseGuestAppThemeSource,
  resolveGuestAppThemeId,
  resolveGuestAppThemeStyle,
} from "../guest-app";

describe("resolveGuestAppThemeId", () => {
  it("inherits public site theme by default", () => {
    expect(resolveGuestAppThemeId({}, "alpine")).toBe("alpine");
    expect(resolveGuestAppThemeId({ themeId: "inherit" }, "mediterranean")).toBe(
      "mediterranean",
    );
  });

  it("uses explicit family when set", () => {
    expect(
      resolveGuestAppThemeId({ themeId: "noir" }, "alpine"),
    ).toBe("noir");
  });

  it("custom uses public family as base", () => {
    expect(
      resolveGuestAppThemeId({ themeId: "custom" }, "alpine"),
    ).toBe("alpine");
  });

  it("migrates legacy keys", () => {
    expect(resolveGuestAppThemeId({ themeId: "default" }, "noir")).toBe("noir");
  });
});

describe("resolveGuestAppThemeStyle", () => {
  it("maps catalog tokens to guest CSS vars", () => {
    const style = resolveGuestAppThemeStyle({ themeId: "noir" }, "noir");
    expect(style["--guest-bg"]).toBe("#07060a");
    expect(style["--guest-primary"]).toBe("#d6b55a");
    expect(style.backgroundColor).toBe("#07060a");
  });

  it("applies custom colors on top of inherited family", () => {
    const style = resolveGuestAppThemeStyle(
      {
        themeId: "custom",
        primaryColor: "#ff0000",
        accentColor: "#00ff00",
      },
      "noir",
    );
    expect(style["--guest-primary"]).toBe("#ff0000");
    expect(style["--guest-accent"]).toBe("#00ff00");
    expect(style["--guest-bg"]).toBe("#07060a");
  });
});

describe("guestAppThemeClassName", () => {
  it("includes family and source modifiers", () => {
    expect(guestAppThemeClassName({ themeId: "inherit" }, "alpine")).toContain(
      "guest-app--theme-alpine",
    );
    expect(guestAppThemeClassName({ themeId: "inherit" }, "alpine")).toContain(
      "guest-app--inherits-public",
    );
    expect(guestAppThemeClassName({ themeId: "custom" }, "noir")).toContain(
      "guest-app--custom-colors",
    );
  });
});

describe("parseGuestAppThemeSource", () => {
  it("parses known sources", () => {
    expect(parseGuestAppThemeSource("inherit")).toBe("inherit");
    expect(parseGuestAppThemeSource("custom")).toBe("custom");
    expect(parseGuestAppThemeSource("alpine")).toBe("alpine");
    expect(parseGuestAppThemeSource("default")).toBe("noir");
  });
});
