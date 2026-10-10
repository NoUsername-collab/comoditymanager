import { formatLoyaltyReference } from "@/domain/guest-app/loyalty";

/** Absolute URL to the stay guest app. */
export function buildGuestAppStayUrl(
  baseUrl: string,
  accessCode: string,
): string {
  const base = baseUrl.replace(/\/$/, "");
  return `${base}/stay/${accessCode}`;
}

/** Absolute URL to the property guest card (loyalty reference). */
export function buildGuestLoyaltyUrl(
  baseUrl: string,
  reference: string,
): string {
  const base = baseUrl.replace(/\/$/, "");
  return `${base}/guest/${formatLoyaltyReference(reference)}`;
}
