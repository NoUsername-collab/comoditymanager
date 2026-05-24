export const BLOCK_REASON_PRESETS = [
  { id: "maintenance", label: "Mentenanță" },
  { id: "defect", label: "Defect / reparații" },
  { id: "personal", label: "Uz personal" },
  { id: "other", label: "Altul…" },
] as const;

export type BlockReasonPresetId = (typeof BLOCK_REASON_PRESETS)[number]["id"];

export function resolveBlockReason(
  presetId: BlockReasonPresetId,
  customText: string
): string {
  if (presetId === "other") return customText.trim();
  const preset = BLOCK_REASON_PRESETS.find((p) => p.id === presetId);
  const extra = customText.trim();
  if (extra) return `${preset?.label ?? presetId}: ${extra}`;
  return preset?.label ?? presetId;
}
