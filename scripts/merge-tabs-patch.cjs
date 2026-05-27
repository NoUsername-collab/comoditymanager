const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..", "messages");

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

for (const locale of ["en", "ro", "bg"]) {
  const patchFile = `tabs-patch-${locale}.json`;
  const patch = JSON.parse(
    fs.readFileSync(path.join(root, patchFile), "utf8")
  );
  const file = path.join(root, `${locale}.json`);
  const base = JSON.parse(fs.readFileSync(file, "utf8"));
  deepMerge(base, patch);
  fs.writeFileSync(file, JSON.stringify(base, null, 2) + "\n", "utf8");
  console.log(`Merged tabs patch into ${locale}.json`);
}
