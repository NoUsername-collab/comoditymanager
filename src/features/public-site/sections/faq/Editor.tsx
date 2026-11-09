"use client";

import { useTranslations } from "next-intl";
import { EditorField } from "@/features/public-site/editor/ui/PublicSiteEditorKit";
import { RichTextField } from "@/features/public-site/editor/ui/RichTextField";
import {
  SectionItemList,
  useSectionEditing,
  type SectionEditorProps,
} from "@/features/public-site/editor/ui/section-editing";

export function FaqEditor({ section }: SectionEditorProps) {
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
        itemLabel={(index) => te("faqNumber", { index: index + 1 })}
        addLabel={te("addFaq")}
        renderItem={(item) => (
          <div className="admin-settings-fields">
            <EditorField
              label={te("faqQuestion")}
              value={ed.itemField(item.id, "question")}
              placeholder={te("faqQuestionPlaceholder")}
              onChange={ed.setItemField(item.id, "question")}
            />
            <RichTextField
              rows={3}
              label={te("faqAnswer")}
              value={ed.itemField(item.id, "answer")}
              onChange={ed.setItemField(item.id, "answer")}
            />
          </div>
        )}
      />
    </>
  );
}
