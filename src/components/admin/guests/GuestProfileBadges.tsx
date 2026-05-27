import type {
  GuestBookingFlagSummary,
  GuestFlagLevel,
  GuestProfileRow,
} from "@/domain/guest/types";
import {
  guestLoyaltyLabel,
  guestTrustLabel,
} from "@/domain/guest/reputation";
import { GuestStarsCompact } from "@/components/admin/guests/GuestStarsCompact";

function QuickProfileCard({
  title,
  value,
  subtitle,
  children,
  tone,
}: {
  title: string;
  value: string;
  subtitle: string;
  children?: React.ReactNode;
  tone: "sky" | "emerald" | "amber" | "neutral";
}) {
  const toneStyle =
    tone === "sky"
      ? {
          borderColor: "#bfdbfe",
          background: "#eff6ff",
          color: "#1d4ed8",
        }
      : tone === "emerald"
        ? {
            borderColor: "#a7f3d0",
            background: "#ecfdf5",
            color: "#047857",
          }
        : tone === "amber"
          ? {
              borderColor: "#fcd34d",
              background: "#fffbeb",
              color: "#b45309",
            }
          : {
              borderColor: "var(--border)",
              background: "var(--surface-2)",
              color: "var(--text)",
            };

  return (
    <div className="rounded-lg border px-3 py-3" style={toneStyle}>
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] opacity-70">{title}</p>
      <p className="mt-1 text-lg font-black leading-tight">{value}</p>
      <p className="mt-1 text-xs font-medium opacity-80">{subtitle}</p>
      {children ? <div className="mt-2">{children}</div> : null}
    </div>
  );
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

  const riskTone =
    effectiveLevel === "blacklist"
      ? "Blacklist"
      : effectiveLevel === "watchlist"
        ? "Watchlist"
        : "Normal";

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {profile && (
        <>
          <QuickProfileCard
            title="Comportament"
            value={String(profile.trust_score)}
            subtitle={guestTrustLabel(profile.trust_score)}
            tone="sky"
          />
          <QuickProfileCard
            title="Fidelitate"
            value={String(profile.loyalty_score)}
            subtitle={guestLoyaltyLabel(profile.loyalty_score)}
            tone="emerald"
          />
          <QuickProfileCard
            title="Rating"
            value={`${profile.stars_avg.toFixed(1)} / 5`}
            subtitle={
              profile.review_count > 0
                ? `${profile.review_count} review${profile.review_count === 1 ? "" : "-uri"}`
                : "Fără review încă"
            }
            tone="neutral"
          >
            <div className="flex items-center">
              <GuestStarsCompact
                value={profile.stars_avg}
                count={profile.review_count}
                size="md"
                showCount={false}
                showValue={false}
              />
            </div>
          </QuickProfileCard>
          <QuickProfileCard
            title="Stare"
            value={riskTone}
            subtitle={
              effectiveLevel === "blacklist"
                ? profile.blacklist_reason || "Alertă critică pentru rezervări noi"
                : effectiveLevel === "watchlist"
                  ? "Client de urmărit cu atenție"
                  : "Fără alertă activă"
            }
            tone={effectiveLevel === "normal" ? "neutral" : "amber"}
          />
        </>
      )}
      {alertNote && (
        <span className="sm:col-span-2 text-[11px] font-medium text-amber-900">{alertNote}</span>
      )}
    </div>
  );
}
