import { describe, expect, it } from "vitest";
import { resolveLayoutChrome } from "../chrome";

describe("resolveLayoutChrome", () => {
  it("uses compact chrome for phones and tablet portrait", () => {
    expect(resolveLayoutChrome("mobile", "portrait")).toBe("compact");
    expect(resolveLayoutChrome("mobile", "landscape")).toBe("compact");
    expect(resolveLayoutChrome("tablet", "portrait")).toBe("compact");
  });

  it("uses wide chrome for tablet landscape and desktop", () => {
    expect(resolveLayoutChrome("tablet", "landscape")).toBe("wide");
    expect(resolveLayoutChrome("desktop", "landscape")).toBe("wide");
  });
});
