import type { AcMode } from "@/types/database";

export type BuildingTheme = {
  warm: boolean;
  accent: string;
  accentLight: string;
  border: string;
  headerBg: string;
  barBg: string;
  label: string;
};

/** Clădire rece (albastru) = cu AC · caldă (portocaliu) = fără AC */
export function getBuildingTheme(
  acMode: AcMode,
  buildingName: string
): BuildingTheme {
  const warm =
    acMode === "none" || /fără|fara/i.test(buildingName);

  if (warm) {
    return {
      warm: true,
      accent: "#ea580c",
      accentLight: "#ffedd5",
      border: "border-orange-200",
      headerBg: "bg-gradient-to-br from-orange-50 to-white",
      barBg: "bg-orange-100",
      label: "Climat cald",
    };
  }

  return {
    warm: false,
    accent: "#2563eb",
    accentLight: "#dbeafe",
    border: "border-blue-200",
    headerBg: "bg-gradient-to-br from-blue-50 to-white",
    barBg: "bg-blue-100",
    label: "Climat rece (AC)",
  };
}

export function roomShortLabel(name: string): string {
  const match = name.match(/(\d+)/);
  if (match) return match[1];
  const trimmed = name.replace(/^camera\s*/i, "").trim();
  return trimmed.length > 0 ? trimmed.slice(0, 4) : name.slice(0, 3);
}
