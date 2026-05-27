import { getLocale } from "next-intl/server";
import { redirect as intlRedirect } from "@/i18n/navigation";

/** Locale-aware redirect for Server Components and Server Actions. */
export async function localeRedirect(href: string) {
  const locale = await getLocale();
  return intlRedirect({ href, locale });
}
