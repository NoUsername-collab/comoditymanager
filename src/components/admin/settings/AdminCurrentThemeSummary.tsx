"use client";

import { CATALOG_PALETTES } from "@/lib/admin-palettes";
import { useAdminTheme } from "@/components/admin/AdminAppearanceProvider";

export function AdminCurrentThemeSummary() {
  const { settings } = useAdminTheme();
  const activePalette =
    CATALOG_PALETTES.find((palette) => palette.id === settings.admin_palette_key) ??
    CATALOG_PALETTES[0]!;

  return (
    <>
      {activePalette.name} · {settings.admin_day_night === "day" ? "Zi" : "Noapte"}
    </>
  );
}
