import { describe, expect, it } from "vitest";
import {
  legacyRoomTypeFromCatalogSlug,
  roomTypeSlugForDb,
} from "@/domain/room/legacy-room-type";

describe("legacyRoomTypeFromCatalogSlug", () => {
  it("passes through allowed legacy values", () => {
    expect(legacyRoomTypeFromCatalogSlug("double")).toBe("double");
    expect(legacyRoomTypeFromCatalogSlug("triple")).toBe("triple");
  });

  it("maps twin to double", () => {
    expect(legacyRoomTypeFromCatalogSlug("twin")).toBe("double");
  });

  it("maps unknown catalog slugs to other", () => {
    expect(legacyRoomTypeFromCatalogSlug("family")).toBe("other");
    expect(legacyRoomTypeFromCatalogSlug("quad")).toBe("other");
  });
});

describe("roomTypeSlugForDb", () => {
  it("keeps catalog slug after constraint drop", () => {
    expect(roomTypeSlugForDb("twin")).toBe("twin");
    expect(roomTypeSlugForDb("family")).toBe("family");
  });
});
