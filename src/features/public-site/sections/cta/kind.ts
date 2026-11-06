import type { SectionKind } from "@/features/public-site/sections/kind";
import { seedText } from "@/features/public-site/sections/seed";

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
  seed: (copy) => ({
    visible: true,
    payload: {
      title: seedText(copy.ctaBandTitle),
      lead: seedText(copy.ctaBandText),
      ctaLabel: seedText(copy.ctaBandButton),
      ctaHref: "/calendar",
    },
  }),
};
