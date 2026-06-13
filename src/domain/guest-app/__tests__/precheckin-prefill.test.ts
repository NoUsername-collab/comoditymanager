import { describe, expect, it } from "vitest";
import { buildGuestPrecheckinPrefill } from "@/domain/guest-app/precheckin-prefill";

describe("buildGuestPrecheckinPrefill", () => {
  it("uses booking contact fields when no guest profile", () => {
    const prefill = buildGuestPrecheckinPrefill({
      booking: {
        guestName: "Popescu Ion",
        guestLastName: "Popescu",
        guestFirstName: "Ion",
        guestEmail: "ion@example.com",
        guestPhone: "0722000000",
      },
    });

    expect(prefill.lastName).toBe("Popescu");
    expect(prefill.firstName).toBe("Ion");
    expect(prefill.phone).toBe("0722000000");
    expect(prefill.email).toBe("ion@example.com");
    expect(prefill.hasGuestProfile).toBe(false);
  });

  it("merges guest profile identity from mother app", () => {
    const prefill = buildGuestPrecheckinPrefill({
      booking: {
        guestName: "Popescu Ion",
        guestLastName: "Popescu",
        guestFirstName: "Ion",
        guestPhone: "0722111111",
      },
      guest: {
        lastName: "Popescu",
        firstName: "Ion",
        phone: "0722000000",
        email: "ion@example.com",
        docType: "ci",
        docNumber: "RX123456",
        nationalId: "1850101410017",
        nationalIdType: "cnp",
        birthDate: "1985-01-01",
        nationality: "România",
      },
    });

    expect(prefill.hasGuestProfile).toBe(true);
    expect(prefill.phone).toBe("0722111111");
    expect(prefill.documentType).toBe("ci");
    expect(prefill.documentNumber).toBe("RX123456");
    expect(prefill.nationalId).toBe("1850101410017");
    expect(prefill.birthDate).toBe("1985-01-01");
  });

  it("splits guest_name when name parts missing", () => {
    const prefill = buildGuestPrecheckinPrefill({
      booking: {
        guestName: "Ionescu Maria Elena",
      },
    });

    expect(prefill.lastName).toBe("Ionescu");
    expect(prefill.firstName).toBe("Maria Elena");
  });
});
