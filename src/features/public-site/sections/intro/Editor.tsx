"use client";

import { useTranslations } from "next-intl";
import { EditorField } from "@/features/public-site/editor/ui/PublicSiteEditorKit";
import { SectionPhotoField } from "@/features/public-site/editor/ui/SectionPhotoField";
import {
  useSectionEditing,
  type SectionEditorProps,
} from "@/features/public-site/editor/ui/section-editing";

export function IntroEditor({ section }: SectionEditorProps) {
  const te = useTranslations("admin.pages.publicSite.editor");
  const ed = useSectionEditing(section);
  return (
    <div className="admin-settings-fields">
      <EditorField label={te("sectionTitle")} value={ed.field("title")} onChange={ed.setField("title")} />
      <EditorField
        rows={4}
        label={te("introText")}
        value={ed.field("lead")}
        onChange={ed.setField("lead")}
        hint={te("introTextHint")}
      />
      <SectionPhotoField editing={ed} />
    </div>
  );
}
