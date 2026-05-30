import { describe, it, expect } from "vitest";
import {
  validateNationalId,
  isValidNationalId,
  cleanNationalId,
  guessNationalIdType,
  nationalIdTypeForCountry,
  NATIONAL_ID_LENGTH,
  NATIONAL_ID_COUNTRY,
} from "@/domain/guest/national-id";

// ─── CNP (Romania) ──────────────────────────────────────────────────────────

describe("CNP validation", () => {
  // Valid CNP: 1 85 07 24 01 001 4
  // S=1(Male,1900s), YY=85, MM=07, DD=24, county=01, seq=001, check=4
  // Checksum: 2*1+7*8+9*5+1*0+4*7+6*2+3*4+5*0+8*1+2*0+7*0+9*1 = 2+56+45+0+28+12+12+0+8+0+0+9 = 172
  // 172 mod 11 = 7 (172/11=15*11=165, 172-165=7) → check digit should be 7

  it("validates a well-formed CNP with correct check digit", () => {
    // Use a known valid CNP: 1800101221142
    // Let's compute: S=1(M,1900), YY=80, MM=01, DD=01, county=22, seq=114, check=?
    // weights: 2,7,9,1,4,6,3,5,8,2,7,9
    // digits:  1,8,0,0,1,0,1,2,2,1,1,4,?
    // sum = 2*1+7*8+9*0+1*0+4*1+6*0+3*1+5*2+8*2+2*1+7*1+9*4
    //     = 2+56+0+0+4+0+3+10+16+2+7+36 = 136
    // 136 mod 11 = 136 - 12*11 = 136-132 = 4 → check digit = 4
    const result = validateNationalId("cnp", "1800101221144");
    expect(result.valid).toBe(true);
    expect(result.data).not.toBeNull();
    expect(result.data!.sex).toBe("M");
    expect(result.data!.birthDate).toBe("1980-01-01");
  });

  it("rejects CNP with wrong check digit", () => {
    const result = validateNationalId("cnp", "1800101221140");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("checkDigit");
  });

  it("rejects CNP with wrong length", () => {
    const result = validateNationalId("cnp", "123456789");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("format");
  });

  it("rejects CNP with non-digit characters", () => {
    const result = validateNationalId("cnp", "180010122114a");
    expect(result.valid).toBe(false);
  });

  it("extracts female sex for S=2", () => {
    // S=2(F,1900s), YY=90, MM=05, DD=15, county=01, seq=001, check=?
    // digits: 2,9,0,0,5,1,5,0,1,0,0,1,?
    // sum = 2*2+7*9+9*0+1*0+4*5+6*1+3*5+5*0+8*1+2*0+7*0+9*1
    //     = 4+63+0+0+20+6+15+0+8+0+0+9 = 125
    // 125 mod 11 = 125-11*11=125-121=4 → check digit = 4
    const result = validateNationalId("cnp", "2900515010014");
    expect(result.valid).toBe(true);
    expect(result.data!.sex).toBe("F");
    expect(result.data!.birthDate).toBe("1990-05-15");
  });
});

// ─── EGN (Bulgaria) ──────────────────────────────────────────────────────────

describe("EGN validation", () => {
  it("rejects EGN with wrong length", () => {
    const result = validateNationalId("egn", "12345");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("format");
  });

  it("rejects EGN with non-digit characters", () => {
    const result = validateNationalId("egn", "123456789a");
    expect(result.valid).toBe(false);
  });
});

// ─── AMKA (Greece) ───────────────────────────────────────────────────────────

describe("AMKA validation", () => {
  it("rejects AMKA with wrong length", () => {
    const result = validateNationalId("amka", "12345");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("format");
  });
});

// ─── Személyi szám (Hungary) ────────────────────────────────────────────────

describe("Személyi szám validation", () => {
  it("rejects with wrong length", () => {
    const result = validateNationalId("szemelyi_szam", "12345");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("format");
  });

  it("strips spaces and dashes before validation", () => {
    // Even an invalid number should get past format check if it has 11 digits after cleaning
    const result = validateNationalId("szemelyi_szam", "1 234-567-8901");
    // Should not fail on format — will fail on checkDigit or something else
    expect(result.error).not.toBe("format");
  });
});

// ─── Unified API ─────────────────────────────────────────────────────────────

describe("cleanNationalId", () => {
  it("removes spaces and dashes", () => {
    expect(cleanNationalId("123 456-789")).toBe("123456789");
  });

  it("returns unchanged string with no whitespace/dashes", () => {
    expect(cleanNationalId("123456789")).toBe("123456789");
  });
});

describe("isValidNationalId", () => {
  it("returns boolean true for valid CNP", () => {
    expect(isValidNationalId("cnp", "1800101221144")).toBe(true);
  });

  it("returns boolean false for invalid CNP", () => {
    expect(isValidNationalId("cnp", "0000000000000")).toBe(false);
  });
});

describe("nationalIdTypeForCountry", () => {
  it("returns cnp for RO", () => {
    expect(nationalIdTypeForCountry("RO")).toBe("cnp");
  });

  it("returns idnp for MD", () => {
    expect(nationalIdTypeForCountry("MD")).toBe("idnp");
  });

  it("returns egn for BG", () => {
    expect(nationalIdTypeForCountry("BG")).toBe("egn");
  });

  it("returns amka for GR", () => {
    expect(nationalIdTypeForCountry("GR")).toBe("amka");
  });

  it("returns szemelyi_szam for HU", () => {
    expect(nationalIdTypeForCountry("HU")).toBe("szemelyi_szam");
  });

  it("returns null for unsupported country", () => {
    expect(nationalIdTypeForCountry("US")).toBeNull();
  });

  it("is case-insensitive", () => {
    expect(nationalIdTypeForCountry("ro")).toBe("cnp");
  });
});

describe("NATIONAL_ID_LENGTH", () => {
  it("has correct lengths for all types", () => {
    expect(NATIONAL_ID_LENGTH.cnp).toBe(13);
    expect(NATIONAL_ID_LENGTH.idnp).toBe(13);
    expect(NATIONAL_ID_LENGTH.egn).toBe(10);
    expect(NATIONAL_ID_LENGTH.amka).toBe(11);
    expect(NATIONAL_ID_LENGTH.szemelyi_szam).toBe(11);
  });
});

describe("NATIONAL_ID_COUNTRY", () => {
  it("maps types to correct country codes", () => {
    expect(NATIONAL_ID_COUNTRY.cnp).toBe("RO");
    expect(NATIONAL_ID_COUNTRY.idnp).toBe("MD");
    expect(NATIONAL_ID_COUNTRY.egn).toBe("BG");
    expect(NATIONAL_ID_COUNTRY.amka).toBe("GR");
    expect(NATIONAL_ID_COUNTRY.szemelyi_szam).toBe("HU");
  });
});

describe("guessNationalIdType", () => {
  it("returns null for non-digit strings", () => {
    expect(guessNationalIdType("abc")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(guessNationalIdType("")).toBeNull();
  });

  it("returns cnp for a valid 13-digit Romanian CNP", () => {
    expect(guessNationalIdType("1800101221144")).toBe("cnp");
  });
});
