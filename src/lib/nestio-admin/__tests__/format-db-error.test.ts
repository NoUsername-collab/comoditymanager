import type { PostgrestError } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import {
  formatDbError,
  NestioAdminDbError,
  isNestioAdminDbError,
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

  it("detects NestioAdminDbError by name after RSC serialization", () => {
    const serialized = new Error("[tenants] timeout");
    serialized.name = "NestioAdminDbError";
    expect(isNestioAdminDbError(serialized)).toBe(true);
    expect(isNestioAdminDbError(new Error("other"))).toBe(false);
  });

  it("throws NestioAdminDbError with structured fields", () => {
    const dbError = mockPostgrestError({
      message: "column tenant_id does not exist",
      code: "42703",
      details: "",
      hint: "",
    });

    expect(() => throwIfDbError("admin_activity_log", dbError)).toThrow(
      NestioAdminDbError
    );

    try {
      throwIfDbError("admin_activity_log", dbError);
    } catch (err) {
      expect(err).toBeInstanceOf(NestioAdminDbError);
      const dbErr = err as NestioAdminDbError;
      expect(dbErr.context).toBe("admin_activity_log");
      expect(dbErr.code).toBe("42703");
      expect(dbErr.message).toContain("column tenant_id does not exist");
    }
  });
});
