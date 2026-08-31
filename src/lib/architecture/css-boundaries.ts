import fs from "node:fs";
import path from "node:path";

export type CssViolation = {
  file: string;
  rule: string;
  detail: string;
};

const SRC = path.resolve(process.cwd(), "src");

/** New CSS must live under src/styles/, not src/app/ (except root globals shim). */
const ALLOWED_APP_CSS = new Set(["src/app/globals.css"]);

/** Bundles loaded on every page — must not pull route-heavy CSS. */
const GLOBAL_CSS_BUNDLES = [
  "src/styles/entry/global.css",
  "src/styles/features/admin/admin-features.css",
];

/** Route-scoped sheets — never in global bundles (see ARCHITECTURE.md § CSS). */
const ROUTE_SCOPED_CSS = [
  "gantt-premium.css",
  "admin-gantt-features.css",
  "gantt-mobile.css",
  "admin-settings.css",
  "../shared/gantt.css",
] as const;

/** gantt-premium may only be pulled in via the calendar feature bundle. */
const GANTT_PREMIUM_IMPORT_PARENT = "src/styles/features/admin/admin-gantt-features.css";

const CHECKIN_CSS_ENTRY = "src/features/checkin/ui/import-checkin-styles.ts";

function listCssFiles(dir: string, base = dir): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next") continue;
      out.push(...listCssFiles(full, base));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".css")) {
      out.push(path.relative(base, full).replace(/\\/g, "/"));
    }
  }
  return out;
}

function listSourceFiles(dir: string, base = dir): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next") continue;
      out.push(...listSourceFiles(full, base));
      continue;
    }
    if (entry.isFile() && /\.(tsx?|jsx?)$/.test(entry.name)) {
      out.push(path.relative(base, full).replace(/\\/g, "/"));
    }
  }
  return out;
}

export function auditCssArchitecture(): CssViolation[] {
  const violations: CssViolation[] = [];
  const rel = (p: string) => path.relative(SRC, p).replace(/\\/g, "/");

  for (const file of listCssFiles(SRC, SRC)) {
    const abs = path.join(SRC, file);
    const normalized = `src/${file}`;

    if (normalized.startsWith("src/app/") && !ALLOWED_APP_CSS.has(normalized)) {
      violations.push({
        file: normalized,
        rule: "no-app-css",
        detail: "Feature CSS belongs in src/styles/features/ or src/styles/admin/",
      });
    }

    const content = fs.readFileSync(abs, "utf8");
    if (
      normalized === "src/app/globals.css" &&
      content.includes("@import") &&
      !content.includes("styles/entry/global.css")
    ) {
      violations.push({
        file: normalized,
        rule: "globals-shim-only",
        detail: "Root globals.css must only re-export src/styles/entry/global.css",
      });
    }

    if (normalized === "src/styles/entry/global.css" && content.includes("./gantt.css")) {
      violations.push({
        file: normalized,
        rule: "no-global-gantt",
        detail: "gantt.css must not load globally — use admin calendar layout",
      });
    }

    const importsGanttPremium = /@import\s+[^;]*gantt-premium\.css/.test(content);
    if (importsGanttPremium && normalized !== GANTT_PREMIUM_IMPORT_PARENT) {
      violations.push({
        file: normalized,
        rule: "gantt-premium-calendar-only",
        detail:
          "gantt-premium.css must only be @imported from admin-gantt-features.css (calendar layout)",
      });
    }

    if (GLOBAL_CSS_BUNDLES.includes(normalized)) {
      for (const scoped of ROUTE_SCOPED_CSS) {
        if (new RegExp(`@import\\s+[^;]*${scoped.replace(/\./g, "\\.")}`).test(content)) {
          violations.push({
            file: normalized,
            rule: "no-global-route-css",
            detail: `${scoped} is route-scoped — import from the matching admin route layout`,
          });
        }
      }
    }
  }

  for (const file of listSourceFiles(SRC, SRC)) {
    const normalized = `src/${file}`;
    if (normalized === CHECKIN_CSS_ENTRY) continue;

    const content = fs.readFileSync(path.join(SRC, file), "utf8");
    if (/(?:import|from)\s+["'][^"']*admin-checkin\.css["']/.test(content)) {
      violations.push({
        file: normalized,
        rule: "checkin-css-single-entry",
        detail:
          "Import @/features/checkin/ui/import-checkin-styles instead of admin-checkin.css",
      });
    }
  }

  return violations;
}

/**
 * God CSS files must not grow. Caps are current line counts (including
 * trailing newline). Lower the cap when you split a sheet.
 */
export const CSS_GOD_FILE_LINE_CAPS: { file: string; maxLines: number }[] = [
  {
    file: "src/styles/features/layout/mobile-admin.css",
    maxLines: 4772,
  },
  {
    file: "src/styles/features/admin/gantt-premium.css",
    maxLines: 4654,
  },
];

export type CssGodFileSize = {
  file: string;
  lines: number;
  maxLines: number;
};

export function auditCssGodFileSizes(root = path.resolve(process.cwd())): CssGodFileSize[] {
  return CSS_GOD_FILE_LINE_CAPS.map(({ file, maxLines }) => {
    const abs = path.join(root, file);
    const lines = fs.readFileSync(abs, "utf8").split("\n").length;
    return { file, lines, maxLines };
  });
}
