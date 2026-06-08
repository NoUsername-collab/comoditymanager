import { redirect as nextRedirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { getPathname } from "@/i18n/navigation";

/** Locale-aware redirect for Server Components and Server Actions. */
export async function localeRedirect(href: string) {
  const locale = await getLocale();
  nextRedirect(getPathname({ locale, href }));
}
