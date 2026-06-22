/**
 * Creeaza contul platform admin in Supabase Auth.
 *
 * In .env.local:
 *   HOSPIRA_ADMIN_EMAILS=contact@hospira.ro
 *   ADMIN_INITIAL_PASSWORD=parola-ta    (sterge dupa!)
 *
 * Ruleaza: npm run setup-platform-admin
 * Apoi sterge ADMIN_INITIAL_PASSWORD din .env.local.
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
  console.error(`Lipseste ${envPath}`);
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const emails =
  process.env.HOSPIRA_ADMIN_EMAILS?.trim() ||
  process.env.NESTIO_ADMIN_EMAILS?.trim();
const password = process.env.ADMIN_INITIAL_PASSWORD;

if (!url || !serviceKey) {
  console.error(
    `Lipseste NEXT_PUBLIC_SUPABASE_URL sau SUPABASE_SERVICE_ROLE_KEY in ${envFile}`
  );
  process.exit(1);
}
if (!emails) {
  console.error(
    `Adauga HOSPIRA_ADMIN_EMAILS in ${envFile} (ex: contact@hospira.ro)`
  );
  process.exit(1);
}
if (!password) {
  console.error(
    `Adauga ADMIN_INITIAL_PASSWORD in ${envFile}, apoi ruleaza din nou.\n` +
      `STERGE parola din .env.local dupa ce contul e creat!`
  );
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const adminEmails = emails.split(",").map((e) => e.trim().toLowerCase());

for (const email of adminEmails) {
  const { data: list } = await supabase.auth.admin.listUsers({ perPage: 500 });
  const existing = list?.users?.find(
    (u) => u.email?.toLowerCase() === email
  );

  if (existing) {
    const { error } = await supabase.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
      app_metadata: {
        ...existing.app_metadata,
        platform_role: "platform_admin",
      },
    });
    if (error) {
      console.error(`Eroare la actualizare ${email}:`, error.message);
      continue;
    }
    console.log(`Cont actualizat: ${email} (platform_admin)`);
  } else {
    const { error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: { platform_role: "platform_admin" },
    });
    if (error) {
      console.error(`Eroare la creare ${email}:`, error.message);
      continue;
    }
    console.log(`Cont creat: ${email} (platform_admin)`);
  }
}

console.log(
  "\nGata! STERGE ADMIN_INITIAL_PASSWORD din .env.local acum."
);
