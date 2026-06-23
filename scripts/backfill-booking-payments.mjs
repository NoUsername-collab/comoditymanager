/**
 * Backfill booking_payments from checkins.payment_amount_paid (one row per check-in).
 *
 *   node scripts/backfill-booking-payments.mjs
 *   node scripts/backfill-booking-payments.mjs --dry-run
 */
import { createClient } from "@supabase/supabase-js";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { loadEnvFile } from "./lib/load-env.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const dryRun = process.argv.includes("--dry-run");

const { loaded } = loadEnvFile(root, ".env.local");
if (!loaded) {
  console.error("Nu am gasit .env.local");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Lipsesc NEXT_PUBLIC_SUPABASE_URL sau SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: checkins, error } = await supabase
  .from("checkins")
  .select("id, tenant_id, booking_id, payment_amount_paid, payment_status, created_at")
  .gt("payment_amount_paid", 0);

if (error) {
  console.error("Eroare checkins:", error.message);
  process.exit(1);
}

let inserted = 0;
let skipped = 0;

for (const row of checkins ?? []) {
  const amount = Number(row.payment_amount_paid ?? 0);
  if (amount <= 0) {
    skipped++;
    continue;
  }

  const idempotencyKey = `backfill:checkin:${row.id}`;
  const { data: existing } = await supabase
    .from("booking_payments")
    .select("id")
    .eq("tenant_id", row.tenant_id)
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  if (existing) {
    skipped++;
    continue;
  }

  const payload = {
    tenant_id: row.tenant_id,
    booking_id: row.booking_id,
    amount,
    kind: "payment",
    method: "cash",
    paid_at: row.created_at ?? new Date().toISOString(),
    idempotency_key: idempotencyKey,
    legacy_checkin_id: row.id,
    notes: "Backfill from checkin payment_amount_paid",
  };

  if (dryRun) {
    console.log("[dry-run] would insert", payload);
    inserted++;
    continue;
  }

  const { error: insErr } = await supabase.from("booking_payments").insert(payload);
  if (insErr) {
    console.error("Insert fail", row.booking_id, insErr.message);
    continue;
  }
  inserted++;
}

console.log(`Done. inserted=${inserted} skipped=${skipped} dryRun=${dryRun}`);