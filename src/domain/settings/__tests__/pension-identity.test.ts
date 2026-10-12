import { describe, expect, it } from "vitest";
import {
  EMPTY_PENSION_CONTACT,
  resolveHotelContactWithPrimary,
} from "@/domain/settings/pension-identity";

const primary = { ...EMPTY_PENSION_CONTACT, phone: "+40 700 000 000", email: "hi@casa.ro" };

describe("resolveHotelContactWithPrimary", () => {
  it("fills empty guest-app fields from Property identity, address included", () => {
    expect(resolveHotelContactWithPrimary(primary, {}, true, "Str. Mare 1, Bran")).toEqual({
      phone: "+40 700 000 000",
      email: "hi@casa.ro",
      address: "Str. Mare 1, Bran",
    });
  });

  it("keeps values set only for the guest app", () => {
    const resolved = resolveHotelContactWithPrimary(
      primary,
      { phone: "+40 711 111 111", address: "Cabana" },
      true,
      "Str. Mare 1, Bran",
    );
    expect(resolved.phone).toBe("+40 711 111 111");
    expect(resolved.address).toBe("Cabana");
  });

  it("ignores Property identity when the guest app opts out", () => {
    expect(resolveHotelContactWithPrimary(primary, { phone: "1" }, false, "Str. Mare 1")).toEqual({
      phone: "1",
    });
  });
});
