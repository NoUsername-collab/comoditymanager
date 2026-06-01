import { RELEASE_CHANNEL } from "@/lib/app-version";

/** Informal invoicing is gated behind NEXT_PUBLIC_RELEASE_CHANNEL=alpha. */
export function isInvoicingAlphaEnabled(): boolean {
  return RELEASE_CHANNEL === "alpha";
}
