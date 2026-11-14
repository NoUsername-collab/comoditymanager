import type { AbstractIntlMessages } from "next-intl";

/*
 * Which texts reach the browser. Every page sends the small shared set; an
 * area that needs more (the admin, the guest app, the platform's own pages)
 * sends its own on top, so a guest on the public site does not download the
 * whole admin's wording with every page.
 */

/** Texts any page's client components may use: the public site, booking, errors. */
export const SHARED_CLIENT_NAMESPACES = [
  "common",
  "errors",
  "public",
  "party",
  "booking",
  "bookingIdentity",
  "room",
  "settings",
  "guest",
  "alphaGate",
  "tenantSuspended",
] as const;

/** The messages at these paths ("public", or "admin.common" for one part of a namespace). */
export function pickMessages(messages: AbstractIntlMessages, paths: readonly string[]): AbstractIntlMessages {
  const picked: AbstractIntlMessages = {};
  for (const path of paths) {
    const keys = path.split(".");
    let from: unknown = messages;
    for (const key of keys) {
      from = from && typeof from === "object" ? (from as Record<string, unknown>)[key] : undefined;
    }
    if (from === undefined) continue;
    let into = picked as Record<string, unknown>;
    keys.forEach((key, index) => {
      if (index === keys.length - 1) {
        into[key] = from;
        return;
      }
      if (!into[key] || typeof into[key] !== "object") into[key] = {};
      into = into[key] as Record<string, unknown>;
    });
  }
  return picked;
}
