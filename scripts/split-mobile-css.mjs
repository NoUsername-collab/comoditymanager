/**
 * Split mobile.css into core (global) + admin + public bundles.
 * Run: node scripts/split-mobile-css.mjs
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve("src/styles/features/layout");
const srcPath = path.join(ROOT, "mobile.css");
const backupPath = path.join(ROOT, "mobile.css.bak");

if (!fs.existsSync(backupPath)) {
  fs.copyFileSync(srcPath, backupPath);
}

const src = fs.readFileSync(backupPath, "utf8");
const lines = src.split(/\r?\n/);

const ADMIN_RE =
  /\b(admin-|gantt-|cerere-|stay-card|bd-|checkin-|devlog-|guest-page|guest-profile|guest-search|guest-hero|guest-grid|guest-notes|guest-rebook|mrz-scan|nestio-admin|availability-|avail-|receptie|cazari|activity-journal|sim-strip|onboarding-bar|admin-home|admin-page|admin-settings|admin-floating|admin-overlay|admin-gear|admin-hud|admin-nav|admin-today|fiscal-|invoice-line|cerere-item|stay-info|ml-shell--nestio-admin|platform-tenant-detail|platform-tenant-table|platform-log|platform-health|platform-tenant-card|devlog-entry)\b/i;

const PUBLIC_RE =
  /\b(public-|platform-header|platform-footer|platform-shell|landing-|signup-|pricing-table|guest-booking|public-hero|public-section|public-cta|public-page|public-confirm|public-step|public-option|public-staff|public-back|platform-tenant-row|pub-mobile-booking)\b|guest-app/i;

function lineBucket(lineNum) {
  if (lineNum >= 5133) return "core";
  if (lineNum >= 11 && lineNum <= 26) return "core";
  if (lineNum >= 288 && lineNum <= 408) return "public";
  if (lineNum >= 426 && lineNum <= 1145) return "admin";
  if (lineNum >= 28 && lineNum <= 287) return "admin";
  if (lineNum >= 410 && lineNum <= 425) return "admin";
  return null;
}

function classifyBlock(text, startLine) {
  const hasAdmin = ADMIN_RE.test(text);
  const hasPublic = PUBLIC_RE.test(text);

  if (hasPublic && !hasAdmin) return "public";
  if (hasAdmin) return "admin";

  const fixed = lineBucket(startLine);
  if (fixed) return fixed;

  if (/Global mobile perf|layout-debug/.test(text)) return "core";
  return "admin";
}

function splitBlocks(content, lineOffset = 1) {
  const blocks = [];
  let current = [];
  let depth = 0;
  let inRule = false;
  let startLine = lineOffset;
  const contentLines = content.split(/\r?\n/);

  for (let i = 0; i < contentLines.length; i++) {
    const line = contentLines[i];
    const lineNum = lineOffset + i;
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("/*") && !current.some((l) => {
      const t = l.trim();
      return t && !t.startsWith("/*");
    })) {
      startLine = lineNum;
    }

    const open = (line.match(/\{/g) ?? []).length;
    const close = (line.match(/\}/g) ?? []).length;
    current.push(line);
    if (open > 0) inRule = true;
    depth += open - close;

    if (inRule && depth === 0) {
      blocks.push({ text: current.join("\n").trimEnd(), startLine });
      current = [];
      inRule = false;
    }
  }
  if (current.some((l) => l.trim())) {
    blocks.push({ text: current.join("\n").trimEnd(), startLine });
  }
  return blocks.filter((b) => b.text.trim());
}

const headerEnd = lines.findIndex((l, i) => i >= 4 && l.startsWith("/* ═══"));
const header = lines.slice(0, headerEnd > 0 ? headerEnd : 4).join("\n");
const body = lines.slice(headerEnd > 0 ? headerEnd : 4).join("\n");
const blocks = splitBlocks(body, headerEnd > 0 ? headerEnd + 1 : 5);

const buckets = {
  core: [`/* mobile-core.css — global mobile guards, alignment, touch (split from mobile.css) */`, header, ""],
  admin: [`/* mobile-admin.css — admin + platform-admin mobile compat (split from mobile.css) */`, ""],
  public: [`/* mobile-public.css — public site + platform marketing mobile compat (split from mobile.css) */`, ""],
};

for (const block of blocks) {
  const bucket = classifyBlock(block.text, block.startLine);
  buckets[bucket].push(block.text, "");
}

function writeBundle(name, parts) {
  const out = `${parts.join("\n").trim()}\n`.replace(/^\uFEFF/, "");
  fs.writeFileSync(path.join(ROOT, name), out, "utf8");
  return out.split("\n").length;
}

const coreLines = writeBundle("mobile-core.css", buckets.core);
const adminLines = writeBundle("mobile-admin.css", buckets.admin);
const publicLines = writeBundle("mobile-public.css", buckets.public);

fs.writeFileSync(
  path.join(ROOT, "mobile.css"),
  `/* Legacy aggregate — tests read split bundles via aliases. */\n@import "./mobile-core.css";\n@import "./mobile-admin.css";\n@import "./mobile-public.css";\n`,
  "utf8",
);

console.log({ coreLines, adminLines, publicLines, blocks: blocks.length });
