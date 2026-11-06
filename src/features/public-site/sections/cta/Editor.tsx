"use client";

import { useTranslations } from "next-intl";
import { EditorField, EditorLinkPicker } from "@/features/public-site/editor/ui/PublicSiteEditorKit";
import {
  useSectionEditing,
  type SectionEditorProps,
} from "@/features/public-site/editor/ui/section-editing";

export function CtaEditor({ section }: SectionEditorProps) {
  const te = useTranslations("admin.pages.publicSite.editor");
  const ed = useSectionEditing(section);
  return (
    <div className="admin-settings-fields admin-settings-fields--2col">
      <EditorField full label={te("sectionTitle")} value={ed.field("title")} onChange={ed.setField("title")} />
      <EditorField
        full
        rows={2}
        label={te("sectionLead")}
        value={ed.field("lead")}
        onChange={ed.setField("lead")}
      />
      <EditorField label={te("buttonText")} value={ed.field("ctaLabel")} onChange={ed.setField("ctaLabel")} />
      <EditorLinkPicker
        label={te("buttonGoesTo")}
        value={ed.setting("ctaHref")}
        onChange={ed.setSetting("ctaHref")}
      />
    </div>
  );
}
