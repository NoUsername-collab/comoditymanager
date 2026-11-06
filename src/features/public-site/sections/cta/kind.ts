import type { SectionKind } from "@/features/public-site/sections/kind";

/** The closing "book now" band, always last on the page. */
export const ctaKind: SectionKind = {
  type: "cta",
  copyFields: ["title", "lead", "ctaLabel"],
  progressFields: ["title", "ctaLabel"],
  summaryField: "title",
  settings: {
    read: (payload) => ({
      ctaHref: typeof payload.ctaHref === "string" && payload.ctaHref ? payload.ctaHref : "/calendar",
    }),
    write: (settings) => ({ ctaHref: settings.ctaHref?.trim() || "/calendar" }),
  },
  pinnedLast: true,
};
