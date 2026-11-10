import { describe, expect, it } from "vitest";
import { mediaAlt, mediaFocus, mediaFromRow, photosByRoomType } from "@/domain/media/types";

describe("photo library", () => {
  it("reads a stored row, keeping only what is valid", () => {
    expect(
      mediaFromRow({
        id: "a",
        url: "https://x/a.jpg",
        album: "nope",
        room_type_id: null,
        alt: { ro: " Camera ", en: "", fr: "x" },
        focal_x: 2,
        focal_y: "0.25",
        sort_order: 3,
      }),
    ).toEqual({
      id: "a",
      url: "https://x/a.jpg",
      album: "other",
      roomTypeId: null,
      alt: { ro: "Camera" },
      focalX: 1,
      focalY: 0.25,
      sortOrder: 3,
    });
  });

  it("groups photos by room type in their order", () => {
    const row = (id: string, type: string | null, order: number) =>
      mediaFromRow({ id, url: id, album: "rooms", room_type_id: type, sort_order: order });
    const map = photosByRoomType([row("b", "double", 2), row("a", "double", 1), row("c", null, 0), row("d", "suite", 0)]);
    expect(map.get("double")?.map((m) => m.id)).toEqual(["a", "b"]);
    expect(map.get("suite")?.map((m) => m.id)).toEqual(["d"]);
    expect(map.size).toBe(2);
  });

  it("describes a photo in the asked language, else in one it has", () => {
    expect(mediaAlt({ alt: { ro: "Grădina", en: "The garden" } }, "en")).toBe("The garden");
    expect(mediaAlt({ alt: { ro: "Grădina" } }, "bg")).toBe("Grădina");
    expect(mediaAlt({ alt: {} }, "ro")).toBe("");
    expect(mediaFocus({ focalX: 0.3, focalY: 0.75 })).toBe("30% 75%");
  });
});
