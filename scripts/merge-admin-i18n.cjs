/**
 * Merges admin i18n keys into messages/{ro,en,bg}.json (UTF-8).
 * Run: node scripts/merge-admin-i18n.cjs
 */
const fs = require("fs");
const path = require("path");

const locales = {
  ro: require("../messages/ro-partial-admin.json"),
  en: require("../messages/en-partial-admin.json"),
  bg: require("../messages/bg-partial-admin.json"),
};

function deepMerge(target, source) {
  for (const key of Object.keys(source)) {
    if (
      source[key] &&
      typeof source[key] === "object" &&
      !Array.isArray(source[key]) &&
      target[key] &&
      typeof target[key] === "object" &&
      !Array.isArray(target[key])
    ) {
      deepMerge(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}

function nestFlatKeys(flat) {
  const nested = {};
  for (const [key, value] of Object.entries(flat)) {
    if (!key.includes(".")) {
      nested[key] = value;
      continue;
    }
    const parts = key.split(".");
    let cur = nested;
    for (let i = 0; i < parts.length - 1; i++) {
      const p = parts[i];
      if (typeof cur[p] !== "object" || cur[p] === null) cur[p] = {};
      cur = cur[p];
    }
    cur[parts[parts.length - 1]] = value;
  }
  return nested;
}

const root = path.join(__dirname, "..", "messages");
for (const locale of ["ro", "en", "bg"]) {
  const file = path.join(root, `${locale}.json`);
  const base = JSON.parse(fs.readFileSync(file, "utf8"));
  if (locales[locale].admin?.activity) {
    locales[locale].admin.activity = nestFlatKeys(locales[locale].admin.activity);
  }
  deepMerge(base, locales[locale]);
  if (base.admin?.activity) {
    base.admin.activity = nestFlatKeys(base.admin.activity);
  }
  fs.writeFileSync(file, JSON.stringify(base, null, 2) + "\n", "utf8");
  console.log(`Updated ${locale}.json`);
}
