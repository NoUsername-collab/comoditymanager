"use client";

import { useTranslations } from "next-intl";
import { EditorField } from "@/features/public-site/editor/ui/PublicSiteEditorKit";
import {
  useSectionEditing,
  type SectionEditorProps,
} from "@/features/public-site/editor/ui/section-editing";

export function TextEditor({ section }: SectionEditorProps) {
  const te = useTranslations("admin.pages.publicSite.editor");
  const ed = useSectionEditing(section);
  return (
    <>
      <div className="admin-settings-fields">
        <EditorField label={te("sectionTitle")} value={ed.field("title")} onChange={ed.setField("title")} />
        <EditorField
          rows={2}
          label={te("sectionLead")}
          value={ed.field("lead")}
          onChange={ed.setField("lead")}
        />
        <EditorField
          rows={6}
          label={te("textBody")}
          value={ed.field("body")}
          onChange={ed.setField("body")}
          hint={te("textBodyHint")}
        />
      </div>
      <button type="button" className="pub-editor-item__remove" onClick={ed.removeSection}>
        {te("removeText")}
      </button>
    </>
  );
}
