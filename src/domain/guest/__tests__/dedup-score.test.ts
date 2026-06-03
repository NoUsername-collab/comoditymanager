import { describe, it, expect } from "vitest";
import {
  scoreDedupCandidate,
  scoreDedupCandidates,
  dedupAction,
  type DedupInput,
  type DedupGuestRow,
  type DedupCandidate,
} from "@/domain/guest/dedup-score";

// ---------------------------------------------------------------------------
// Factory helpers
// ---------------------------------------------------------------------------

function makeInput(overrides: Partial<DedupInput> = {}): DedupInput {
  return {
    lastName: "Popescu",
    firstName: "Ion",
    phone: "+40740123456",
    phoneNormalized: "+40740123456",
    email: "ion@example.com",
    emailNormalized: "ion@example.com",
    nationalId: null,
    nationalIdType: null,
    docNumber: null,
    docType: null,
    birthDate: null,
    city: null,
    ...overrides,
  };
}

function makeRow(overrides: Partial<DedupGuestRow> = {}): DedupGuestRow {
  return {
    id: "row-1",
    display_name: "Ion Popescu",
    last_name: "Popescu",
    first_name: "Ion",
    phone: "+40740123456",
    phone_normalized: "+40740123456",
    email: "ion@example.com",
    email_normalized: "ion@example.com",
    national_id: null,
    national_id_type: null,
    cnp: null,
    doc_number: null,
    doc_type: null,
    birth_date: null,
    city: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// scoreDedupCandidate
// ---------------------------------------------------------------------------
describe("scoreDedupCandidate", () => {
  it("returns score 100 / hard tier for same national_id", () => {
    const input = makeInput({ nationalId: "1850101410014" });
    const row = makeRow({
      national_id: "1850101410014",
      phone_normalized: null,
      email_normalized: null,
    });
    const result = scoreDedupCandidate(input, row);
    expect(result).not.toBeNull();
    expect(result!.score).toBe(100);
    expect(result!.tier).toBe("hard");
    expect(result!.reasons).toContain("national_id");
  });

  it("matches national_id against row.cnp fallback", () => {
    const input = makeInput({ nationalId: "1850101410014" });
    const row = makeRow({
      national_id: null,
      cnp: "1850101410014",
      phone_normalized: null,
      email_normalized: null,
    });
    const result = scoreDedupCandidate(input, row);
    expect(result).not.toBeNull();
    expect(result!.score).toBe(100);
    expect(result!.tier).toBe("hard");
  });

  it("returns score 85 / strong tier for same phone + last name", () => {
    const input = makeInput({ nationalId: null });
    const row = makeRow({
      national_id: null,
      email_normalized: null,
    });
    const result = scoreDedupCandidate(input, row);
    expect(result).not.toBeNull();
    expect(result!.score).toBe(85);
    expect(result!.tier).toBe("strong");
    expect(result!.reasons).toContain("phone_lastname");
  });

  it("returns score 80 / strong tier for same email + last name", () => {
    const input = makeInput({ nationalId: null, phoneNormalized: null, phone: null });
    const row = makeRow({
      national_id: null,
      phone_normalized: null,
    });
    const result = scoreDedupCandidate(input, row);
    expect(result).not.toBeNull();
    expect(result!.score).toBe(80);
    expect(result!.tier).toBe("strong");
    expect(result!.reasons).toContain("email_lastname");
  });

  it("returns score 75 / strong tier for same doc_number + doc_type", () => {
    const input = makeInput({
      nationalId: null,
      phoneNormalized: null,
      phone: null,
      emailNormalized: null,
      email: null,
      docNumber: "AB123456",
      docType: "ci",
    });
    const row = makeRow({
      national_id: null,
      phone_normalized: null,
      email_normalized: null,
      doc_number: "AB123456",
      doc_type: "ci",
    });
    const result = scoreDedupCandidate(input, row);
    expect(result).not.toBeNull();
    expect(result!.score).toBe(75);
    expect(result!.tier).toBe("strong");
    expect(result!.reasons).toContain("doc_number_type");
  });

  it("returns score 60 / probable tier for same name + birthdate", () => {
    const input = makeInput({
      nationalId: null,
      phoneNormalized: null,
      phone: null,
      emailNormalized: null,
      email: null,
      birthDate: "1985-01-01",
    });
    const row = makeRow({
      national_id: null,
      phone_normalized: null,
      email_normalized: null,
      birth_date: "1985-01-01",
    });
    const result = scoreDedupCandidate(input, row);
    expect(result).not.toBeNull();
    expect(result!.score).toBe(60);
    expect(result!.tier).toBe("probable");
    expect(result!.reasons).toContain("name_birthdate");
  });

  it("returns score 45 / probable tier for same phone, different last name", () => {
    const input = makeInput({
      nationalId: null,
      emailNormalized: null,
      email: null,
      lastName: "Ionescu",
    });
    const row = makeRow({
      national_id: null,
      email_normalized: null,
      last_name: "Popescu",
    });
    const result = scoreDedupCandidate(input, row);
    expect(result).not.toBeNull();
    expect(result!.score).toBe(45);
    expect(result!.tier).toBe("probable");
    expect(result!.reasons).toContain("phone_different_name");
  });

  it("returns score 40 / probable tier for same lastname + city + birth year", () => {
    const input = makeInput({
      nationalId: null,
      phoneNormalized: null,
      phone: null,
      emailNormalized: null,
      email: null,
      firstName: "Maria",
      birthDate: "1985-06-15",
      city: "Cluj",
    });
    const row = makeRow({
      national_id: null,
      phone_normalized: null,
      email_normalized: null,
      first_name: "George",
      birth_date: "1985-11-20",
      city: "Cluj",
    });
    const result = scoreDedupCandidate(input, row);
    expect(result).not.toBeNull();
    expect(result!.score).toBe(40);
    expect(result!.tier).toBe("probable");
    expect(result!.reasons).toContain("lastname_city_birthyear");
  });

  it("returns null when no match criteria met", () => {
    const input = makeInput({
      nationalId: null,
      phoneNormalized: null,
      phone: null,
      emailNormalized: null,
      email: null,
      lastName: "Ionescu",
    });
    const row = makeRow({
      national_id: null,
      phone_normalized: null,
      email_normalized: null,
      last_name: "Popescu",
    });
    expect(scoreDedupCandidate(input, row)).toBeNull();
  });

  it("returns null when row.id matches excludeGuestId (self-exclusion)", () => {
    const input = makeInput({
      excludeGuestId: "row-1",
      nationalId: "1850101410014",
    });
    const row = makeRow({
      id: "row-1",
      national_id: "1850101410014",
    });
    expect(scoreDedupCandidate(input, row)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// scoreDedupCandidates
// ---------------------------------------------------------------------------
describe("scoreDedupCandidates", () => {
  it("returns sorted by score descending", () => {
    const input = makeInput({ nationalId: null });
    const rows = [
      makeRow({
        id: "a",
        display_name: "A",
        phone_normalized: null,
        email_normalized: null,
        first_name: "Ion",
        birth_date: "1985-01-01",
      }),
      makeRow({
        id: "b",
        display_name: "B",
        // same phone + last name → 85
      }),
    ];
    // Give input a birthDate so row "a" matches name_birthdate (60)
    const inputWithBirth = makeInput({
      nationalId: null,
      phoneNormalized: null,
      phone: null,
      emailNormalized: null,
      email: null,
      birthDate: "1985-01-01",
    });

    const inputForB = makeInput({ nationalId: null });
    // Test with inputForB where row "b" matches phone+lastname (85)
    // and we add another row with lower score
    const lowerRow = makeRow({
      id: "c",
      display_name: "C",
      phone_normalized: null,
      email_normalized: null,
      last_name: "Popescu",
      first_name: "Ion",
      birth_date: "1985-01-01",
    });

    const results = scoreDedupCandidates(
      makeInput({ nationalId: null, birthDate: "1985-01-01" }),
      [lowerRow, makeRow({ id: "b", display_name: "B" })],
    );

    expect(results.length).toBeGreaterThanOrEqual(1);
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
    }
  });

  it("filters below minScore", () => {
    const input = makeInput({
      nationalId: null,
      phoneNormalized: null,
      phone: null,
      emailNormalized: null,
      email: null,
      firstName: "Maria",
      birthDate: "1985-06-15",
      city: "Cluj",
    });
    const row = makeRow({
      national_id: null,
      phone_normalized: null,
      email_normalized: null,
      first_name: "George",
      birth_date: "1985-11-20",
      city: "Cluj",
    }); // score 40

    const results = scoreDedupCandidates(input, [row], 50);
    expect(results).toHaveLength(0);
  });

  it("returns empty array for empty rows", () => {
    expect(scoreDedupCandidates(makeInput(), [])).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// dedupAction
// ---------------------------------------------------------------------------
describe("dedupAction", () => {
  const base: DedupCandidate = {
    guestId: "g1",
    displayName: "Ion Popescu",
    phone: null,
    email: null,
    nationalId: null,
    nationalIdType: null,
    birthDate: null,
    city: null,
    score: 100,
    tier: "hard",
    reasons: ["national_id"],
  };

  it("returns 'auto_merge' for hard tier", () => {
    expect(dedupAction({ ...base, tier: "hard", score: 100 })).toBe("auto_merge");
  });

  it("returns 'suggest_merge' for strong tier with score >= 80", () => {
    expect(
      dedupAction({ ...base, tier: "strong", score: 85, reasons: ["phone_lastname"] })
    ).toBe("suggest_merge");
  });

  it("returns 'suggest_merge' for strong tier with score exactly 80", () => {
    expect(
      dedupAction({ ...base, tier: "strong", score: 80, reasons: ["email_lastname"] })
    ).toBe("suggest_merge");
  });

  it("returns 'warn' for strong tier with score < 80", () => {
    expect(
      dedupAction({ ...base, tier: "strong", score: 75, reasons: ["doc_number_type"] })
    ).toBe("warn");
  });

  it("returns 'warn' for probable tier", () => {
    expect(
      dedupAction({ ...base, tier: "probable", score: 60, reasons: ["name_birthdate"] })
    ).toBe("warn");
  });
});
