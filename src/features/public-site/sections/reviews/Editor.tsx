"use client";

import { useTranslations } from "next-intl";
import { EditorField } from "@/features/public-site/editor/ui/PublicSiteEditorKit";
import {
  SectionItemList,
  useSectionEditing,
  type SectionEditorProps,
} from "@/features/public-site/editor/ui/section-editing";

export function ReviewsEditor({ section }: SectionEditorProps) {
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
        itemLabel={(index) => te("reviewNumber", { index: index + 1 })}
        addLabel={te("addReview")}
        renderItem={(item) => (
          <div className="admin-settings-fields admin-settings-fields--2col">
            <EditorField
              full
              rows={3}
              label={te("reviewQuote")}
              value={ed.itemField(item.id, "quote")}
              onChange={ed.setItemField(item.id, "quote")}
            />
            <EditorField
              label={te("reviewAuthor")}
              value={ed.itemField(item.id, "author")}
              placeholder={te("reviewAuthorPlaceholder")}
              onChange={ed.setItemField(item.id, "author")}
            />
            <label>
              <span>{te("reviewRating")}</span>
              <select
                value={item.structure.rating ?? "5"}
                onChange={(e) => ed.setItemStructure(item.id, { rating: e.target.value })}
              >
                {["5", "4", "3", "2", "1"].map((stars) => (
                  <option key={stars} value={stars}>
                    {"★".repeat(Number(stars))}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
      />
    </>
  );
}
