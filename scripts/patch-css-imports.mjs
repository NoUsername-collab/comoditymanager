import fs from "node:fs";
import path from "node:path";

const replacements = [
  ["@/app/admin/", "@/styles/features/admin/"],
  ["@/app/gantt.css", "@/styles/features/shared/gantt.css"],
  ["@/app/invoice-print.css", "@/styles/features/shared/invoice-print.css"],
  ["@/app/guest-app.css", "@/styles/features/guest/guest-app.css"],
  ["@/app/public-site.css", "@/styles/features/public/public-site.css"],
  ["@/app/public-site-v2.css", "@/styles/features/public/public-site-v2.css"],
  ["@/app/landing.css", "@/styles/features/platform/landing.css"],
  ["@/app/landing-premium.css", "@/styles/features/platform/landing-premium.css"],
  ["@/app/platform.css", "@/styles/features/platform/platform.css"],
  ["@/app/platform-split.css", "@/styles/features/platform/platform-split.css"],
  ["@/app/signup.css", "@/styles/features/platform/signup.css"],
  ["@/app/admin-login.css", "@/styles/features/shared/admin-login.css"],
  ["@/app/layout-debug.css", "@/styles/features/layout/layout-debug.css"],
  ['"./admin-status.css"', '"../../features/layout/admin-status.css"'],
  ['"./locale-loading.css"', '"../../features/layout/locale-loading.css"'],
  ['"./device-mobile.css"', '"../../features/layout/device-mobile.css"'],
  ['"./display-profile.css"', '"../../features/layout/display-profile.css"'],
  ['"./mobile-layout.css"', '"../../features/layout/mobile-layout.css"'],
];

function walk(dir, exts, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules" || e.name === ".next") continue;
      walk(p, exts, out);
    } else if (exts.some((x) => e.name.endsWith(x))) {
      out.push(p);
    }
  }
  return out;
}

function patchFile(file) {
  let s = fs.readFileSync(file, "utf8");
  const orig = s;
  for (const [a, b] of replacements) {
    s = s.split(a).join(b);
  }
  if (file.includes("styles/features/admin/admin-features.css")) {
    s = s.replace(/@import "\.\.\/\.\.\/styles\/themes\//g, '@import "../../themes/');
  }
  if (file.includes("styles/features/admin/admin-gantt-features.css")) {
    s = s.replace(/@import "\.\.\/\.\.\/styles\/themes\//g, '@import "../../themes/');
    s = s.replace(
      '@import "../../features/shared/gantt.css"',
      '@import "../shared/gantt.css"',
    );
  }
  if (file.includes("styles/features/admin/admin-availability-route.css")) {
    s = s.replace(
      '@import "../../../admin/availability-layout.css"',
      '@import "../../../admin/availability-layout.css"',
    );
  }
  if (s !== orig) {
    fs.writeFileSync(file, s, "utf8");
    console.log("updated", file);
    return true;
  }
  return false;
}

const files = walk("src", [".ts", ".tsx", ".css"]);
let changed = 0;
for (const file of files) {
  if (patchFile(file)) changed++;
}
console.log("total changed", changed);
