/**
 * Audit codebase (vitest, tsc, eslint, build) and insert summary into dev_logs.
 *
 * Usage:
 *   node scripts/audit-to-dev-logs.mjs
 *   node scripts/audit-to-dev-logs.mjs --skip-build
 */
import { createClient } from "@supabase/supabase-js";
import { execSync } from "child_process";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { loadEnvFile } from "./lib/load-env.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const skipBuild = process.argv.includes("--skip-build");

function loadEnv() {
  const staging = loadEnvFile(root, ".env.staging.local");
  const local = loadEnvFile(root, ".env.local");
  return {
    stagingPath: staging.path,
    stagingLoaded: staging.loaded,
    localPath: local.path,
    localLoaded: local.loaded,
  };
}

function run(cmd, opts = {}) {
  const started = Date.now();
  try {
    const out = execSync(cmd, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 20 * 1024 * 1024,
      ...opts,
    });
    return {
      ok: true,
      exitCode: 0,
      stdout: out ?? "",
      stderr: "",
      durationMs: Date.now() - started,
    };
  } catch (e) {
    return {
      ok: false,
      exitCode: e.status ?? 1,
      stdout: e.stdout ?? "",
      stderr: e.stderr ?? "",
      durationMs: Date.now() - started,
    };
  }
}

function parseVitest(stdout) {
  const files = stdout.match(/Test Files\s+(\d+) passed(?: \((\d+)\))?/);
  const tests = stdout.match(/Tests\s+(\d+) passed(?: \((\d+)\))?/);
  const failedFiles = stdout.match(/Test Files\s+.*?(\d+) failed/);
  const failedTests = stdout.match(/Tests\s+.*?(\d+) failed/);
  return {
    filesPassed: Number(files?.[1] ?? 0),
    testsPassed: Number(tests?.[1] ?? 0),
    filesFailed: Number(failedFiles?.[1] ?? 0),
    testsFailed: Number(failedTests?.[1] ?? 0),
  };
}

function parseEslint(combined) {
  const m = combined.match(
    /(\d+) problems \((\d+) errors?, (\d+) warnings?\)/
  );
  if (!m) return { problems: 0, errors: 0, warnings: 0 };
  return {
    problems: Number(m[1]),
    errors: Number(m[2]),
    warnings: Number(m[3]),
  };
}

function countBuildWarnings(combined) {
  const matches = combined.match(/Turbopack build encountered (\d+) warnings/g);
  if (!matches) return 0;
  return matches.reduce((sum, line) => {
    const n = line.match(/(\d+)/);
    return sum + Number(n?.[1] ?? 0);
  }, 0);
}

async function resolveTenantId(supabase) {
  const devSlug = process.env.DEV_TENANT_SLUG?.trim();
  if (devSlug) {
    const { data } = await supabase
      .from("tenants")
      .select("id, slug, display_name, status")
      .eq("slug", devSlug)
      .maybeSingle();
    if (data?.id) return data;
  }

  const { data: tenants } = await supabase
    .from("tenants")
    .select("id, slug, display_name, status")
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1);

  return tenants?.[0] ?? null;
}

async function runTenantHealthChecks(supabase) {
  const { data: tenants } = await supabase
    .from("tenants")
    .select("id, slug, display_name, status")
    .order("created_at", { ascending: false });

  if (!tenants?.length) return [];

  const checks = [];
  for (const t of tenants) {
    const issues = [];
    const safeCount = async (table) => {
      const { count } = await supabase
        .from(table)
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", t.id);
      return count ?? 0;
    };

    const { data: settings } = await supabase
      .from("pension_settings")
      .select("id")
      .eq("tenant_id", t.id)
      .maybeSingle();

    const buildings = await safeCount("buildings");
    const rooms = await safeCount("rooms");
    const { count: members } = await supabase
      .from("tenant_members")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", t.id)
      .eq("is_active", true);

    if (!settings) issues.push("Lipsesc pension_settings");
    if (buildings === 0) issues.push("Zero clădiri");
    if (rooms === 0) issues.push("Zero camere");
    if ((members ?? 0) === 0) issues.push("Zero membri activi");
    if (t.status === "suspended") issues.push("Cont suspendat");
    if (t.status === "cancelled") issues.push("Cont anulat");

    checks.push({
      tenantId: t.id,
      slug: t.slug,
      displayName: t.display_name,
      status: t.status,
      buildingCount: buildings,
      roomCount: rooms,
      memberCount: members ?? 0,
      healthy: issues.length === 0,
      issues,
    });
  }
  return checks;
}

async function insertDevLog(supabase, tenantId, entry) {
  const { data, error } = await supabase
    .from("dev_logs")
    .insert({
      tenant_id: tenantId,
      level: entry.level,
      source: "codebase-audit",
      message: entry.message.slice(0, 2000),
      context: entry.context ?? {},
    })
    .select("id")
    .single();

  return { id: data?.id ?? null, error: error?.message ?? null };
}

