import { describe, expect, it } from "vitest";
import { internationalPhone, withInternationalPhones } from "@/domain/settings/phone";

describe("internationalPhone", () => {
  it("gives a national number the property's country code", () => {
    expect(internationalPhone("0730 127 427", "RO")).toBe("+40730127427");
    expect(internationalPhone("(0730) 127-427", "RO")).toBe("+40730127427");
    expect(internationalPhone("0888 123 456", "BG")).toBe("+359888123456");
    expect(internationalPhone("069 123 456", "MD")).toBe("+37369123456");
  });

  it("keeps a number that already has its country code", () => {
    expect(internationalPhone("+40 730 127 427", "BG")).toBe("+40730127427");
    expect(internationalPhone("0040730127427", "RO")).toBe("+40730127427");
    expect(internationalPhone("40730127427", "RO")).toBe("+40730127427");
    expect(internationalPhone("+44 20 7946 0958", "RO")).toBe("+442079460958");
  });

  it("leaves empty as null and text that is not a number as written", () => {
    expect(internationalPhone("  ", "RO")).toBeNull();
    expect(internationalPhone(null, "RO")).toBeNull();
    expect(internationalPhone("sună la recepție", "RO")).toBe("sună la recepție");
  });

  it("changes only the phone and WhatsApp of a contact", () => {
    expect(
      withInternationalPhones({ email: "a@b.ro", phone: "0755232632", whatsapp: "0730127427" }, "RO"),
    ).toEqual({ email: "a@b.ro", phone: "+40755232632", whatsapp: "+40730127427" });
    const onlyEmail: { email: string; phone?: string | null } = { email: "a@b.ro" };
    expect(withInternationalPhones(onlyEmail, "RO")).toEqual({ email: "a@b.ro" });
  });
});
