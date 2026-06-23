import fs from "node:fs";
import path from "node:path";

export type ImportViolation = {
  file: string;
  line: number;
  importPath: string;
  rule: string;
};

type LayerRule = {
  id: string;
  /** Directory prefix under src/ (e.g. "domain") */
  layer: string;
  /** Regex patterns for forbidden import paths */
  forbidden: RegExp[];
};

const SRC = path.resolve(process.cwd(), "src");

/** Allowed import directions — see ARCHITECTURE.md */
const LAYER_RULES: LayerRule[] = [
  {
    id: "domain-no-services",
    layer: "domain",
    forbidden: [/^@\/services\//],
  },
  {
    id: "domain-no-app",
    layer: "domain",
    forbidden: [/^@\/app\//],
  },
  {
    id: "components-no-app",
    layer: "components",
    forbidden: [/^@\/app\//],
  },
  {
    id: "features-no-app",
    layer: "features",
    forbidden: [/^@\/app\//],
  },
  {
    id: "services-no-app",
    layer: "services",
    forbidden: [/^@\/app\//],
  },
];

const IMPORT_RE =
  /(?:import|export)\s+(?:type\s+)?(?:[\w*{}\s,]+\s+from\s+)?["'](@\/[^"']+)["']/g;

function listSourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "__tests__") continue;
      out.push(...listSourceFiles(full));
    } else if (/\.(ts|tsx)$/.test(entry.name) && !/\.(test|spec)\.(ts|tsx)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

function layerForFile(filePath: string): string | null {
  const rel = path.relative(SRC, filePath).replace(/\\/g, "/");
  for (const rule of LAYER_RULES) {
    if (rel.startsWith(`${rule.layer}/`)) return rule.layer;
  }
  return null;
}

function rulesForLayer(layer: string): LayerRule[] {
  return LAYER_RULES.filter((r) => r.layer === layer);
}

/** Scan src/ for layer boundary violations. */
export function auditImportBoundaries(root = SRC): ImportViolation[] {
  const violations: ImportViolation[] = [];

  for (const file of listSourceFiles(root)) {
    const layer = layerForFile(file);
    if (!layer) continue;

    const content = fs.readFileSync(file, "utf8");
    const relFile = path.relative(process.cwd(), file).replace(/\\/g, "/");
    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      IMPORT_RE.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = IMPORT_RE.exec(line)) !== null) {
        const importPath = match[1];
        for (const rule of rulesForLayer(layer)) {
          for (const forbidden of rule.forbidden) {
            if (forbidden.test(importPath)) {
              violations.push({
                file: relFile,
                line: i + 1,
                importPath,
                rule: rule.id,
              });
            }
          }
        }
      }
    }
  }

  return violations;
}
