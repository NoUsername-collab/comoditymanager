import { releaseLabel, RELEASE_CHANNEL } from "@/lib/app-version";

export function AdminVersionBadge() {
  const isAlpha = RELEASE_CHANNEL === "alpha";
  return (
    <span
      className={[
        "admin-hud__badge font-sans",
        isAlpha ? "admin-hud__badge--alpha" : "admin-hud__badge--stable",
      ].join(" ")}
    >
      {releaseLabel()}
    </span>
  );
}
