/**
 * Rulează o migrare SQL pe Supabase.
 *
 * Utilizare: node scripts/run-migration.mjs supabase/migrations/020_dev_logs.sql
 *
 * Citește .env.local pentru SUPABASE_URL + SERVICE_ROLE_KEY.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { loadEnvFile } from "./lib/load-env.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const { loaded } = loadEnvFile(root, ".env.local");
if (!loaded) {
  console.error("Nu am găsit .env.local");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Lipsesc NEXT_PUBLIC_SUPABASE_URL sau SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const sqlFile = process.argv[2];
if (!sqlFile) {
  console.error("Utilizare: node scripts/run-migration.mjs <cale-fisier.sql>");
  process.exit(1);
}

const sqlPath = resolve(root, sqlFile);
const sql = readFileSync(sqlPath, "utf-8");

console.log(`Running migration: ${sqlFile}`);
console.log(`SQL length: ${sql.length} chars`);

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { error } = await supabase.rpc("exec_sql", { query: sql }).catch((e) => ({
  error: e,
}));

if (error) {
  // Fallback: split by semicolons and run each statement
  console.log("rpc exec_sql not available, running statements individually...");
  const statements = sql
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith("--"));

  let ok = 0;
  let fail = 0;

  for (const stmt of statements) {
    const { error: stmtError } = await supabase.rpc("exec_sql", {
      query: stmt + ";",
    }).catch(() => ({ error: "rpc not available" }));

    if (stmtError) {
      // Try raw SQL via REST
      const res = await fetch(`${url}/rest/v1/rpc/exec_sql`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: key,
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({ query: stmt + ";" }),
      });

      if (!res.ok) {
        console.error(`  FAIL: ${stmt.slice(0, 80)}...`);
        console.error(`        ${await res.text()}`);
        fail++;
      } else {
        ok++;
      }
    } else {
      ok++;
    }
  }
  console.log(`Done: ${ok} OK, ${fail} failed`);
} else {
  console.log("Migration completed successfully!");
}
