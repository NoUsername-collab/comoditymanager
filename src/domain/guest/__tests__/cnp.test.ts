import { describe, it, expect } from "vitest";
import { parseCnp, isValidCnp, formatCnpDisplay } from "@/domain/guest/cnp";

// A valid male CNP: 1 (male, 1900s) + 850101 (Jan 1, 1985) + 41 (county) + 001 (seq) + check
// We need a CNP that actually passes the check-digit algorithm.
// CNP weights: [2,7,9,1,4,6,3,5,8,2,7,9], sum mod 11, if 10 → 1
// Let's use a well-known test CNP: 1850101410017
// sum = 1*2 + 8*7 + 5*9 + 0*1 + 1*4 + 0*6 + 1*3 + 4*5 + 1*8 + 0*2 + 0*7 + 1*9
//     = 2   + 56  + 45  + 0   + 4   + 0   + 3   + 20  + 8   + 0   + 0   + 9   = 147
// 147 % 11 = 4 → check digit should be 4
// So valid CNP: 1850101410014

const VALID_MALE_CNP = "1850101410014";
// Female CNP: 2 (female, 1900s) + 900315 (Mar 15, 1990) + 12 (county) + 345 + check
// sum = 2*2 + 9*7 + 0*9 + 0*1 + 3*4 + 1*6 + 5*3 + 1*5 + 2*8 + 3*2 + 4*7 + 5*9
//     = 4   + 63  + 0   + 0   + 12  + 6   + 15  + 5   + 16  + 6   + 28  + 45  = 200
// 200 % 11 = 2 → check digit = 2
const VALID_FEMALE_CNP = "2900315123452";

describe("parseCnp", () => {
  it("parses a valid male CNP", () => {
    const result = parseCnp(VALID_MALE_CNP);
    expect(result).not.toBeNull();
    expect(result!.sex).toBe("M");
    expect(result!.birthDate).toBe("1985-01-01");
    expect(result!.countyCode).toBe("41");
  });

  it("parses a valid female CNP", () => {
    const result = parseCnp(VALID_FEMALE_CNP);
    expect(result).not.toBeNull();
    expect(result!.sex).toBe("F");
    expect(result!.birthDate).toBe("1990-03-15");
    expect(result!.countyCode).toBe("12");
  });

  it("returns null for invalid CNP (wrong length)", () => {
    expect(parseCnp("12345")).toBeNull();
  });

  it("returns null for invalid CNP (bad check digit)", () => {
    expect(parseCnp("1850101410019")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(parseCnp("")).toBeNull();
  });
});

describe("isValidCnp", () => {
  it("returns true for a valid CNP", () => {
    expect(isValidCnp(VALID_MALE_CNP)).toBe(true);
  });

  it("returns false for an invalid CNP", () => {
    expect(isValidCnp("0000000000000")).toBe(false);
  });

  it("returns false for wrong length", () => {
    expect(isValidCnp("123")).toBe(false);
  });
});

describe("formatCnpDisplay", () => {
  it("formats a 13-digit CNP with space after 6th digit", () => {
    expect(formatCnpDisplay("1234567890123")).toBe("123456 7890123");
  });

  it("returns short string as-is", () => {
    expect(formatCnpDisplay("12345")).toBe("12345");
  });

  it("returns longer string as-is if not 13 digits", () => {
    expect(formatCnpDisplay("12345678901234")).toBe("12345678901234");
  });

  it("handles CNP with spaces by cleaning then formatting", () => {
    expect(formatCnpDisplay("1234567 890123")).toBe("123456 7890123");
  });
});
