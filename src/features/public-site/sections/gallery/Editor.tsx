"use client";

import { useTranslations } from "next-intl";
import { PublicSiteImageField } from "@/features/public-site/editor/ui/PublicSiteImageField";
import { EditorAdvanced, EditorField } from "@/features/public-site/editor/ui/PublicSiteEditorKit";
import {
  SectionItemList,
  useSectionEditing,
  type SectionEditorProps,
} from "@/features/public-site/editor/ui/section-editing";

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
        movable
        addLabel={t("galleryAddPhoto")}
        removeLabel={t("galleryRemove")}
        empty={<p className="pub-gallery-editor__empty">{te("galleryEmpty")}</p>}
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
