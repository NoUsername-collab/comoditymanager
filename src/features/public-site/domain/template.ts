import type { PublicSiteConfig, PublicTemplateId } from "@/features/public-site/domain/types";

/**
 * The layout the page actually uses. Panoramic opens on a full-screen photo; with
 * no hero photo that screen would be empty, so the page uses Classic until one is added.
 */
export function effectivePublicTemplate(
  config: Pick<PublicSiteConfig, "templateId" | "hero">,
): PublicTemplateId {
  if (config.templateId === "immersive" && !config.hero.imageUrl?.trim()) return "classic";
  return config.templateId;
}
