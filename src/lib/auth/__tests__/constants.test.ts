import { describe, it, expect } from "vitest";
import {
  normalizeLoginUsername,
  isKnownStaffUsername,
  resolveStaffEmail,
  resolveLoginIdentifier,
  isValidLoginIdentifier,
  getAdminEmail,
  getOperatorEmail,
} from "@/lib/auth/constants";

// ---------------------------------------------------------------------------
// normalizeLoginUsername
// ---------------------------------------------------------------------------
describe("normalizeLoginUsername", () => {
  it("trims leading whitespace", () => {
    expect(normalizeLoginUsername("  Admin")).toBe("Admin");
  });

  it("trims trailing whitespace", () => {
    expect(normalizeLoginUsername("Admin  ")).toBe("Admin");
  });

  it("trims both sides", () => {
    expect(normalizeLoginUsername("  Operator  ")).toBe("Operator");
  });

  it("does not change case", () => {
    expect(normalizeLoginUsername("Admin")).toBe("Admin");
  });
});

// ---------------------------------------------------------------------------
// isKnownStaffUsername
// ---------------------------------------------------------------------------
describe("isKnownStaffUsername", () => {
  it("returns true for 'Admin'", () => {
    expect(isKnownStaffUsername("Admin")).toBe(true);
  });

  it("returns true for 'admin' (case-insensitive)", () => {
    expect(isKnownStaffUsername("admin")).toBe(true);
  });

  it("returns true for 'Operator'", () => {
    expect(isKnownStaffUsername("Operator")).toBe(true);
  });

  it("returns true for 'operator' (case-insensitive)", () => {
    expect(isKnownStaffUsername("operator")).toBe(true);
  });

  it("returns true for 'ADMIN' (all caps)", () => {
    expect(isKnownStaffUsername("ADMIN")).toBe(true);
  });

  it("returns false for 'random'", () => {
    expect(isKnownStaffUsername("random")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isKnownStaffUsername("")).toBe(false);
  });

  it("handles whitespace via normalization", () => {
    expect(isKnownStaffUsername("  Admin  ")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// resolveStaffEmail
// ---------------------------------------------------------------------------
describe("resolveStaffEmail", () => {
  it("returns admin email for 'Admin'", () => {
    const result = resolveStaffEmail("Admin");
    expect(result).toBe(getAdminEmail());
  });

  it("returns operator email for 'Operator'", () => {
    const result = resolveStaffEmail("Operator");
    expect(result).toBe(getOperatorEmail());
  });

  it("returns operator email case-insensitively", () => {
    expect(resolveStaffEmail("operator")).toBe(getOperatorEmail());
  });

  it("returns null for unknown username", () => {
    expect(resolveStaffEmail("other")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(resolveStaffEmail("")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// resolveLoginIdentifier
// ---------------------------------------------------------------------------
describe("resolveLoginIdentifier", () => {
  it("returns lowercased email when input contains @", () => {
    expect(resolveLoginIdentifier("User@Example.COM")).toBe("user@example.com");
  });

  it("returns staff email for known username", () => {
    expect(resolveLoginIdentifier("Admin")).toBe(getAdminEmail());
  });

  it("returns staff email for operator", () => {
    expect(resolveLoginIdentifier("Operator")).toBe(getOperatorEmail());
  });

  it("returns null for unknown non-email input", () => {
    expect(resolveLoginIdentifier("randomuser")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// isValidLoginIdentifier
// ---------------------------------------------------------------------------
describe("isValidLoginIdentifier", () => {
  it("returns true for a valid email", () => {
    expect(isValidLoginIdentifier("user@example.com")).toBe(true);
  });

  it("returns true for 'Admin' (staff username)", () => {
    expect(isValidLoginIdentifier("Admin")).toBe(true);
  });

  it("returns true for 'operator'", () => {
    expect(isValidLoginIdentifier("operator")).toBe(true);
  });

  it("returns false for an invalid email (no TLD)", () => {
    expect(isValidLoginIdentifier("user@")).toBe(false);
  });

  it("returns false for a random non-email string", () => {
    expect(isValidLoginIdentifier("randomword")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isValidLoginIdentifier("")).toBe(false);
  });
});
