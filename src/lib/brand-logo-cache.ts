import { readFile } from "fs/promises";
import path from "path";
import { unstable_cache } from "next/cache";

const LOGO_ONYX_PATHS = ["logo/logo.png", "public/logo/logo.png"];
const LOGO_LIGHT_BG_PATHS = [
  "logo/logo-dark.png",
  "logo/logo-on-light.png",
  "public/logo/logo-dark.png",
];

async function readLogoFromDisk(paths: string[]): Promise<string | null> {
  for (const rel of paths) {
    try {
      const buf = await readFile(path.join(process.cwd(), rel));
      return `data:image/png;base64,${buf.toString("base64")}`;
    } catch {
      continue;
    }
  }
  return null;
}

const loadBrandLogoAssets = unstable_cache(
  async () => ({
    onyx: await readLogoFromDisk(LOGO_ONYX_PATHS),
    lightBg: await readLogoFromDisk(LOGO_LIGHT_BG_PATHS),
  }),
  ["brand-logo-assets"],
  { revalidate: 3600 }
);

export async function getBrandLogoAssets(): Promise<{
  onyx: string | null;
  lightBg: string | null;
}> {
  return loadBrandLogoAssets();
}
