import { describe, expect, it } from "vitest";
import { isMissingSchemaError } from "@/lib/hospira-admin/migration-audit";

describe("migration-audit helpers", () => {
  it("detects missing table/column errors", () => {
    expect(isMissingSchemaError('relation "checkins" does not exist')).toBe(true);
    expect(isMissingSchemaError("Could not find the table public.foo")).toBe(true);
    expect(isMissingSchemaError("schema cache")).toBe(true);
  });

  it("ignores unrelated errors", () => {
    expect(isMissingSchemaError("permission denied")).toBe(false);
    expect(isMissingSchemaError("timeout")).toBe(false);
  });
});
