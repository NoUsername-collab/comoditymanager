import { migrateLegacyPaletteKey } from "@/lib/themes";
import type { AdminPaletteSettings } from "@/lib/admin-palettes/types";

/** SSR: atribute temă înainte de hidratare (valorile în CSS modular). */
export function AdminPaletteStyles({
  settings,
}: {
  settings: AdminPaletteSettings;
}) {
  const theme = migrateLegacyPaletteKey(settings.admin_palette_key);
  const mode = settings.admin_day_night;
  const retro = theme === "win95" ? "win95" : theme === "winxp" ? "winxp" : "";

  return (
    <style
      id="admin-palette-ssr"
      dangerouslySetInnerHTML={{
        __html: `html{data-theme:${theme};data-mode:${mode};data-admin-palette:${theme};data-admin-theme:${mode};data-admin-palette-source:catalog;data-admin-retro:${retro};}`,
      }}
    />
  );
}
