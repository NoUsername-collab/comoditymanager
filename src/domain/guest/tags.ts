import type { GuestTag } from "./types";

export const GUEST_TAG_LABELS: Record<GuestTag, string> = {
  vip: "VIP",
  recurrent: "Recurent",
};

export function parseGuestTags(raw: unknown): GuestTag[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((t): t is GuestTag => t === "vip" || t === "recurrent");
}

export function toggleGuestTag(tags: GuestTag[], tag: GuestTag): GuestTag[] {
  return tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag];
}
