import Image from "next/image";
import type { ReactNode } from "react";
import { isOptimizablePublicImageUrl } from "@/domain/public-site/media";
import type { LocalizedText } from "@/features/public-site/domain/types";
import { copy } from "@/features/public-site/sections/shell";

/*
 * An optional photo beside a text section ("About us", free texts). The data
 * is the same in every layout; each layout sets it out its own way in CSS:
 * beside the words (Classic), alternating sides (Magazine), or as a
 * full-width band (Panoramic).
 */

/** Words and, when there is a photo, the photo beside them. */
export function WithSectionPhoto({
  imageUrl,
  imageAlt,
  locale,
  children,
}: {
  imageUrl?: string;
  imageAlt?: LocalizedText;
  locale: string;
  children: ReactNode;
}) {
  const url = imageUrl?.trim();
  if (!url) return <>{children}</>;
  return (
    <div className="pub-split">
      <figure className="pub-split__photo">
        <Image
          src={url}
          alt={copy(imageAlt, locale)}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          unoptimized={!isOptimizablePublicImageUrl(url)}
        />
      </figure>
      <div className="pub-split__copy">{children}</div>
    </div>
  );
}

/** The section's class with the photo marker, for the layouts to place it. */
export function withPhotoClass(className: string, imageUrl: string | undefined): string {
  return imageUrl?.trim() ? `${className} pub-section--with-photo` : className;
}
