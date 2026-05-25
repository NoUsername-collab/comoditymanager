import type { AdminPaletteSettings } from "@/lib/admin-palettes/types";

/**
 * Deprecated: admin appearance now boots from the shared head script.
 * Kept as a no-op to avoid invalid CSS-based html attribute injection.
 */
export function AdminPaletteStyles(_: { settings: AdminPaletteSettings }) {
  void _;
  return null;
}
