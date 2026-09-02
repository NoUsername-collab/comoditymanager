import { describe, it, expect } from "vitest";
import {
  normalizeEmail,
  isPlaceholderEmail,
  staffBookingEmail,
  normalizePhone,
  isValidGuestPhone,
  assertValidGuestPhone,
  hasGuestIdentity,
  PLACEHOLDER_GUEST_EMAIL,
} from "@/domain/guest/normalize";

// ---------------------------------------------------------------------------
// normalizeEmail
// ---------------------------------------------------------------------------
describe("normalizeEmail", () => {
  it("lowercases and trims a normal email", () => {
    expect(normalizeEmail("  Alice@Example.COM  ")).toBe("alice@example.com");
  });

  it("returns null for null", () => {
    expect(normalizeEmail(null)).toBeNull();
  });

  it("returns null for undefined", () => {
    expect(normalizeEmail(undefined)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(normalizeEmail("")).toBeNull();
  });

  it("returns null for whitespace-only string", () => {
    expect(normalizeEmail("   ")).toBeNull();
  });

  it("trims leading and trailing spaces", () => {
    expect(normalizeEmail("  user@host.com  ")).toBe("user@host.com");
  });
});

// ---------------------------------------------------------------------------
// isPlaceholderEmail
// ---------------------------------------------------------------------------
describe("isPlaceholderEmail", () => {
  it("returns true for the canonical placeholder", () => {
    expect(isPlaceholderEmail("reception@no-email.local")).toBe(true);
  });

  it("uses the placeholder when staff omit email", () => {
    expect(staffBookingEmail("")).toBe(PLACEHOLDER_GUEST_EMAIL);
    expect(staffBookingEmail("  Ana@Host.RO ")).toBe("ana@host.ro");
  });

  it("returns true for the canonical placeholder with different casing", () => {
    expect(isPlaceholderEmail("RECEPTION@NO-EMAIL.LOCAL")).toBe(true);
  });

  it("returns true for legacy placeholder receptie@casaemil.local", () => {
    expect(isPlaceholderEmail("receptie@casaemil.local")).toBe(true);
  });

  it("returns true for legacy placeholder reception@casaemil.local", () => {
    expect(isPlaceholderEmail("reception@casaemil.local")).toBe(true);
  });

  it("returns false for a real email", () => {
    expect(isPlaceholderEmail("real@email.com")).toBe(false);
  });

  it("returns false for null", () => {
    expect(isPlaceholderEmail(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isPlaceholderEmail(undefined)).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isPlaceholderEmail("")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// normalizePhone
// ---------------------------------------------------------------------------
describe("normalizePhone", () => {
  it("normalizes 07xx format to +407xx", () => {
    expect(normalizePhone("0740123456")).toBe("+40740123456");
  });

  it("normalizes +40 with spaces", () => {
    expect(normalizePhone("+40 740 123 456")).toBe("+40740123456");
  });

  it("normalizes 00-prefixed international format", () => {
    expect(normalizePhone("0040740123456")).toBe("+40740123456");
  });

  it("normalizes 740... (starts with 7, 9 digits) to +40...", () => {
    expect(normalizePhone("740123456")).toBe("+40740123456");
  });

  it("normalizes 40xxxxxxxxx (starts with 40, 11+ digits)", () => {
    expect(normalizePhone("40740123456")).toBe("+40740123456");
  });

  it("returns null for empty string", () => {
    expect(normalizePhone("")).toBeNull();
  });

  it("returns null for null", () => {
    expect(normalizePhone(null)).toBeNull();
  });

  it("returns null for undefined", () => {
    expect(normalizePhone(undefined)).toBeNull();
  });

  it("strips dashes and parentheses", () => {
    expect(normalizePhone("+40-(740)-123-456")).toBe("+40740123456");
  });

  it("handles whitespace-only input", () => {
    expect(normalizePhone("   ")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// isValidGuestPhone
// ---------------------------------------------------------------------------
describe("isValidGuestPhone", () => {
  it("returns true for a valid Romanian phone", () => {
    expect(isValidGuestPhone("0740123456")).toBe(true);
  });

  it("returns true for a valid international phone", () => {
    expect(isValidGuestPhone("+40740123456")).toBe(true);
  });

  it("returns false for empty string", () => {
    expect(isValidGuestPhone("")).toBe(false);
  });

  it("returns false for null", () => {
    expect(isValidGuestPhone(null)).toBe(false);
  });

  it("returns false for dash placeholder", () => {
    expect(isValidGuestPhone("—")).toBe(false);
  });

  it("returns false for n/a placeholder", () => {
    expect(isValidGuestPhone("n/a")).toBe(false);
  });

  it("returns false for 'null' string", () => {
    expect(isValidGuestPhone("null")).toBe(false);
  });

  it("returns false for dot placeholder", () => {
    expect(isValidGuestPhone(".")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// assertValidGuestPhone
// ---------------------------------------------------------------------------
describe("assertValidGuestPhone", () => {
  it("does not throw for a valid phone", () => {
    expect(() => assertValidGuestPhone("0740123456")).not.toThrow();
  });

  it("throws 'guest.phone_required' for empty", () => {
    expect(() => assertValidGuestPhone("")).toThrow("guest.phone_required");
  });

  it("throws for null", () => {
    expect(() => assertValidGuestPhone(null)).toThrow("guest.phone_required");
  });
});

// ---------------------------------------------------------------------------
// hasGuestIdentity
// ---------------------------------------------------------------------------
describe("hasGuestIdentity", () => {
  it("returns true when phone is valid", () => {
    expect(
      hasGuestIdentity({
        guest_email: PLACEHOLDER_GUEST_EMAIL,
        guest_phone: "0740123456",
      })
    ).toBe(true);
  });

  it("returns true when email is real even without phone", () => {
    expect(
      hasGuestIdentity({
        guest_email: "real@email.com",
        guest_phone: "",
      })
    ).toBe(true);
  });

  it("returns true when placeholder email but valid phone", () => {
    expect(
      hasGuestIdentity({
        guest_email: PLACEHOLDER_GUEST_EMAIL,
        guest_phone: "+40740123456",
      })
    ).toBe(true);
  });

  it("returns false when placeholder email and no phone", () => {
    expect(
      hasGuestIdentity({
        guest_email: PLACEHOLDER_GUEST_EMAIL,
        guest_phone: "",
      })
    ).toBe(false);
  });

  it("returns false when both empty", () => {
    expect(
      hasGuestIdentity({
        guest_email: "",
        guest_phone: "",
      })
    ).toBe(false);
  });
});
