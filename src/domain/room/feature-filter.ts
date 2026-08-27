export function roomMatchesFeatureFilter(
  room: { has_ac?: boolean; option_slugs?: string[] },
  feature: "all" | "ac" | "fridge"
): boolean {
  if (feature === "all") return true;
  const slugs = new Set(room.option_slugs ?? []);
  if (room.has_ac) slugs.add("ac");
  return slugs.has(feature);
}
