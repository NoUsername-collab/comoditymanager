import { describe, expect, it } from "vitest";
import { DESIGN_THEMES } from "@/design/themes/catalog";
import { publicColorScheme, resolvePublicThemeStyle } from "@/design/themes/public";

describe("publicColorScheme", () => {
  it("reads light or dark from the background", () => {
    expect(publicColorScheme("#faf7f2")).toBe("light");
    expect(publicColorScheme("#07060a")).toBe("dark");
  });

  it("gives every palette a scheme that matches its background", () => {
    const schemes = Object.fromEntries(
      Object.keys(DESIGN_THEMES).map((id) => [id, resolvePublicThemeStyle(id).colorScheme]),
    );
    expect(schemes).toEqual({
      noir: "dark",
      alpine: "light",
      mediterranean: "dark",
      pearl: "light",
      slate: "light",
      forest: "dark",
    });
  });
});
