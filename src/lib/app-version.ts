/** Versiune aplicație — aliniată cu branch / release. */
export const STABLE_VERSION = "0.2.0";
export const RELEASE_STAGE = "Alpha Stage";
export const ALPHA_VERSION = "0.1.5-alpha.0";

export type ReleaseChannel = "stable" | "alpha";

/**
 * stable = v0.2.0 Alpha Stage
 * alpha = doar facturare neoficială (v0.1.5) — NEXT_PUBLIC_RELEASE_CHANNEL=alpha
 */
export const RELEASE_CHANNEL: ReleaseChannel =
  process.env.NEXT_PUBLIC_RELEASE_CHANNEL === "alpha" ? "alpha" : "stable";

export function releaseLabel(): string {
  if (RELEASE_CHANNEL === "alpha") {
    return `v${ALPHA_VERSION} · Facturare (Alpha)`;
  }
  return `v${STABLE_VERSION} · ${RELEASE_STAGE}`;
}

/** @deprecated Folosește STABLE_VERSION / ALPHA_VERSION */
export const APP_VERSION =
  RELEASE_CHANNEL === "alpha" ? ALPHA_VERSION : STABLE_VERSION;
