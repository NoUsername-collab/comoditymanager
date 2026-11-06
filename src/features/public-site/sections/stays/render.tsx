import type { ReactNode } from "react";
import { shouldShowStayOffers } from "@/features/public-site/domain/stay-offers";
import type { PublicSiteSectionOf } from "@/features/public-site/domain/types";
import { PublicStayOffers } from "@/features/public-site/home/PublicStayOffers";
import type { SectionRenderContext } from "@/features/public-site/sections/render-context";

/** Null without room types, so the page leaves no empty wrapper. */
export function renderStays(section: PublicSiteSectionOf<"stays">, ctx: SectionRenderContext): ReactNode {
  if (!shouldShowStayOffers(ctx.config.stayOffers)) return null;
  return (
    <PublicStayOffers
      config={ctx.config}
      locale={ctx.locale}
      showPrices={section.payload.showPrices !== false}
      preview={ctx.preview}
    />
  );
}
