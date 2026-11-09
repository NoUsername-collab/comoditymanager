import type { ReactNode } from "react";
import type { PublicSiteSectionOf } from "@/features/public-site/domain/types";
import { videoEmbedUrl } from "@/features/public-site/domain/video";
import { copy, SectionHead, SectionShell } from "@/features/public-site/sections/shell";

/** Null without a YouTube or Vimeo address, so the page leaves no empty wrapper. */
export function renderVideo(section: PublicSiteSectionOf<"video">, locale: string): ReactNode {
  const embed = videoEmbedUrl(section.payload.url);
  if (!embed) return null;
  const title = copy(section.payload.title, locale);
  const lead = copy(section.payload.lead, locale);
  return (
    <SectionShell className="pub-section--video">
      <SectionHead title={title} lead={lead} />
      <div className="pub-video">
        <iframe
          src={embed}
          title={title || "Video"}
          loading="lazy"
          allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    </SectionShell>
  );
}
