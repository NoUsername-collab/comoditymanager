import { describe, expect, it } from "vitest";
import {
  formatTouristSheetAddress,
  parseTouristSheetAddress,
} from "@/domain/checkin/tourist-sheet-address";

describe("tourist-sheet-address", () => {
  it("formats structured parts into a single line", () => {
    expect(
      formatTouristSheetAddress({
        street: "Str. Mihai Viteazu nr. 12",
        locality: "Sinaia",
        county: "Prahova",
      })
    ).toBe("Str. Mihai Viteazu nr. 12, Sinaia, Prahova");
  });

  it("returns null when all parts are empty", () => {
    expect(
      formatTouristSheetAddress({ street: "", locality: "", county: "" })
    ).toBeNull();
  });

  it("parses legacy comma-separated addresses", () => {
    expect(
      parseTouristSheetAddress("Str. X nr. 1, Brașov, Brașov")
    ).toEqual({
      street: "Str. X nr. 1",
      locality: "Brașov",
      county: "Brașov",
    });
  });

  it("keeps unknown legacy text in street", () => {
    expect(parseTouristSheetAddress("Adresa veche pe un singur rând")).toEqual({
      street: "Adresa veche pe un singur rând",
      locality: "",
      county: "",
    });
  });
});
