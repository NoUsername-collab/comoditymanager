import { describe, it, expect } from "vitest";
import { mapGuestRow } from "@/domain/guest/map-row";

describe("mapGuestRow", () => {
  it("maps all fields correctly from a complete row", () => {
    const row: Record<string, unknown> = {
      id: "abc-123",
      last_name: "Popescu",
      first_name: "Ion",
      display_name: "Ion Popescu",
      phone: "+40740123456",
      phone_normalized: "+40740123456",
      email: "ion@example.com",
      email_normalized: "ion@example.com",
      notes: "Regular guest",
      tags: ["vip", "recurrent"],
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-06-01T00:00:00Z",
      identity_status: "complete",
      doc_type: "ci",
      doc_series: "AB",
      doc_number: "123456",
      doc_issued_by: "SPCLEP Sector 1",
      doc_issue_date: "2020-01-15",
      doc_expiry_date: "2030-01-15",
      national_id_type: "cnp",
      national_id: "1850101410014",
      cnp: "1850101410014",
      birth_date: "1985-01-01",
      birth_place: "Bucuresti",
      nationality: "RO",
      address: "Str. Exemplu 1",
      city: "Bucuresti",
      county: "B",
      country: "RO",
      sex: "M",
    };

    const result = mapGuestRow(row);

    expect(result.id).toBe("abc-123");
    expect(result.last_name).toBe("Popescu");
    expect(result.first_name).toBe("Ion");
    expect(result.display_name).toBe("Ion Popescu");
    expect(result.phone).toBe("+40740123456");
    expect(result.phone_normalized).toBe("+40740123456");
    expect(result.email).toBe("ion@example.com");
    expect(result.email_normalized).toBe("ion@example.com");
    expect(result.notes).toBe("Regular guest");
    expect(result.tags).toEqual(["vip", "recurrent"]);
    expect(result.created_at).toBe("2024-01-01T00:00:00Z");
    expect(result.updated_at).toBe("2024-06-01T00:00:00Z");
    expect(result.identity_status).toBe("complete");
    expect(result.doc_type).toBe("ci");
    expect(result.doc_series).toBe("AB");
    expect(result.doc_number).toBe("123456");
    expect(result.doc_issued_by).toBe("SPCLEP Sector 1");
    expect(result.doc_issue_date).toBe("2020-01-15");
    expect(result.doc_expiry_date).toBe("2030-01-15");
    expect(result.national_id_type).toBe("cnp");
    expect(result.national_id).toBe("1850101410014");
    expect(result.cnp).toBe("1850101410014");
    expect(result.birth_date).toBe("1985-01-01");
    expect(result.birth_place).toBe("Bucuresti");
    expect(result.nationality).toBe("RO");
    expect(result.address).toBe("Str. Exemplu 1");
    expect(result.city).toBe("Bucuresti");
    expect(result.county).toBe("B");
    expect(result.country).toBe("RO");
    expect(result.sex).toBe("M");
  });

  it("handles null/undefined/empty optional fields", () => {
    const row: Record<string, unknown> = {
      id: "abc-456",
      last_name: "Test",
      first_name: "User",
      display_name: "Test User",
      phone: null,
      phone_normalized: null,
      email: null,
      email_normalized: null,
      notes: "",
      tags: [],
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
      identity_status: "draft",
      doc_type: null,
      doc_series: null,
      doc_number: null,
      doc_issued_by: null,
      doc_issue_date: null,
      doc_expiry_date: null,
      national_id_type: null,
      national_id: null,
      cnp: null,
      birth_date: null,
      birth_place: null,
      nationality: null,
      address: null,
      city: null,
      county: null,
      country: null,
      sex: null,
    };

    const result = mapGuestRow(row);

    expect(result.phone).toBeNull();
    expect(result.phone_normalized).toBeNull();
    expect(result.email).toBeNull();
    expect(result.email_normalized).toBeNull();
    expect(result.notes).toBeNull(); // empty string → null via optStr
    expect(result.doc_type).toBeNull();
    expect(result.national_id).toBeNull();
    expect(result.cnp).toBeNull();
    expect(result.birth_date).toBeNull();
    expect(result.sex).toBeNull();
  });

  it("parses tags correctly from raw data", () => {
    const row: Record<string, unknown> = {
      id: "t1",
      last_name: "A",
      first_name: "B",
      display_name: "B A",
      phone: null,
      phone_normalized: null,
      email: null,
      email_normalized: null,
      notes: null,
      tags: ["vip", "invalid_tag", "recurrent"],
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
      identity_status: "draft",
      doc_type: null,
      doc_series: null,
      doc_number: null,
      doc_issued_by: null,
      doc_issue_date: null,
      doc_expiry_date: null,
      national_id_type: null,
      national_id: null,
      cnp: null,
      birth_date: null,
      birth_place: null,
      nationality: null,
      address: null,
      city: null,
      county: null,
      country: null,
      sex: null,
    };

    const result = mapGuestRow(row);
    expect(result.tags).toEqual(["vip", "recurrent"]);
  });

  it("sets profile to null (loaded separately)", () => {
    const row: Record<string, unknown> = {
      id: "p1",
      last_name: "X",
      first_name: "Y",
      display_name: "Y X",
      phone: null,
      phone_normalized: null,
      email: null,
      email_normalized: null,
      notes: null,
      tags: [],
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
      identity_status: "draft",
      doc_type: null,
      doc_series: null,
      doc_number: null,
      doc_issued_by: null,
      doc_issue_date: null,
      doc_expiry_date: null,
      national_id_type: null,
      national_id: null,
      cnp: null,
      birth_date: null,
      birth_place: null,
      nationality: null,
      address: null,
      city: null,
      county: null,
      country: null,
      sex: null,
    };

    const result = mapGuestRow(row);
    expect(result.profile).toBeNull();
  });

  it("defaults identity_status to 'draft' when missing", () => {
    const row: Record<string, unknown> = {
      id: "d1",
      last_name: "A",
      first_name: "B",
      display_name: "B A",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
      tags: [],
    };

    const result = mapGuestRow(row);
    expect(result.identity_status).toBe("draft");
  });
});
