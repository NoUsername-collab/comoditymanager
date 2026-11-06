import type { ReactNode } from "react";
import { shouldShowPlace } from "@/features/public-site/domain/stay-offers";
import type { PublicSiteSectionOf } from "@/features/public-site/domain/types";
import { PublicPlace } from "@/features/public-site/home/PublicPlace";
import type { SectionRenderContext } from "@/features/public-site/sections/render-context";

/** Null without an address or coordinates, so the page leaves no empty wrapper. */
export function renderPlace(_section: PublicSiteSectionOf<"place">, ctx: SectionRenderContext): ReactNode {
  if (!shouldShowPlace(ctx.config.place)) return null;
  return <PublicPlace config={ctx.config} />;
}
