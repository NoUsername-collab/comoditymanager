/**
 * Split mobile-admin.css into:
 * - mobile-admin.css (core: HUD + admin home + misc that isn't settings/platform-admin)
 * - mobile-settings.css (admin settings UI)
 * - mobile-platform-admin.css (nestio-admin / platform-admin UI)
 *
 * Run:
 *   node scripts/split-mobile-admin-settings-platform.mjs
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve("src/styles/features/layout");
const srcPath = path.join(ROOT, "mobile-admin.css");
const backupPath = path.join(ROOT, "mobile-admin.css.bak2");

if (!fs.existsSync(backupPath)) {
  fs.copyFileSync(srcPath, backupPath);
}

const src = fs.readFileSync(backupPath, "utf8");
const blocks = (() => {
  const out = [];
  let current = [];
  let depth = 0;
  let inRule = false;
  const lines = src.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const open = (line.match(/\{/g) ?? []).length;
    const close = (line.match(/\}/g) ?? []).length;
    const trimmed = line.trim();

    if (trimmed && !trimmed.startsWith("/*") && current.length === 0) {
      // start of a new meaningful block; startLine not needed for this split
    }

    current.push(line);
    if (open > 0) inRule = true;
    depth += open - close;

    if (inRule && depth === 0) {
      out.push(current.join("\n").trimEnd());
      current = [];
      inRule = false;
    }
  }

  if (current.some((l) => l.trim())) out.push(current.join("\n").trimEnd());
  return out.filter(Boolean);
})();

const HEADER =
  blocks[0]?.startsWith("/* mobile-admin")
    ? blocks.shift()
    : "/* mobile-admin.css — admin HUD + core admin pages (settings/platform-admin split) */";

const SETTINGS_RE = new RegExp(
  [
    "admin-settings-page",
    "settings-shell",
    "settings-save-bar",
    "settings-shell-loading",
    "settings-shell__",
    "settings-route",
    "settings-page",
    "settings-shell-loading",
    "settings-shell-loading",
  ].join("|"),
  "i",
);

const PLATFORM_ADMIN_RE = new RegExp(
  [
    "ml-shell--nestio-admin",
    "nestio-admin-",
    "platform-tenant-",
    "platform-log",
    "platform-health",
    "ml-mobile-menu--platform",
    "platform-admin",
  ].join("|"),
  "i",
);

function classify(block) {
  if (PLATFORM_ADMIN_RE.test(block) && !SETTINGS_RE.test(block)) return "platform";
  if (SETTINGS_RE.test(block) && !PLATFORM_ADMIN_RE.test(block)) return "settings";
  if (PLATFORM_ADMIN_RE.test(block)) return "platform";
  if (SETTINGS_RE.test(block)) return "settings";
  return "core";
}

const buckets = {
  core: [HEADER, ""],
  settings: ["/* mobile-settings.css — admin settings UI (split from mobile-admin.css) */", ""],
  platform: ["/* mobile-platform-admin.css — platform admin UI (split from mobile-admin.css) */", ""],
};

for (const block of blocks) {
  const bucket = classify(block);
  if (bucket === "core") buckets.core.push(block, "");
  if (bucket === "settings") buckets.settings.push(block, "");
  if (bucket === "platform") buckets.platform.push(block, "");
}

function write(name, parts) {
  const out = `${parts.join("\n").trim()}\n`.replace(/^\uFEFF/, "");
  fs.writeFileSync(path.join(ROOT, name), out, "utf8");
  return out.split("\n").length;
}

const coreLines = write("mobile-admin.css", buckets.core);
const settingsLines = write("mobile-settings.css", buckets.settings);
const platformLines = write("mobile-platform-admin.css", buckets.platform);

fs.writeFileSync(
  path.join(ROOT, "mobile-admin.css.aggregate-info.txt"),
  `mobile-admin.css: ${coreLines}\nmobile-settings.css: ${settingsLines}\nmobile-platform-admin.css: ${platformLines}\n`,
  "utf8",
);

console.log({ coreLines, settingsLines, platformLines, blocks: blocks.length });

