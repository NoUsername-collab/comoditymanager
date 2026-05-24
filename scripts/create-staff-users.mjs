/**
 * Creează conturile staff (Admin + Operator) în Supabase.
 *
 * În .env.local:
 *   ADMIN_EMAIL=admin@casaemil.ro
 *   OPERATOR_EMAIL=operator@casaemil.ro
 *   ADMIN_INITIAL_PASSWORD=...
 *   OPERATOR_INITIAL_PASSWORD=...
 *
 * Rulează: npm run env:check:setup && npm run setup-staff
 */
import { spawnSync } from "child_process";
import { createClient } from "@supabase/supabase-js";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { loadEnvFile } from "./lib/load-env.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const envFile = process.argv[2] ?? ".env.local";

const check = spawnSync(
  process.execPath,
  ["scripts/check-env.mjs", "--setup", `--file=${envFile}`],
  { cwd: root, stdio: "inherit" }
);
if (check.status !== 0) process.exit(check.status ?? 1);

const { path: envPath, loaded } = loadEnvFile(root, envFile);
if (!loaded) {
  console.error(`Lipsește ${envPath}`);
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    `Lipsește NEXT_PUBLIC_SUPABASE_URL sau SUPABASE_SERVICE_ROLE_KEY în ${envFile}`
  );
  process.exit(1);
}

const accounts = [
  {
    email: process.env.ADMIN_EMAIL ?? "admin@casaemil.ro",
    password: process.env.ADMIN_INITIAL_PASSWORD,
    login: "Admin",
  },
  {
    email: process.env.OPERATOR_EMAIL ?? "operator@casaemil.ro",
    password: process.env.OPERATOR_INITIAL_PASSWORD,
    login: "Operator",
  },
];

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: list } = await supabase.auth.admin.listUsers({ perPage: 200 });
const users = list?.users ?? [];

for (const account of accounts) {
  if (!account.password) {
    console.error(
      `Lipsește parola pentru ${account.login} — setează ADMIN_INITIAL_PASSWORD / OPERATOR_INITIAL_PASSWORD`
    );
    process.exit(1);
  }

  const existing = users.find(
    (u) => u.email?.toLowerCase() === account.email.toLowerCase()
  );

  if (existing) {
    const { error } = await supabase.auth.admin.updateUserById(existing.id, {
      password: account.password,
      email_confirm: true,
      app_metadata: { role: account.login === "Admin" ? "admin" : "operator" },
    });
    if (error) {
      console.error(`Nu am putut actualiza ${account.login}:`, error.message);
      process.exit(1);
    }
    console.log(`Cont actualizat: ${account.email} (login: ${account.login})`);
  } else {
    const { error } = await supabase.auth.admin.createUser({
      email: account.email,
      password: account.password,
      email_confirm: true,
      app_metadata: { role: account.login === "Admin" ? "admin" : "operator" },
    });
    if (error) {
      console.error(`Eroare la creare ${account.login}:`, error.message);
      process.exit(1);
    }
    console.log(`Cont creat: ${account.email} (login: ${account.login})`);
  }
}

console.log(
  "Gata. Poți șterge *_INITIAL_PASSWORD din env după setup. Nu comite parolele în git."
);
