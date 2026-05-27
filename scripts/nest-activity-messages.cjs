/**
 * Nest flat admin.activity keys (booking.confirmed) for next-intl.
 * Run: node scripts/nest-activity-messages.cjs
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..", "messages");

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
      if (typeof cur[p] !== "object" || cur[p] === null) {
        cur[p] = {};
      }
      cur = cur[p];
    }
    cur[parts[parts.length - 1]] = value;
  }
  return nested;
}

for (const locale of ["en", "ro", "bg"]) {
  const file = path.join(root, `${locale}.json`);
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  if (!data.admin?.activity) {
    console.warn(`Skip ${locale}: no admin.activity`);
    continue;
  }
  data.admin.activity = nestFlatKeys(data.admin.activity);
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n", "utf8");
  console.log(`Nested admin.activity in ${locale}.json`);
}
