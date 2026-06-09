import type { PostgrestError } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import {
  formatDbError,
  HospiraAdminDbError,
  isHospiraAdminDbError,
  throwIfDbError,
} from "../format-db-error";

function mockPostgrestError(
  partial: Pick<PostgrestError, "message" | "code" | "details" | "hint">
): PostgrestError {
  return {
    name: "PostgrestError",
    ...partial,
    toJSON: () => ({ name: "PostgrestError", ...partial }),
  };
}

describe("formatDbError", () => {
  it("includes message, code, details and hint", () => {
    const formatted = formatDbError("dev_logs", {
      message: "relation does not exist",
      code: "42P01",
      details: "table missing",
      hint: "run migration 026",
    });

    expect(formatted).toContain("[dev_logs]");
    expect(formatted).toContain("relation does not exist");
    expect(formatted).toContain("code=42P01");
    expect(formatted).toContain("details=table missing");
    expect(formatted).toContain("hint=run migration 026");
  });

  it("detects HospiraAdminDbError by name after RSC serialization", () => {
    const serialized = new Error("[tenants] timeout");
    serialized.name = "HospiraAdminDbError";
    expect(isHospiraAdminDbError(serialized)).toBe(true);
    expect(isHospiraAdminDbError(new Error("other"))).toBe(false);
  });

  it("throws HospiraAdminDbError with structured fields", () => {
    const dbError = mockPostgrestError({
      message: "column tenant_id does not exist",
      code: "42703",
      details: "",
      hint: "",
    });

    expect(() => throwIfDbError("admin_activity_log", dbError)).toThrow(
      HospiraAdminDbError
    );

    try {
      throwIfDbError("admin_activity_log", dbError);
    } catch (err) {
      expect(err).toBeInstanceOf(HospiraAdminDbError);
      const dbErr = err as HospiraAdminDbError;
      expect(dbErr.context).toBe("admin_activity_log");
      expect(dbErr.code).toBe("42703");
      expect(dbErr.message).toContain("column tenant_id does not exist");
    }
  });
});
