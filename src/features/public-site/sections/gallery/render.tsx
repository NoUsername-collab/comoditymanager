import type { ReactNode } from "react";
import Image from "next/image";
import { isOptimizablePublicImageUrl } from "@/domain/public-site/media";
import type { PublicSiteSectionOf, PublicTemplateId } from "@/features/public-site/domain/types";
import { copy, SectionHead, SectionShell } from "@/features/public-site/sections/shell";

/** Null when there is nothing to show, so the page leaves no empty wrapper. */
export function renderGallery(
  section: PublicSiteSectionOf<"gallery">,
  locale: string,
  template: PublicTemplateId,
): ReactNode {
  const items = section.payload.items ?? [];
  if (items.length === 0) return null;
  const title = copy(section.payload.title, locale);
  const lead = copy(section.payload.lead, locale);
  return (
    <SectionShell
      className={["pub-section--gallery", template === "immersive" ? "pub-section--gallery-bleed" : ""]
        .filter(Boolean)
        .join(" ")}
    >
      <SectionHead title={title} lead={lead} />
      <div className={`pub-gallery pub-gallery--${template}`}>
        {items.map((item) => {
          const caption = copy(item.caption, locale);
          const alt = copy(item.alt, locale) || caption;
          return (
            <figure key={item.id} className="pub-gallery__item">
              <Image
                src={item.url}
                alt={alt}
                width={800}
                height={600}
                sizes="(max-width: 768px) 100vw, 50vw"
                className="pub-gallery__img"
                loading="lazy"
                unoptimized={!isOptimizablePublicImageUrl(item.url)}
              />
              {caption ? <figcaption>{caption}</figcaption> : null}
            </figure>
          );
        })}
      </div>
    </SectionShell>
  );
}
