"use client";

import { useTranslations } from "next-intl";
import { EditorField } from "@/features/public-site/editor/ui/PublicSiteEditorKit";
import {
  SectionItemList,
  useSectionEditing,
  type SectionEditorProps,
} from "@/features/public-site/editor/ui/section-editing";

export function AttractionsEditor({ section }: SectionEditorProps) {
  const te = useTranslations("admin.pages.publicSite.editor");
  const ed = useSectionEditing(section);
  return (
    <>
      <div className="admin-settings-fields">
        <EditorField label={te("sectionTitle")} value={ed.field("title")} onChange={ed.setField("title")} />
        <EditorField rows={2} label={te("sectionLead")} value={ed.field("lead")} onChange={ed.setField("lead")} />
      </div>
      <SectionItemList
        section={section}
        editing={ed}
        itemLabel={(index) => te("attractionNumber", { index: index + 1 })}
        addLabel={te("addAttraction")}
        renderItem={(item) => (
          <div className="admin-settings-fields admin-settings-fields--2col">
            <EditorField
              label={te("attractionName")}
              value={ed.itemField(item.id, "name")}
              placeholder={te("attractionNamePlaceholder")}
              onChange={ed.setItemField(item.id, "name")}
            />
            <EditorField
              label={te("attractionDistance")}
              value={item.structure.distance ?? ""}
              placeholder={te("attractionDistancePlaceholder")}
              onChange={(distance) => ed.setItemStructure(item.id, { distance })}
            />
            <EditorField
              full
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
