/**
 * One-off platform audit for Nestio admin logs report.
 * Usage: node scripts/audit-platform-logs.mjs [--file=.env.staging.local]
 */
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const envFile =
  process.argv.find((a) => a.startsWith("--file="))?.slice("--file=".length) ??
  ".env.local";

function loadEnv(file) {
  const path = resolve(root, file);
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    let val = t.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[t.slice(0, i).trim()] = val;
  }
  return out;
}

const env = loadEnv(envFile);
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;

console.log(JSON.stringify({ phase: "env", file: envFile, urlHost: url ? new URL(url).hostname : null, hasKey: !!key, devTenant: env.DEV_TENANT_SLUG ?? null }, null, 2));

if (!url || !key) {
  console.log(JSON.stringify({ phase: "skip", reason: "missing supabase creds" }));
  process.exit(0);
}

const sb = createClient(url, key, { auth: { persistSession: false } });

const { data: tenants, error: te } = await sb
  .from("tenants")
  .select("id, slug, display_name, status")
  .order("created_at", { ascending: false })
  .limit(25);

if (te) {
  console.log(JSON.stringify({ phase: "tenants_error", message: te.message }));
  process.exit(1);
}

const health = [];
for (const t of tenants ?? []) {
  const [settings, b, r, m] = await Promise.all([
    sb.from("pension_settings").select("id").eq("tenant_id", t.id).maybeSingle(),
    sb.from("buildings").select("id", { count: "exact", head: true }).eq("tenant_id", t.id),
    sb.from("rooms").select("id", { count: "exact", head: true }).eq("tenant_id", t.id),
    sb
      .from("tenant_members")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", t.id)
      .eq("is_active", true),
  ]);
  const issues = [];
  if (!settings.data) issues.push("Lipsesc pension_settings");
  if ((b.count ?? 0) === 0) issues.push("Zero clădiri");
  if ((r.count ?? 0) === 0) issues.push("Zero camere");
  if ((m.count ?? 0) === 0) issues.push("Zero membri activi");
  if (t.status === "suspended") issues.push("Cont suspendat");
  if (t.status === "cancelled") issues.push("Cont anulat");
  health.push({
    slug: t.slug,
    displayName: t.display_name,
    status: t.status,
    buildingCount: b.count ?? 0,
    roomCount: r.count ?? 0,
    memberCount: m.count ?? 0,
    healthy: issues.length === 0,
    issues,
  });
}

const { data: devLogs, error: de } = await sb
  .from("dev_logs")
  .select("id, tenant_id, level, source, message, created_at, user_email")
  .order("created_at", { ascending: false })
  .limit(20);

const { data: activity, error: ae } = await sb
  .from("admin_activity_log")
  .select("id, tenant_id, action, summary, created_at, actor_email")
  .order("created_at", { ascending: false })
  .limit(15);

const tenantMap = new Map((tenants ?? []).map((t) => [t.id, t.slug]));

console.log(
  JSON.stringify(
    {
      phase: "report",
      tenantCount: tenants?.length ?? 0,
      unhealthyCount: health.filter((h) => !h.healthy).length,
      health,
      devLogsError: de?.message ?? null,
      devLogs: (devLogs ?? []).map((l) => ({
        when: l.created_at,
        tenant: tenantMap.get(l.tenant_id) ?? l.tenant_id,
        level: l.level,
        source: l.source,
        message: l.message?.slice(0, 120),
        user: l.user_email,
      })),
      activityError: ae?.message ?? null,
      activity: (activity ?? []).map((l) => ({
        when: l.created_at,
        tenant: tenantMap.get(l.tenant_id) ?? l.tenant_id,
        action: l.action,
        summary: l.summary?.slice(0, 80),
        actor: l.actor_email,
      })),
    },
    null,
    2
  )
);
