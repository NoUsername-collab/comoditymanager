/**
 * Validează variabilele de mediu înainte de build / deploy / setup-staff.
 *
 * Usage:
 *   node scripts/check-env.mjs
 *   node scripts/check-env.mjs --file=.env.staging.local --profile=staging
 *   node scripts/check-env.mjs --profile=production --setup
 *   node scripts/check-env.mjs --profile=production   (simulează Vercel prod)
 */
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { loadEnvFile } from "./lib/load-env.mjs";
import {
  ENV_MANIFEST,
  isPlaceholderEnvValue,
  isValidEmail,
  isValidJwtLikeKey,
  isValidSupabaseUrl,
  resolveProfile,
} from "./env-manifest.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function parseArgs(argv) {
  const out = {
    file: ".env.local",
    profile: null,
    setup: false,
    warnOnly: false,
    strict: false,
  };
  for (const arg of argv) {
    if (arg === "--setup") out.setup = true;
    if (arg === "--warn-only") out.warnOnly = true;
    if (arg === "--strict") out.strict = true;
    if (arg.startsWith("--file=")) out.file = arg.slice("--file=".length);
    if (arg.startsWith("--profile=")) out.profile = arg.slice("--profile=".length);
  }
  return out;
}

function fail(messages, warnOnly) {
  const title = warnOnly ? "Avertismente env" : "Eroare configurare env";
  console.error(`\n❌ ${title}:\n`);
  for (const m of messages) console.error(`  • ${m}`);
  console.error("");
  if (!warnOnly) {
    console.error("Vezi .env.example și docs/vercel-env.md\n");
    process.exit(1);
  }
}

function ok(msg) {
  console.log(`✓ ${msg}`);
}

const args = parseArgs(process.argv.slice(2));
const profile = resolveProfile(args.profile);
const onVercel = Boolean(process.env.VERCEL);

if (!onVercel) {
  const { path, loaded } = loadEnvFile(root, args.file);
  if (!loaded && profile === "local") {
    fail([
      `Lipsește ${path}`,
      "Copiază: cp .env.example .env.local și completează valorile",
    ]);
  } else if (loaded) {
    ok(`Env încărcat din ${path}`);
  }
} else {
  ok(`Vercel detectat (VERCEL_ENV=${process.env.VERCEL_ENV ?? "?"})`);
}

const errors = [];
const warnings = [];

function requireVar(key) {
  const val = process.env[key];
  if (isPlaceholderEnvValue(val)) {
    errors.push(`${key} lipsește sau e placeholder`);
    return undefined;
  }
  return val?.trim();
}

// --- Validări specifice ---
const url = requireVar("NEXT_PUBLIC_SUPABASE_URL");
if (url && !isValidSupabaseUrl(url)) {
  errors.push("NEXT_PUBLIC_SUPABASE_URL nu pare un URL Supabase valid (https://….supabase.co)");
}

const anon = requireVar("NEXT_PUBLIC_SUPABASE_ANON_KEY");
if (anon && !isValidJwtLikeKey(anon)) {
  errors.push("NEXT_PUBLIC_SUPABASE_ANON_KEY prea scurtă sau invalidă");
}

const service = requireVar("SUPABASE_SERVICE_ROLE_KEY");
if (service && !isValidJwtLikeKey(service)) {
  errors.push("SUPABASE_SERVICE_ROLE_KEY prea scurtă sau invalidă");
}

const adminEmail = requireVar("ADMIN_EMAIL");
const operatorEmail = requireVar("OPERATOR_EMAIL");

if (adminEmail && !isValidEmail(adminEmail)) {
  errors.push("ADMIN_EMAIL nu e un email valid");
}
if (operatorEmail && !isValidEmail(operatorEmail)) {
  errors.push("OPERATOR_EMAIL nu e un email valid");
}
if (
  adminEmail &&
  operatorEmail &&
  adminEmail.toLowerCase() === operatorEmail.toLowerCase()
) {
  errors.push("ADMIN_EMAIL și OPERATOR_EMAIL trebuie să fie conturi diferite");
}

if (args.setup) {
  if (isPlaceholderEnvValue(process.env.ADMIN_INITIAL_PASSWORD)) {
    errors.push("ADMIN_INITIAL_PASSWORD necesar pentru npm run setup-staff");
  }
  if (isPlaceholderEnvValue(process.env.OPERATOR_INITIAL_PASSWORD)) {
    errors.push("OPERATOR_INITIAL_PASSWORD necesar pentru npm run setup-staff");
  }
}

for (const def of ENV_MANIFEST) {
  const val = process.env[def.key];

  if (profile === "production" && def.forbiddenInProduction) {
    if (def.key === "ADMIN_FACTORY_RESET_ENABLED" && val === "true") {
      errors.push(
        `${def.key}=true este interzis pe producție (reset șterge datele clienților)`
      );
    }
    if (
      (def.key === "ADMIN_INITIAL_PASSWORD" ||
        def.key === "OPERATOR_INITIAL_PASSWORD") &&
      !isPlaceholderEnvValue(val)
    ) {
      errors.push(
        `${def.key} nu trebuie setat pe Vercel producție — folosește doar local la setup-staff`
      );
    }
  }

  if (
    profile === "production" &&
    def.recommendedInProduction &&
    isPlaceholderEnvValue(val)
  ) {
    warnings.push(
      `${def.key} lipsește pe producție — recomandat pentru securitate cookie unlock (npm run env:secret)`
    );
  }
}

const unlockSecret = process.env.ADMIN_LOCATION_UNLOCK_SECRET?.trim();
if (unlockSecret && unlockSecret.length < 32) {
  errors.push("ADMIN_LOCATION_UNLOCK_SECRET trebuie să aibă minim 32 caractere");
}

if (errors.length) fail(errors, false);

if (warnings.length) {
  console.warn("\n⚠ Avertismente env:\n");
  for (const w of warnings) console.warn(`  • ${w}`);
  console.warn("");
  if (args.strict) {
    console.error("Rulează fără --strict pentru deploy cu avertismente.\n");
    process.exit(1);
  }
}

console.log("");
ok(`Profil: ${profile}`);
ok(`Supabase: ${url?.replace(/https:\/\//, "").split(".")[0]}…`);
ok(`Staff: Admin → ${adminEmail}, Operator → ${operatorEmail}`);
if (profile === "production") {
  ok("Verificare producție OK — safe pentru Vercel deploy");
} else if (profile === "staging") {
  ok("Verificare staging OK");
} else {
  ok("Verificare locală OK");
}
console.log("");
