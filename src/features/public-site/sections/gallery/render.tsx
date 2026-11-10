import type { ReactNode } from "react";
import type { PublicSiteSectionOf } from "@/features/public-site/domain/types";
import {
  concreteGalleryLayout,
  galleryCategories,
  galleryPhotos,
  readGalleryAlbums,
  readGalleryLayout,
  readGalleryLimit,
} from "@/features/public-site/domain/gallery";
import type { SectionRenderContext } from "@/features/public-site/sections/render-context";
import { copy, SectionHead, SectionShell } from "@/features/public-site/sections/shell";
import { PublicGallery } from "@/features/public-site/sections/gallery/PublicGallery";

/** Null when the chosen albums have no photos, so the page leaves no empty wrapper. */
export function renderGallery(
  section: PublicSiteSectionOf<"gallery">,
  ctx: SectionRenderContext,
): ReactNode {
  const photos = galleryPhotos(ctx.config.media, readGalleryAlbums(section.payload.albums));
  if (photos.length === 0) return null;
  const layout = concreteGalleryLayout(readGalleryLayout(section.payload.layout), ctx.template);

  return (
    <SectionShell
      className={["pub-section--gallery", layout === "carousel" ? "pub-section--gallery-bleed" : ""]
        .filter(Boolean)
        .join(" ")}
    >
      <SectionHead title={copy(section.payload.title, ctx.locale)} lead={copy(section.payload.lead, ctx.locale)} />
      <PublicGallery
        photos={photos.map((photo) => ({
          id: photo.id,
          url: photo.url,
          album: photo.album,
          alt: copy(photo.alt, ctx.locale) || copy(photo.alt, "ro") || copy(photo.alt, "en"),
          focus: photo.focus,
        }))}
        layout={layout}
        limit={readGalleryLimit(section.payload.limit)}
        categories={galleryCategories(photos)}
        preview={ctx.preview}
      />
    </SectionShell>
  );
}
