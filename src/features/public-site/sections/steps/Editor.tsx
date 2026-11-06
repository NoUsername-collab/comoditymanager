"use client";

import { useTranslations } from "next-intl";
import { EditorField } from "@/features/public-site/editor/ui/PublicSiteEditorKit";
import {
  SectionItemList,
  useSectionEditing,
  type SectionEditorProps,
} from "@/features/public-site/editor/ui/section-editing";

export function StepsEditor({ section }: SectionEditorProps) {
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
      </div>
      <SectionItemList
        section={section}
        editing={ed}
        itemLabel={(index) => te("stepNumber", { index: index + 1 })}
        addLabel={te("addStep")}
        renderItem={(item) => (
          <div className="admin-settings-fields">
            <EditorField
              label={te("itemTitle")}
              value={ed.itemField(item.id, "title")}
              onChange={ed.setItemField(item.id, "title")}
            />
            <EditorField
              rows={2}
              label={te("itemText")}
              value={ed.itemField(item.id, "text")}
              onChange={ed.setItemField(item.id, "text")}
            />
          </div>
        )}
      />
    </>
  );
}
