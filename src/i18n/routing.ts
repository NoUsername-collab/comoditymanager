import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["ro", "en", "bg"],
  defaultLocale: "ro",
  localePrefix: "as-needed",
});
