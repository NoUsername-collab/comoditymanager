/**
 * Sync Supabase + platform URLs from .env.staging.local → .env.local
 * Keeps other .env.local keys intact. Single source of truth for local dev.
 *
 * Usage: npm run env:use-staging
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const stagingPath = resolve(root, ".env.staging.local");
const localPath = resolve(root, ".env.local");

const SYNC_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_PLATFORM_DOMAIN",
  "NEXT_PUBLIC_SITE_URL",
];

function parseEnv(text) {
  const map = new Map();
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    map.set(t.slice(0, i).trim(), t.slice(i + 1).trim());
  }
  return map;
}

function serializeEnv(lines, updates) {
  const seen = new Set();
  const out = [];

  for (const line of lines) {
    const t = line.trim();
    if (!t || t.startsWith("#")) {
      out.push(line);
      continue;
    }
    const i = t.indexOf("=");
    if (i < 0) {
      out.push(line);
      continue;
    }
    const key = t.slice(0, i).trim();
    if (updates.has(key)) {
      out.push(`${key}=${updates.get(key)}`);
      seen.add(key);
    } else {
      out.push(line);
    }
  }

  for (const key of SYNC_KEYS) {
    if (!seen.has(key) && updates.has(key)) {
      out.push(`${key}=${updates.get(key)}`);
    }
  }

  return out.join("\n").replace(/\n?$/, "\n");
}

if (!existsSync(stagingPath)) {
  console.error("Lipsește .env.staging.local — copiază din .env.staging.example");
  process.exit(1);
}

const staging = parseEnv(readFileSync(stagingPath, "utf8"));
const missing = SYNC_KEYS.filter((k) => !staging.get(k));
if (missing.length) {
  console.error("În .env.staging.local lipsesc:", missing.join(", "));
  process.exit(1);
}

const updates = new Map(SYNC_KEYS.map((k) => [k, staging.get(k)]));

let localLines = [];
if (existsSync(localPath)) {
  localLines = readFileSync(localPath, "utf8").split("\n");
} else {
  localLines = ["# synced from staging", ""];
}

writeFileSync(localPath, serializeEnv(localLines, updates), "utf8");

console.log("✓ .env.local actualizat din .env.staging.local");
for (const key of SYNC_KEYS) {
  const val = updates.get(key) ?? "";
  const preview = key.includes("KEY") ? `${val.slice(0, 8)}…` : val;
  console.log(`  ${key}=${preview}`);
}
