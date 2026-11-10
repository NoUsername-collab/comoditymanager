"use client";

import { useTranslations } from "next-intl";
import { MEDIA_ALBUMS, type MediaAlbum } from "@/domain/media/types";
import {
  concreteGalleryLayout,
  GALLERY_LIMITS,
  readGalleryAlbums,
  readGalleryLayout,
  readGalleryLimit,
} from "@/features/public-site/domain/gallery";
import { GALLERY_LAYOUTS } from "@/features/public-site/domain/types";
import { EditorField, usePublicSiteEditor } from "@/features/public-site/editor/ui/PublicSiteEditorKit";
import {
  useSectionEditing,
  type SectionEditorProps,
} from "@/features/public-site/editor/ui/section-editing";
import { MediaLibrary } from "@/features/settings/ui/MediaLibrary";

/**
 * A gallery is a view of the photo library: which albums, laid out how, and
 * how many first. The photos themselves are added right here, into the
 * library, and show in the preview at once.
 */
export function GalleryEditor({ section }: SectionEditorProps) {
  const te = useTranslations("admin.pages.publicSite.editor");
  const tp = useTranslations("admin.pages.settings.photos");
  const { draft, library, setLibrary, roomTypes } = usePublicSiteEditor();
  const ed = useSectionEditing(section);

  const albums = readGalleryAlbums(ed.setting("albums").split(",").filter(Boolean));
  const layout = readGalleryLayout(ed.setting("layout"));
  const limit = readGalleryLimit(ed.setting("limit"));
  const count = (album: MediaAlbum) => library.filter((photo) => photo.album === album).length;
  const shown = library.filter((photo) => albums.length === 0 || albums.includes(photo.album)).length;

  function toggleAlbum(album: MediaAlbum) {
    const next = albums.includes(album) ? albums.filter((a) => a !== album) : [...albums, album];
    ed.setSetting("albums")(MEDIA_ALBUMS.filter((a) => next.includes(a)).join(","));
  }

  return (
    <>
      <div className="admin-settings-fields">
        <EditorField label={te("sectionTitle")} value={ed.field("title")} onChange={ed.setField("title")} />
        <EditorField rows={2} label={te("sectionLead")} value={ed.field("lead")} onChange={ed.setField("lead")} />
      </div>

      <fieldset className="gallery-editor__group">
        <legend>{te("galleryAlbums")}</legend>
        <p className="gallery-editor__hint">
          {albums.length === 0 ? te("galleryAllAlbums", { count: shown }) : te("gallerySomeAlbums", { count: shown })}
        </p>
        <div className="gallery-editor__albums">
          {MEDIA_ALBUMS.map((album) => (
            <label key={album} className="gallery-editor__album" data-checked={albums.includes(album) ? "1" : undefined}>
              <input type="checkbox" checked={albums.includes(album)} onChange={() => toggleAlbum(album)} />
              {tp(`album.${album}`)} <span>{count(album)}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="gallery-editor__group">
        <legend>{te("galleryLayout")}</legend>
        <div className="gallery-editor__layouts" role="radiogroup" aria-label={te("galleryLayout")}>
          {GALLERY_LAYOUTS.map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={layout === option}
              className="gallery-editor__layout"
              onClick={() => ed.setSetting("layout")(option)}
            >
              <span className={`gallery-editor__pic gallery-editor__pic--${concreteGalleryLayout(option, draft.templateId)}`} aria-hidden>
                <i />
                <i />
                <i />
                <i />
              </span>
              <span>
                {option === "auto"
                  ? te("galleryLayoutAuto", { layout: te(`galleryLayouts.${concreteGalleryLayout("auto", draft.templateId)}`) })
                  : te(`galleryLayouts.${option}`)}
              </span>
            </button>
          ))}
        </div>
      </fieldset>

      <label className="gallery-editor__limit">
        <span>{te("galleryLimit")}</span>
        <select value={limit} onChange={(e) => ed.setSetting("limit")(e.target.value)}>
          {GALLERY_LIMITS.map((n) => (
            <option key={n} value={n}>
              {n === 0 ? te("galleryLimitAll") : te("galleryLimitN", { count: n })}
            </option>
          ))}
        </select>
      </label>

      <fieldset className="gallery-editor__group">
        <legend>{te("galleryPhotos")}</legend>
        <MediaLibrary
          initial={library}
          roomTypes={roomTypes}
          initialAlbum={albums[0] ?? null}
          onChange={setLibrary}
        />
      </fieldset>
    </>
  );
}
