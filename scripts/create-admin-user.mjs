/**
 * Creează contul admin în Supabase (o singură dată).
 *
 * În .env.local:
 *   ADMIN_EMAIL=admin@casaemil.ro
 *   ADMIN_INITIAL_PASSWORD=...   (parola aleasă)
 *
 * Rulează: npm run setup-admin
 */
import { createClient } from "@supabase/supabase-js";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { loadEnvFile } from "./lib/load-env.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const envFile = process.argv[2] ?? ".env.local";

const { path: envPath, loaded } = loadEnvFile(root, envFile);
if (!loaded) {
  console.error(`Lipsește ${envPath}`);
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.ADMIN_EMAIL ?? "admin@casaemil.ro";
const password = process.env.ADMIN_INITIAL_PASSWORD;

if (!url || !serviceKey) {
  console.error(
    `Lipsește NEXT_PUBLIC_SUPABASE_URL sau SUPABASE_SERVICE_ROLE_KEY în ${envFile}`
  );
  process.exit(1);
}
if (!password) {
  console.error(
    `Adaugă ADMIN_INITIAL_PASSWORD în ${envFile}, apoi rulează din nou setup-admin`
  );
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: list } = await supabase.auth.admin.listUsers({ perPage: 200 });
const existing = list?.users?.find(
  (u) => u.email?.toLowerCase() === email.toLowerCase()
);

if (existing) {
  const { error } = await supabase.auth.admin.updateUserById(existing.id, {
    password,
    email_confirm: true,
  });
  if (error) {
    console.error("Nu am putut actualiza parola:", error.message);
    process.exit(1);
  }
  console.log(`Cont existent actualizat: ${email} (utilizator login: Admin)`);
} else {
  const { error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) {
    console.error("Eroare la creare:", error.message);
    process.exit(1);
  }
  console.log(`Cont creat: ${email} (utilizator login: Admin)`);
}

console.log("Gata. Poți șterge ADMIN_INITIAL_PASSWORD din .env.local dacă vrei.");
