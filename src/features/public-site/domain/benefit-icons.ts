export const PUBLIC_BENEFIT_ICON_IDS = [
  "bed",
  "spark",
  "handshake",
  "leaf",
  "wifi",
  "parking",
  "breakfast",
  "mountain",
] as const;

export type PublicBenefitIconId = (typeof PUBLIC_BENEFIT_ICON_IDS)[number];

const ICON_ID_SET = new Set<string>(PUBLIC_BENEFIT_ICON_IDS);

const LEGACY_EMOJI: Record<string, PublicBenefitIconId> = {
  "🛏": "bed",
  "✦": "spark",
  "🤝": "handshake",
  "🌿": "leaf",
  "📶": "wifi",
  "🅿": "parking",
  "🍴": "breakfast",
  "⛰": "mountain",
};

export function normalizeBenefitIcon(icon: string | undefined): PublicBenefitIconId {
  const trimmed = icon?.trim() ?? "";
  if (ICON_ID_SET.has(trimmed)) return trimmed as PublicBenefitIconId;
  if (trimmed in LEGACY_EMOJI) return LEGACY_EMOJI[trimmed]!;
  return "spark";
}
