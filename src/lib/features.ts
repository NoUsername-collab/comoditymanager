/**
 * Builds with NEXT_PUBLIC_RELEASE_CHANNEL=alpha turn on features still being
 * tried out. The version itself is in lib/platform/version.
 */
const RELEASE_CHANNEL: "alpha" | "stable" =
  process.env.NEXT_PUBLIC_RELEASE_CHANNEL === "alpha" ? "alpha" : "stable";

/** Informal invoicing is gated behind NEXT_PUBLIC_RELEASE_CHANNEL=alpha. */
export function isInvoicingAlphaEnabled(): boolean {
  return RELEASE_CHANNEL === "alpha";
}
