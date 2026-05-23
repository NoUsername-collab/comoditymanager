import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

/**
 * Încarcă variabile din fișier .env (nu suprascrie ce e deja în process.env).
 * @param {string} root - rădăcina proiectului
 * @param {string} [filename='.env.local']
 */
export function loadEnvFile(root, filename = ".env.local") {
  const path = resolve(root, filename);
  if (!existsSync(path)) {
    return { path, loaded: false };
  }
  const text = readFileSync(path, "utf8");
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
  return { path, loaded: true };
}
