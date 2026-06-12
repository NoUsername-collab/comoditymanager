import { describe, it, expect } from "vitest";
import { pickGuestContactMatch } from "@/domain/guest/match-guest";

const candidates = [
  {
    id: "a",
    last_name: "Popescu",
    first_name: "Ion",
    phone_normalized: "40722111222",
    email_normalized: "ion@example.com",
  },
  {
    id: "b",
    last_name: "Popescu",
    first_name: "Ion",
    phone_normalized: "40733334444",
    email_normalized: "ion2@example.com",
  },
];

describe("pickGuestContactMatch", () => {
  it("matches phone + email + name", () => {
    const result = pickGuestContactMatch({
      input: { lastName: "Popescu", firstName: "Ion" },
      candidates,
      phoneNormalized: "40722111222",
      emailNormalized: "ion@example.com",
    });
    expect(result).toEqual({
      status: "matched",
      guestId: "a",
      reason: "phone_email_name",
    });
  });

  it("matches phone + name when email differs", () => {
    const result = pickGuestContactMatch({
      input: { lastName: "Popescu", firstName: "Ion" },
      candidates,
      phoneNormalized: "40733334444",
      emailNormalized: null,
    });
    expect(result).toEqual({
      status: "matched",
      guestId: "b",
      reason: "phone_name",
    });
  });

  it("returns ambiguous when the same phone matches multiple guests", () => {
    const result = pickGuestContactMatch({
      input: { lastName: "Popescu", firstName: "Ion" },
      candidates: [
        ...candidates,
        {
          id: "c",
          last_name: "Popescu",
          first_name: "Ion",
          phone_normalized: "40722111222",
          email_normalized: "alt@example.com",
        },
      ],
      phoneNormalized: "40722111222",
      emailNormalized: null,
    });
    expect(result.status).toBe("ambiguous");
  });

  it("matches unique name only", () => {
    const result = pickGuestContactMatch({
      input: { lastName: "Ionescu", firstName: "Maria" },
      candidates: [
        {
          id: "c",
          last_name: "Ionescu",
          first_name: "Maria",
          phone_normalized: null,
          email_normalized: null,
        },
      ],
      phoneNormalized: null,
      emailNormalized: null,
    });
    expect(result).toEqual({
      status: "matched",
      guestId: "c",
      reason: "name",
    });
  });
});
