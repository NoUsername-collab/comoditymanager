import type { RoomOptionDefinition } from "@/types/room-catalog";
import type { OptionPolicyMode } from "@/types/room-catalog";

export function RoomFeatureBadges({
  roomTypeName,
  optionSlugs,
  hasAc,
  compact,
}: {
  roomTypeName?: string | null;
  optionSlugs?: string[];
  hasAc?: boolean;
  compact?: boolean;
}) {
  const slugs = new Set(optionSlugs ?? []);
  if (hasAc) slugs.add("ac");

  const optionLabels: Record<string, string> = {
    ac: "AC",
    fridge: "Frigider",
  };

  const items: string[] = [];
  if (roomTypeName) items.push(roomTypeName);
  for (const slug of slugs) {
    const label = optionLabels[slug];
    if (label) items.push(label);
  }

  if (items.length === 0) return null;

  return (
    <span className={`inline-flex flex-wrap gap-1 ${compact ? "" : "mt-0.5"}`}>
      {items.map((label) => (
        <span
          key={label}
          className="rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600 ring-1 ring-zinc-200"
        >
          {label}
        </span>
      ))}
    </span>
  );
}

export function roomMatchesFeatureFilter(
  room: { has_ac?: boolean; option_slugs?: string[] },
  feature: "all" | "ac" | "fridge"
): boolean {
  if (feature === "all") return true;
  const slugs = new Set(room.option_slugs ?? []);
  if (room.has_ac) slugs.add("ac");
  return slugs.has(feature);
}
