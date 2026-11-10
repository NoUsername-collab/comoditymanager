import { describe, expect, it } from "vitest";
import { geocodeQueries } from "@/domain/settings/geocode-queries";

describe("map searches for an address", () => {
  it("goes from the exact address to the locality, spelling out abbreviations", () => {
    expect(geocodeQueries("Str. Principala Nr. 1, Dumitra, BN")).toEqual([
      { query: "Str. Principala Nr. 1, Dumitra, BN", approximate: false },
      { query: "Strada Principala 1, Dumitra, Bistrița-Năsăud", approximate: false },
      { query: "Dumitra, Bistrița-Năsăud", approximate: true },
    ]);
  });

  it("keeps a single-part address as it is, and skips nothing to search", () => {
    expect(geocodeQueries("Sibiu")).toEqual([{ query: "Sibiu", approximate: false }]);
    expect(geocodeQueries(" ")).toEqual([]);
  });
});
