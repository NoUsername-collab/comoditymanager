"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { PublicSiteImageField } from "@/features/public-site/editor/ui/PublicSiteImageField";
import { EditorAdvanced, EditorField } from "@/features/public-site/editor/ui/PublicSiteEditorKit";
import {
  SectionItemList,
  useSectionEditing,
  type SectionEditorProps,
} from "@/features/public-site/editor/ui/section-editing";
import {
  isAcceptedImage,
  PUBLIC_IMAGE_ACCEPT,
  uploadPublicImage,
} from "@/features/public-site/editor/ui/upload-public-image";
import { sectionKind } from "@/features/public-site/sections/kinds";

export function GalleryEditor({ section }: SectionEditorProps) {
  const t = useTranslations("admin.pages.publicSite");
  const te = useTranslations("admin.pages.publicSite.editor");
  const ed = useSectionEditing(section);

  return (
    <>
      <div className="admin-settings-fields">
        <EditorField label={te("sectionTitle")} value={ed.field("title")} onChange={ed.setField("title")} />
      </div>
      <SectionItemList
        section={section}
        editing={ed}
        itemLabel={(index) => t("galleryPhotoLabel", { index: index + 1 })}
        addLabel={t("galleryAddPhoto")}
        removeLabel={t("galleryRemove")}
        empty={<p className="pub-gallery-editor__empty">{te("galleryEmpty")}</p>}
        addControl={
          <GalleryUpload
            room={(sectionKind(section.type).items?.max ?? 0) - section.items.length}
            disabled={ed.readOnly}
            onUploaded={(url) => {
              ed.addItem({ url });
              // The first photos of a hidden, empty gallery are meant to be seen.
              if (!section.visible && section.items.length === 0) ed.setVisible(true);
            }}
          />
        }
        renderItem={(item, index) => (
          <>
            <PublicSiteImageField
              kind="gallery"
              label={t("galleryPhotoLabel", { index: index + 1 })}
              value={item.structure.url ?? ""}
              onChange={(url) => ed.setItemStructure(item.id, { url })}
              disabled={ed.readOnly}
            />
            <EditorField
              label={te("photoCaption")}
              value={ed.itemField(item.id, "caption")}
              onChange={ed.setItemField(item.id, "caption")}
            />
            <EditorField
              label={te("photoAlt")}
              value={ed.itemField(item.id, "alt")}
              placeholder={ed.itemField(item.id, "caption")}
              onChange={ed.setItemField(item.id, "alt")}
              hint={te("photoAltHint")}
            />
          </>
        )}
      />
      <EditorAdvanced>
        <div className="admin-settings-fields">
          <EditorField
            rows={2}
            label={te("sectionLead")}
            value={ed.field("lead")}
            onChange={ed.setField("lead")}
          />
        </div>
      </EditorAdvanced>
    </>
  );
}

/**
 * Add several photos at once: pick them, or drop them on the box. They upload
 * one after another and join the gallery in the order chosen.
 */
function GalleryUpload({
  room,
  disabled,
  onUploaded,
}: {
  /** How many more photos the gallery takes. */
  room: number;
  disabled: boolean;
  onUploaded: (url: string) => void;
}) {
  const t = useTranslations("admin.pages.publicSite");
  const te = useTranslations("admin.pages.publicSite.editor");
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [over, setOver] = useState(false);
  const busy = progress !== null;

  async function upload(files: File[]) {
    if (disabled || busy) return;
    const images = files.filter(isAcceptedImage);
    const skipped = files.length - images.length;
    const batch = images.slice(0, Math.max(0, room));
    const failures: string[] = [];
    if (skipped > 0) failures.push(te("photosNotImages", { count: skipped }));
    if (images.length > batch.length) {
      failures.push(te("photosOverLimit", { count: images.length - batch.length }));
    }
    setErrors([]);
    setProgress({ done: 0, total: batch.length });
    for (const [index, file] of batch.entries()) {
      const result = await uploadPublicImage(file, "gallery", t("mediaTooLarge"));
      if (result.ok) onUploaded(result.url);
      else failures.push(`${file.name}: ${result.error}`);
      setProgress({ done: index + 1, total: batch.length });
    }
    setProgress(null);
    setErrors(failures);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div
      className="pub-gallery-upload"
      data-over={over ? "1" : undefined}
      onDragOver={(event) => {
        if (disabled || busy || !event.dataTransfer.types.includes("Files")) return;
        event.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setOver(false);
        void upload(Array.from(event.dataTransfer.files));
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={PUBLIC_IMAGE_ACCEPT}
        multiple
        hidden
        disabled={disabled || busy || room <= 0}
        onChange={(event) => void upload(Array.from(event.target.files ?? []))}
      />
      <button
        type="button"
        className="pub-gallery-upload__button"
        disabled={disabled || busy || room <= 0}
        onClick={() => inputRef.current?.click()}
      >
        {busy
          ? te("photosUploading", { done: progress.done, total: progress.total })
          : te("addPhotos")}
      </button>
      <span className="pub-gallery-upload__hint">
        {room <= 0 ? te("photosFull") : te("dropPhotos")}
      </span>
      {errors.length > 0 ? (
        <ul className="pub-gallery-upload__errors" role="alert">
          {errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
