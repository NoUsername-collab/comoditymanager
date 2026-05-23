/** Versiune aplicație — aliniată cu branch / release. */
export const STABLE_VERSION = "0.1.1";
export const ALPHA_VERSION = "0.1.5-alpha.0";

export type ReleaseChannel = "stable" | "alpha";

/**
 * stable = producție (v0.1.1): istoric, dashboard, Gantt, prețuri, etc.
 * alpha = doar facturare neoficială (v0.1.5) — setează NEXT_PUBLIC_RELEASE_CHANNEL=alpha
 */
export const RELEASE_CHANNEL: ReleaseChannel =
  process.env.NEXT_PUBLIC_RELEASE_CHANNEL === "alpha" ? "alpha" : "stable";

export function releaseLabel(): string {
  if (RELEASE_CHANNEL === "alpha") {
    return `v${ALPHA_VERSION} · Facturare (Alpha)`;
  }
  return `v${STABLE_VERSION} · Stable`;
}

/** @deprecated Folosește STABLE_VERSION / ALPHA_VERSION */
export const APP_VERSION =
  RELEASE_CHANNEL === "alpha" ? ALPHA_VERSION : STABLE_VERSION;
