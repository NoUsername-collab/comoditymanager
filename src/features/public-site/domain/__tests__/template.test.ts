import { describe, expect, it } from "vitest";
import { effectivePublicTemplate } from "@/features/public-site/domain/template";

describe("effectivePublicTemplate", () => {
  it("uses Classic for Panoramic until there is a hero photo", () => {
    expect(effectivePublicTemplate({ templateId: "immersive", hero: { imageUrl: null } })).toBe("classic");
    expect(effectivePublicTemplate({ templateId: "immersive", hero: { imageUrl: "https://x.supabase.co/a.jpg" } })).toBe("immersive");
    expect(effectivePublicTemplate({ templateId: "editorial", hero: {} })).toBe("editorial");
  });
});
