import { roomMatchesFeatureFilter as domainRoomMatchesFeatureFilter } from "@/domain/room/feature-filter";

function FeatureIcon({ type }: { type: "ac" | "fridge" }) {
  if (type === "ac") {
    return (
      <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
        <path d="M12 2.5v19" />
        <path d="M12 12 6.8 7.5" />
        <path d="M12 12 17.2 7.5" />
        <path d="M12 12 6.8 16.5" />
        <path d="M12 12 17.2 16.5" />
        <path d="M4 10.5 20 13.5" />
        <path d="M4 13.5 20 10.5" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="7" y="3.5" width="10" height="17" rx="1.8" />
      <path d="M7 10.5h10" />
      <path d="M10 7.2h.01" />
      <path d="M10 14.2h.01" />
    </svg>
  );
}

export function RoomFeatureBadges({
  roomTypeName,
  optionSlugs,
  hasAc,
  compact,
  iconOnly = false,
  hideRoomType = false,
}: {
  roomTypeName?: string | null;
  optionSlugs?: string[];
  hasAc?: boolean;
  compact?: boolean;
  iconOnly?: boolean;
  hideRoomType?: boolean;
}) {
  const slugs = new Set(optionSlugs ?? []);
  if (hasAc) slugs.add("ac");

  const optionLabels: Record<string, string> = {
    ac: "AC",
    fridge: "Frigider",
  };

  const items: string[] = [];
  if (roomTypeName && !hideRoomType) items.push(roomTypeName);
  for (const slug of slugs) {
    const label = optionLabels[slug];
    if (label) items.push(label);
  }

  if (items.length === 0) return null;

  if (iconOnly) {
    return (
      <span className={`inline-flex flex-wrap items-center gap-1 ${compact ? "" : "mt-0.5"}`}>
        {[...slugs].map((slug) => {
          if (slug === "ac") {
            return (
              <span
                key={slug}
                title="AC"
                aria-label="AC"
                className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-sky-200 bg-sky-50 text-sky-700"
              >
                <FeatureIcon type="ac" />
              </span>
            );
          }

          if (slug === "fridge") {
            return (
              <span
                key={slug}
                title="Frigider"
                aria-label="Frigider"
                className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50 text-zinc-700"
              >
                <FeatureIcon type="fridge" />
              </span>
            );
          }

          return null;
        })}
      </span>
    );
  }

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
  return domainRoomMatchesFeatureFilter(room, feature);
}
