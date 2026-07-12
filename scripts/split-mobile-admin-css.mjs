/**
 * Split mobile-admin.css into route-scoped bundles.
 * Run: node scripts/split-mobile-admin-css.mjs
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve("src/styles/features/layout");
const srcPath = path.join(ROOT, "mobile-admin.css");
const backupPath = path.join(ROOT, "mobile-admin.css.bak");

if (!fs.existsSync(backupPath)) {
  fs.copyFileSync(srcPath, backupPath);
}

const src = fs.readFileSync(backupPath, "utf8");

const GANTT_RE =
  /\b(gantt-|gantt-calendar|gantt-scroll|gantt-compact|gantt-check-time|gantt-ctx-menu|gantt-stay|gantt-action|gantt-page|gantt-shell|gantt-room|gantt-day|gantt-footer|gantt-inline|gantt-building)\b/i;

const CAZARI_RE =
  /\b(cazari|stay-card|stay-quick|stay-list|stay-history|stay-info|cerere-|receptie|guest-page|guest-profile|guest-search|guest-hero|guest-grid|guest-notes|guest-rebook|guest-card|mrz-scan)\b/i;

const AVAIL_RE = /\b(avail-|availability-|avail-dashboard|availability-week|availability-month)\b/i;

function classifyBlock(text) {
  const hasGantt = GANTT_RE.test(text);
  const hasCazari = CAZARI_RE.test(text);
  const hasAvail = AVAIL_RE.test(text);

  if (hasGantt && !hasCazari) return "gantt";
  if (hasCazari && !hasGantt) return "cazari";
  if (hasAvail && !hasGantt && !hasCazari) return "avail";

  if (hasGantt) return "gantt";
  if (hasCazari) return "cazari";
  if (hasAvail) return "avail";
  return "admin";
}

function splitBlocks(content) {
  const blocks = [];
  let current = [];
  let depth = 0;
  let inRule = false;
  let startLine = 1;
  const lines = content.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;
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

const blocks = splitBlocks(src);
const header = blocks[0]?.text.startsWith("/* mobile-admin") ? blocks.shift().text : "";

const buckets = {
  admin: [header || "/* mobile-admin.css — admin shell HUD, settings, platform-admin */", ""],
  gantt: ["/* mobile-gantt.css — Gantt calendar mobile compat (split from mobile-admin.css) */", ""],
  cazari: ["/* mobile-cazari.css — Cazări, guests, receptie mobile compat (split from mobile-admin.css) */", ""],
  avail: ["/* mobile-avail.css — Disponibilitate mobile compat (split from mobile-admin.css) */", ""],
};

for (const block of blocks) {
  const bucket = classifyBlock(block.text);
  buckets[bucket].push(block.text, "");
}

function writeBundle(name, parts) {
  const out = `${parts.join("\n").trim()}\n`.replace(/^\uFEFF/, "");
  fs.writeFileSync(path.join(ROOT, name), out, "utf8");
  return out.split("\n").length;
}

const adminLines = writeBundle("mobile-admin.css", buckets.admin);
const ganttLines = writeBundle("mobile-gantt.css", buckets.gantt);
const cazariLines = writeBundle("mobile-cazari.css", buckets.cazari);
const availLines = writeBundle("mobile-avail.css", buckets.avail);

fs.writeFileSync(
  path.join(ROOT, "mobile.css"),
  `/* Legacy aggregate — tests may read split bundles via aliases. */\n@import "./mobile-core.css";\n@import "./mobile-admin.css";\n@import "./mobile-gantt.css";\n@import "./mobile-cazari.css";\n@import "./mobile-avail.css";\n@import "./mobile-public.css";\n`,
  "utf8",
);

console.log({ adminLines, ganttLines, cazariLines, availLines, blocks: blocks.length });
