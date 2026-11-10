"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { isOptimizablePublicImageUrl } from "@/domain/public-site/media";
import type { GalleryLayout } from "@/features/public-site/domain/types";

export type GalleryPhoto = {
  id: string;
  url: string;
  album: string;
  /** What the photo shows, in the page's language; also its caption when enlarged. */
  alt: string;
  focus: string;
};

/**
 * A gallery of library photos: laid out as chosen, filtered by album when it
 * holds several, the first few shown with "see all" for the rest, and every
 * photo enlarged on a tap, with arrows, swipe and Escape.
 */
export function PublicGallery({
  photos,
  layout,
  limit,
  categories,
  preview = false,
}: {
  photos: GalleryPhoto[];
  layout: Exclude<GalleryLayout, "auto">;
  /** Photos shown before "see all"; 0 = all. */
  limit: number;
  /** Albums with photos, for the filter; one or none hides it. */
  categories: string[];
  preview?: boolean;
}) {
  const t = useTranslations("public.gallery");
  const [category, setCategory] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [open, setOpen] = useState<number | null>(null);
  const [featured, setFeatured] = useState(0);

  const shown = category ? photos.filter((photo) => photo.album === category) : photos;
  // The carousel scrolls through everything; the other layouts show the first few.
  const capped = layout !== "carousel" && limit > 0 && !expanded ? shown.slice(0, limit) : shown;
  const hidden = shown.length - capped.length;

  return (
    <div className={`pub-gal pub-gal--${layout}`}>
      {categories.length > 1 ? (
        <div className="pub-gal__filter" role="tablist" aria-label={t("filter")}>
          {[
            { id: null as string | null, label: t("all") },
            ...categories.map((album) => ({ id: album as string | null, label: t(`albums.${album}`) })),
          ].map((c) => (
            <button
              key={c.id ?? "all"}
              type="button"
              role="tab"
              aria-selected={category === c.id}
              onClick={() => {
                setCategory(c.id);
                setFeatured(0);
              }}
            >
              {c.label}
            </button>
          ))}
        </div>
      ) : null}

      {layout === "feature" && capped.length > 0 ? (
        <div className="pub-gal__feature">
          <button type="button" className="pub-gal__big" onClick={() => setOpen(featured)} aria-label={t("enlarge")}>
            <Photo photo={capped[Math.min(featured, capped.length - 1)]!} sizes="(max-width: 900px) 100vw, 70vw" eager />
          </button>
          <ul className="pub-gal__thumbs">
            {capped.map((photo, index) => (
              <li key={photo.id}>
                <button
                  type="button"
                  aria-pressed={index === featured}
                  aria-label={photo.alt || t("photo", { index: index + 1 })}
                  onClick={() => setFeatured(index)}
                >
                  <Photo photo={photo} sizes="120px" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <ul className="pub-gal__list">
          {capped.map((photo, index) => (
            <li key={photo.id} className="pub-gal__item">
              <button type="button" onClick={() => setOpen(index)} aria-label={photo.alt || t("photo", { index: index + 1 })}>
                <Photo photo={photo} sizes={layout === "carousel" ? "(max-width: 700px) 85vw, 40vw" : "(max-width: 768px) 50vw, 33vw"} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {hidden > 0 ? (
        <button type="button" className="pub-gal__more" onClick={() => setExpanded(true)}>
          {t("seeAll", { count: shown.length })}
        </button>
      ) : null}

      {open !== null && !preview ? (
        <Lightbox photos={shown} start={open} onClose={() => setOpen(null)} />
      ) : null}
    </div>
  );
}

function Photo({ photo, sizes, eager = false }: { photo: GalleryPhoto; sizes: string; eager?: boolean }) {
  return (
    <Image
      src={photo.url}
      alt={photo.alt}
      fill
      sizes={sizes}
      loading={eager ? "eager" : "lazy"}
      style={{ objectFit: "cover", objectPosition: photo.focus }}
      unoptimized={!isOptimizablePublicImageUrl(photo.url)}
    />
  );
}

/** The photos full screen: arrows and swipe to move, Escape or the cross to close. */
function Lightbox({ photos, start, onClose }: { photos: GalleryPhoto[]; start: number; onClose: () => void }) {
  const t = useTranslations("public.gallery");
  const [index, setIndex] = useState(start);
  const dialog = useRef<HTMLDivElement>(null);
  const touch = useRef<number | null>(null);
  const photo = photos[index]!;
  const go = (step: number) => setIndex((i) => (i + step + photos.length) % photos.length);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.focus();
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);

  return (
    <div
      ref={dialog}
      className="pub-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={t("viewer")}
      tabIndex={-1}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
        if (e.key === "ArrowRight") go(1);
        if (e.key === "ArrowLeft") go(-1);
      }}
      onTouchStart={(e) => {
        touch.current = e.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(e) => {
        const from = touch.current;
        const to = e.changedTouches[0]?.clientX;
        touch.current = null;
        if (from == null || to == null || Math.abs(to - from) < 40) return;
        go(to < from ? 1 : -1);
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <figure className="pub-lightbox__figure">
        <div className="pub-lightbox__frame">
          <Image
            key={photo.id}
            src={photo.url}
            alt={photo.alt}
            fill
            sizes="100vw"
            priority
            style={{ objectFit: "contain" }}
            unoptimized={!isOptimizablePublicImageUrl(photo.url)}
          />
        </div>
        <figcaption>
          {photo.alt ? <span>{photo.alt}</span> : null}
          <span className="pub-lightbox__count">{t("count", { index: index + 1, total: photos.length })}</span>
        </figcaption>
      </figure>
      {photos.length > 1 ? (
        <>
          <button type="button" className="pub-lightbox__nav pub-lightbox__nav--prev" onClick={() => go(-1)} aria-label={t("previous")}>
            ‹
          </button>
          <button type="button" className="pub-lightbox__nav pub-lightbox__nav--next" onClick={() => go(1)} aria-label={t("next")}>
            ›
          </button>
        </>
      ) : null}
      <button type="button" className="pub-lightbox__close" onClick={onClose} aria-label={t("close")}>
        ×
      </button>
    </div>
  );
}
