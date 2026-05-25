"use client";

import { CATALOG_PALETTES } from "@/lib/admin-palettes";
import { useAdminTheme } from "@/components/admin/AdminAppearanceProvider";

export function AdminCurrentThemeSummary() {
  const { themeId, mode } = useAdminTheme();
  const activePalette =
    CATALOG_PALETTES.find((palette) => palette.id === themeId) ??
    CATALOG_PALETTES[0]!;

  return (
    <>
      {activePalette.name} · {mode === "day" ? "Zi" : "Noapte"}
    </>
  );
}
