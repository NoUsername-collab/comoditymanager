import fs from "node:fs";
import path from "node:path";

export type TenantQueryViolation = {
  file: string;
  table: string;
  line: number;
};

/** Cross-tenant platform services — intentional, not tenant-scoped. */
const ALLOWLIST_FILES = new Set([
  "platform-admin.ts",
  "platform-debug.ts",
  "tenants.ts",
  "tenant-members.ts",
  "tenant-domains.ts",
  "onboarding.ts",
  "nestio-logs-page-data.ts",
  "database-reset.ts",
]);

/** Tables queried without tenant_id by design (platform / lookup). */
const ALLOWLIST_TABLES = new Set([
  "tenants",
  "tenant_members",
  "tenant_domains",
  "platform_settings",
  "dev_logs",
]);

const FROM_PATTERN = /\.from\s*\(\s*["']([a-z_][a-z0-9_]*)["']\s*\)/g;

const TENANT_GUARD_PATTERNS = [
  /\.eq\s*\(\s*["']tenant_id["']/,
  /withTenantId\s*\(/,
  /requireTenantIdForData\s*\(/,
  /getTenantScope\s*\(/,
  /assertStaffTenantAccess\s*\(/,
  /tenant_row_visible/,
  /resolveTenantIdFromHost\s*\(/,
  /getGuestAppPublicDb\s*\(/,
  /tenant_id\s*:/,
];

function listServiceFiles(root: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "__tests__") continue;
      out.push(...listServiceFiles(full));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".ts") && !entry.name.endsWith(".test.ts")) {
      out.push(full);
    }
  }
  return out;
}

function hasTenantGuard(context: string): boolean {
  return TENANT_GUARD_PATTERNS.some((pattern) => pattern.test(context));
}

function relativeServicePath(filePath: string, servicesRoot: string): string {
  return path.relative(servicesRoot, filePath).replace(/\\/g, "/");
}

/**
 * Pragmatic static scan: flag `.from("table")` in services without a nearby
 * tenant guard. Not exhaustive — catches obvious IDOR footguns in CI.
 */
export function auditServiceTenantQueries(servicesRoot: string): TenantQueryViolation[] {
  const violations: TenantQueryViolation[] = [];
  const contextRadius = 25;

  for (const filePath of listServiceFiles(servicesRoot)) {
    const rel = relativeServicePath(filePath, servicesRoot);
    const baseName = path.basename(filePath);
    if (ALLOWLIST_FILES.has(baseName)) continue;

    const content = fs.readFileSync(filePath, "utf8");
    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      FROM_PATTERN.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = FROM_PATTERN.exec(line)) !== null) {
        const table = match[1]!;
        if (ALLOWLIST_TABLES.has(table)) continue;

        const start = Math.max(0, i - contextRadius);
        const end = Math.min(lines.length, i + contextRadius + 1);
        const context = lines.slice(start, end).join("\n");

        if (!hasTenantGuard(context)) {
          violations.push({ file: rel, table, line: i + 1 });
        }
      }
    }
  }

  return violations;
}
