import fs from "node:fs";

const g = fs.readFileSync("src/app/globals.css", "utf8");
const lines = g.split(/\r?\n/);
const imports = lines.slice(0, 10).join("\n");
const inline = lines.slice(11).join("\n");

fs.mkdirSync("src/styles/entry", { recursive: true });
fs.writeFileSync(
  "src/styles/entry/global.css",
  `${imports}\n@import "./site-brand.css";\n`,
  "utf8",
);
fs.writeFileSync(
  "src/styles/entry/site-brand.css",
  `/* Public site tokens + brand animations (global) */\n${inline.trim()}\n`,
  "utf8",
);
fs.writeFileSync(
  "src/app/globals.css",
  '@import "../styles/entry/global.css";\n',
  "utf8",
);
console.log("done");
