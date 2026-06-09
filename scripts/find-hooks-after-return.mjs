import fs from "node:fs";
import path from "node:path";

const hookRe =
  /\buse(State|Effect|Memo|Callback|Ref|LayoutEffect|Id|Context|SyncExternalStore|Locale|Router|SearchParams|Translations)\s*\(/;

function walk(dir, acc = []) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    const s = fs.statSync(p);
    if (s.isDirectory() && !f.includes("node_modules") && !f.startsWith(".")) {
      walk(p, acc);
    } else if (/\.tsx$/.test(f)) {
      acc.push(p);
    }
  }
  return acc;
}

for (const file of walk("src")) {
  const text = fs.readFileSync(file, "utf8");
  if (!text.includes("use client")) continue;

  const lines = text.split(/\r?\n/);
  let inFn = false;
  let fnLabel = "";
  let sawEarlyReturn = false;
  const hits = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (/^(export\s+)?function\s+\w+/.test(trimmed)) {
      inFn = true;
      fnLabel = trimmed.slice(0, 80);
      sawEarlyReturn = false;
      hits.length = 0;
      continue;
    }

    if (!inFn) continue;

    if (trimmed === "}" && !trimmed.startsWith("}")) {
      if (hits.length) {
        console.log(`${file} :: ${fnLabel}`);
        for (const h of hits) console.log(`  L${h.line}: ${h.text}`);
      }
      inFn = false;
      continue;
    }

    if (/^if\s*\([^)]+\)\s*return\s+(null|<)/.test(trimmed)) {
      sawEarlyReturn = true;
    }

    if (sawEarlyReturn && hookRe.test(line) && !trimmed.startsWith("//")) {
      hits.push({ line: i + 1, text: trimmed });
    }
  }
}
