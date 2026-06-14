import { describe, it, expect } from "vitest";
import {
  guestHasDocumentExpiry,
  guestRequiresDocumentExpiry,
} from "@/domain/checkin/document-rules";
import type { CheckinGuestInput } from "@/domain/checkin/types";

const baseGuest: CheckinGuestInput = {
  full_name: "Test Guest",
  last_name: "Test",
  first_name: "Guest",
};

describe("guestRequiresDocumentExpiry", () => {
  it("requires expiry when document type is selected", () => {
    expect(
      guestRequiresDocumentExpiry({
        ...baseGuest,
        document_type: "passport",
      })
    ).toBe(true);
  });

  it("does not require expiry for CNP-only RO flow", () => {
    expect(
      guestRequiresDocumentExpiry({
        ...baseGuest,
        national_id: "1850101410014",
        national_id_type: "cnp",
      })
    ).toBe(false);
  });

  it("does not require expiry for RO CI with valid CNP", () => {
    expect(
      guestRequiresDocumentExpiry({
        ...baseGuest,
        nationality: "România",
        document_type: "ci",
        document_series: "XB",
        document_number: "340090",
        national_id: "1850101410014",
        national_id_type: "cnp",
      }),
    ).toBe(false);
  });

  it("skips absent or keys-only guests", () => {
    expect(
      guestRequiresDocumentExpiry({
        ...baseGuest,
        document_type: "passport",
        present_at_checkin: false,
      })
    ).toBe(false);
  });
});

describe("guestHasDocumentExpiry", () => {
  it("detects filled expiry date", () => {
    expect(
      guestHasDocumentExpiry({
        ...baseGuest,
        doc_expiry_date: "2030-01-01",
      })
    ).toBe(true);
  });
});
