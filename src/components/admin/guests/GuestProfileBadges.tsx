import type {
  GuestBookingFlagSummary,
  GuestFlagLevel,
  GuestProfileRow,
} from "@/domain/guest/types";
import {
  GUEST_FLAG_LABELS,
  guestLoyaltyLabel,
  guestTrustLabel,
} from "@/domain/guest/reputation";

function flagTone(level: GuestFlagLevel): string {
  if (level === "blacklist") return "border-red-300 bg-red-50 text-red-900";
  if (level === "watchlist") return "border-amber-300 bg-amber-50 text-amber-950";
  return "border-zinc-200 bg-zinc-50 text-zinc-700";
}

type ProfileLike = GuestBookingFlagSummary | GuestProfileRow | null;

export function GuestProfileBadges({
  profile,
  alertLevel,
  alertNote,
}: {
  profile: ProfileLike;
  alertLevel?: GuestFlagLevel;
  alertNote?: string | null;
}) {
  if (!profile && (!alertLevel || alertLevel === "normal")) return null;

  const effectiveLevel =
    alertLevel && alertLevel !== "normal" ? alertLevel : profile?.flag_level ?? "normal";

  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] font-semibold">
      {(effectiveLevel === "watchlist" || effectiveLevel === "blacklist") && (
        <span
          className={[
            "rounded-full border px-2 py-0.5 uppercase tracking-wide",
            flagTone(effectiveLevel),
          ].join(" ")}
        >
          {GUEST_FLAG_LABELS[effectiveLevel]}
        </span>
      )}
      {profile && (
        <>
          <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-sky-900">
            Trust {profile.trust_score} · {guestTrustLabel(profile.trust_score)}
          </span>
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-emerald-900">
            Fidelitate {profile.loyalty_score} · {guestLoyaltyLabel(profile.loyalty_score)}
          </span>
          <span className="rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-violet-900">
            Stele {profile.stars_avg.toFixed(1)}
          </span>
        </>
      )}
      {alertNote && (
        <span className="basis-full text-[11px] font-medium text-amber-900">{alertNote}</span>
      )}
    </div>
  );
}
