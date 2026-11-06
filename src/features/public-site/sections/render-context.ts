import type { PublicSiteConfig, PublicTemplateId } from "@/features/public-site/domain/types";

/** What a section renderer may read besides its own section. */
export type SectionRenderContext = {
  locale: string;
  template: PublicTemplateId;
  /** The whole site: rooms and map read the catalog and the address from it. */
  config: PublicSiteConfig;
  /** Settings preview: links do not navigate. */
  preview: boolean;
};