async function main() {
  const envInfo = loadEnv();
  console.log("Env:");
  console.log(
    `  staging: ${envInfo.stagingLoaded ? envInfo.stagingPath : "—"}`
  );
  console.log(`  local:   ${envInfo.localLoaded ? envInfo.localPath : "—"}`);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const hasServiceKey = Boolean(serviceKey?.trim());

  console.log(`  SUPABASE_SERVICE_ROLE_KEY: ${hasServiceKey ? "present" : "MISSING"}`);

  if (!url || !hasServiceKey) {
    console.error("Lipsește NEXT_PUBLIC_SUPABASE_URL sau SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { count: tenantCount } = await supabase
    .from("tenants")
    .select("id", { count: "exact", head: true });

  console.log(`  Tenants în DB: ${tenantCount ?? 0}`);

  console.log("\nRulare audit local...");
  const vitestRun = run("npm test");
  const tscRun = run("npx tsc --noEmit");
  const eslintRun = run("npm run lint");
  const buildRun = skipBuild
    ? { ok: null, exitCode: null, stdout: "", stderr: "", durationMs: 0, skipped: true }
    : run("npm run build");

  const vitest = parseVitest(vitestRun.stdout + vitestRun.stderr);
  const eslint = parseEslint(eslintRun.stdout + eslintRun.stderr);
  const buildWarnings = buildRun.skipped
    ? null
    : countBuildWarnings(buildRun.stdout + buildRun.stderr);

  const audit = {
    at: new Date().toISOString(),
    vitest: {
      ok: vitestRun.ok,
      ...vitest,
      durationMs: vitestRun.durationMs,
    },
    tsc: { ok: tscRun.ok, durationMs: tscRun.durationMs },
    eslint: { ok: eslintRun.ok, ...eslint, durationMs: eslintRun.durationMs },
    build: buildRun.skipped
      ? { skipped: true }
      : {
          ok: buildRun.ok,
          warnings: buildWarnings,
          durationMs: buildRun.durationMs,
        },
  };

  console.log("\nRezultate:");
  console.log(
    `  vitest: ${audit.vitest.ok ? "OK" : "FAIL"} — ${audit.vitest.testsPassed} teste, ${audit.vitest.filesPassed} fișiere`
  );
  console.log(`  tsc:    ${audit.tsc.ok ? "OK" : "FAIL"}`);
  console.log(
    `  eslint: ${audit.eslint.ok ? "OK" : "FAIL"} — ${audit.eslint.errors} erori, ${audit.eslint.warnings} avertismente`
  );
  if (audit.build.skipped) {
    console.log("  build:  skipped");
  } else {
    console.log(
      `  build:  ${audit.build.ok ? "OK" : "FAIL"} — ${audit.build.warnings ?? 0} warnings Turbopack`
    );
  }

  const tenant = await resolveTenantId(supabase);
  if (!tenant) {
    console.error("Nu s-a găsit tenant activ pentru dev_logs");
    process.exit(1);
  }
  console.log(`\nTenant audit: ${tenant.display_name} (${tenant.slug})`);

  const healthChecks = await runTenantHealthChecks(supabase);
  const unhealthy = healthChecks.filter((h) => !h.healthy);

  const { data: recentDevLogs } = await supabase
    .from("dev_logs")
    .select("id, level, source, message, created_at, tenant_id")
    .order("created_at", { ascending: false })
    .limit(10);

  const failures = [];
  if (!audit.vitest.ok) failures.push("vitest");
  if (!audit.tsc.ok) failures.push("tsc");
  if (!audit.eslint.ok) failures.push("eslint");
  if (audit.build.skipped !== true && !audit.build.ok) failures.push("build");

  const inserts = [];

  if (failures.length > 0) {
    inserts.push({
      level: "error",
      message: `Audit eșuat: ${failures.join(", ")} — vitest ${audit.vitest.testsPassed}/${audit.vitest.testsPassed + audit.vitest.testsFailed}, eslint ${audit.eslint.errors}E/${audit.eslint.warnings}W`,
      context: { audit, failures, unhealthyCount: unhealthy.length },
    });
  }

  if (audit.eslint.errors > 0) {
    inserts.push({
      level: "error",
      message: `ESLint: ${audit.eslint.errors} erori, ${audit.eslint.warnings} avertismente (${audit.eslint.problems} total)`,
      context: { eslint: audit.eslint },
    });
  } else if (audit.eslint.warnings > 0) {
    inserts.push({
      level: "warn",
      message: `ESLint: ${audit.eslint.warnings} avertismente (0 erori)`,
      context: { eslint: audit.eslint },
    });
  }

  if (!audit.build.skipped && buildWarnings > 0) {
    inserts.push({
      level: "warn",
      message: `Build Turbopack: ${buildWarnings} warnings (Edge Runtime / NFT trace)`,
      context: { buildWarnings },
    });
  }

  if (unhealthy.length > 0) {
    for (const h of unhealthy) {
      inserts.push({
        level: "warn",
        message: `Tenant ${h.slug}: ${h.issues.join(" · ")}`,
        context: {
          tenantId: h.tenantId,
          slug: h.slug,
          buildingCount: h.buildingCount,
          roomCount: h.roomCount,
          memberCount: h.memberCount,
        },
      });
    }
  }

  if (inserts.length === 0) {
    inserts.push({
      level: "info",
      message: `Audit OK — vitest ${audit.vitest.testsPassed} teste, tsc OK, eslint ${audit.eslint.warnings}W, build OK`,
      context: { audit },
    });
  }

  // Filter to warn/error only per spec (skip info if all green)
  const toInsert = inserts.filter((e) => e.level === "warn" || e.level === "error");

  if (toInsert.length === 0 && inserts.some((e) => e.level === "info")) {
    toInsert.push({
      level: "warn",
      message: inserts.find((e) => e.level === "info").message,
      context: inserts.find((e) => e.level === "info").context,
    });
  }

  console.log("\nInserare dev_logs (source=codebase-audit)...");
  const inserted = [];
  for (const entry of toInsert) {
    const result = await insertDevLog(supabase, tenant.id, entry);
    inserted.push({ ...entry, ...result });
    if (result.error) {
      console.error(`  ✗ ${entry.level}: ${result.error}`);
    } else {
      console.log(`  ✓ ${entry.level} → ${result.id}`);
    }
  }

  const summary = {
    envInfo,
    tenantCount: tenantCount ?? 0,
    tenant,
    audit,
    healthChecks,
    recentDevLogs: recentDevLogs ?? [],
    inserted,
  };

  console.log("\n--- JSON summary ---");
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
