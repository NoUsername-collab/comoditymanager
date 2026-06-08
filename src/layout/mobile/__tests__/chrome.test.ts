import { describe, expect, it } from "vitest";
import { resolveLayoutChrome } from "../chrome";

describe("resolveLayoutChrome", () => {
  it("uses compact chrome for phones and all tablet orientations", () => {
    expect(resolveLayoutChrome("mobile", "portrait")).toBe("compact");
    expect(resolveLayoutChrome("mobile", "landscape")).toBe("compact");
    expect(resolveLayoutChrome("tablet", "portrait")).toBe("compact");
    expect(resolveLayoutChrome("tablet", "landscape")).toBe("compact");
  });

  it("uses wide chrome for desktop only", () => {
    expect(resolveLayoutChrome("desktop", "landscape")).toBe("wide");
    expect(resolveLayoutChrome("desktop", "portrait")).toBe("wide");
  });
});
