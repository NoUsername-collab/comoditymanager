/**
 * Șterge toate rezervările din proiectul STAGING (booking_rooms cascade).
 *
 *   cp .env.staging.example .env.staging.local
 *   npm run reset-staging-bookings
 */
import { createClient } from "@supabase/supabase-js";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { loadEnvFile } from "./lib/load-env.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const confirm = process.argv.includes("--yes");
const envFile =
  process.argv.find((a) => a.endsWith(".env") || a.includes(".env.")) ??
  ".env.staging.local";

const { path, loaded } = loadEnvFile(root, envFile);
if (!loaded) {
  console.error(`Lipsește ${path} — copiază din .env.staging.example`);
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Lipsește NEXT_PUBLIC_SUPABASE_URL sau SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { count, error: countErr } = await supabase
  .from("bookings")
  .select("*", { count: "exact", head: true });

if (countErr) {
  console.error("Eroare:", countErr.message);
  process.exit(1);
}

if (!count) {
  console.log("Nu există rezervări de șters.");
  process.exit(0);
}

if (!confirm) {
  console.log(
    `STAGING: ${count} rezervări. Rulează cu --yes pentru ștergere: npm run reset-staging-bookings -- --yes`
  );
  process.exit(0);
}

const { error } = await supabase
  .from("bookings")
  .delete()
  .neq("id", "00000000-0000-0000-0000-000000000000");

if (error) {
  console.error("Ștergere eșuată:", error.message);
  process.exit(1);
}

console.log(`Șters ${count} rezervări. Camerele și clădirile rămân.`);
