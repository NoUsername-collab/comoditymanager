"use client";

import { useTranslations } from "next-intl";
import { EditorField } from "@/features/public-site/editor/ui/PublicSiteEditorKit";
import { PublicSiteImageField } from "@/features/public-site/editor/ui/PublicSiteImageField";
import type { SectionEditing } from "@/features/public-site/editor/ui/section-editing";

/** The optional photo of a text section, and what it shows once there is one. */
export function SectionPhotoField({ editing }: { editing: SectionEditing }) {
  const te = useTranslations("admin.pages.publicSite.editor");
  const url = editing.setting("imageUrl");
  return (
    <>
      <PublicSiteImageField
        kind="section"
        label={te("sectionPhoto")}
        hint={te("sectionPhotoHint")}
        value={url}
        onChange={editing.setSetting("imageUrl")}
        disabled={editing.readOnly}
      />
      {url.trim() ? (
        <EditorField
          label={te("heroImageAlt")}
          value={editing.field("imageAlt")}
          onChange={editing.setField("imageAlt")}
          hint={te("heroImageAltHint")}
        />
      ) : null}
    </>
  );
}
