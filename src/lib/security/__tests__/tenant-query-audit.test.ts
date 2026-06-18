import path from "node:path";
import { describe, it, expect } from "vitest";
import { auditServiceTenantQueries } from "@/lib/security/audit-tenant-queries";

const servicesRoot = path.resolve(process.cwd(), "src/services");

describe("tenant query audit (services)", () => {
  it("flags no obvious missing tenant_id patterns in src/services", () => {
    const violations = auditServiceTenantQueries(servicesRoot);

    if (violations.length > 0) {
      const report = violations
        .slice(0, 20)
        .map((v) => `  ${v.file}:${v.line} → .from("${v.table}")`)
        .join("\n");
      const suffix =
        violations.length > 20
          ? `\n  … and ${violations.length - 20} more`
          : "";
      expect.fail(
        `Found ${violations.length} service query(ies) without a nearby tenant guard:\n${report}${suffix}\n` +
          "Add .eq('tenant_id', …), withTenantId(), or allowlist in audit-tenant-queries.ts if intentional."
      );
    }

    expect(violations).toEqual([]);
  });
});
