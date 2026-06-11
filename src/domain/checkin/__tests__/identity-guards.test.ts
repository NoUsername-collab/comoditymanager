import { describe, expect, test } from "vitest";
import {
  findDuplicateNationalIdsInForm,
  holderNationalIdMatches,
} from "../identity-guards";
import type { CheckinGuestInput } from "../types";

const baseGuest = (overrides: Partial<CheckinGuestInput>): CheckinGuestInput => ({
  full_name: "Test Guest",
  last_name: "Guest",
  first_name: "Test",
  phone: "",
  national_id: "",
  national_id_type: "cnp",
  document_type: "ci",
  document_series: "",
  document_number: "",
  nationality: "România",
  birth_date: null,
  room_label: "101",
  is_representative: false,
  ...overrides,
});

describe("findDuplicateNationalIdsInForm", () => {
  test("detects duplicate CNP in form", () => {
    const blockers = findDuplicateNationalIdsInForm([
      baseGuest({
        last_name: "Pop",
        first_name: "Ion",
        national_id: "1850101410014",
      }),
      baseGuest({
        last_name: "Ionescu",
        first_name: "Maria",
        national_id: "1850101410014",
      }),
    ]);

    expect(blockers).toHaveLength(1);
    expect(blockers[0]).toContain("1850101410014");
  });

  test("allows distinct CNPs", () => {
    const blockers = findDuplicateNationalIdsInForm([
      baseGuest({ national_id: "1850101410014" }),
      baseGuest({ national_id: "2850101410018" }),
    ]);
    expect(blockers).toHaveLength(0);
  });
});

describe("holderNationalIdMatches", () => {
  test("matches cleaned CNP on holder profile", () => {
    expect(
      holderNationalIdMatches("1850101410014", "1850101410014", null),
    ).toBe(true);
    expect(
      holderNationalIdMatches("185-0101-410014", null, "1850101410014"),
    ).toBe(true);
  });

  test("rejects mismatched CNP", () => {
    expect(
      holderNationalIdMatches(
        "2850101410018",
        "1850101410014",
        "1850101410014",
      ),
    ).toBe(false);
  });
});
