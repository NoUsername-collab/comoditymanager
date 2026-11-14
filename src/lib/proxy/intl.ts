import createIntlMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";

export const intlMiddleware = createIntlMiddleware(routing);

/**
 * The guesthouse's public site: an address names its language (none for
 * Romanian), whatever the browser or an earlier visit chose. Search engines
 * and shared links reach the page they point at, never a redirect by language.
 */
export const publicSiteIntlMiddleware = createIntlMiddleware({ ...routing, localeDetection: false });
