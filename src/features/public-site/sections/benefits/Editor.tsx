"use client";

import { useTranslations } from "next-intl";
import { PUBLIC_BENEFIT_ICON_IDS } from "@/features/public-site/domain/benefit-icons";
import { EditorField } from "@/features/public-site/editor/ui/PublicSiteEditorKit";
import {
  SectionItemList,
  useSectionEditing,
  type SectionEditorProps,
} from "@/features/public-site/editor/ui/section-editing";

export function BenefitsEditor({ section }: SectionEditorProps) {
  const t = useTranslations("admin.pages.publicSite");
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
        itemLabel={(index) => te("benefitNumber", { index: index + 1 })}
        addLabel={te("addBenefit")}
        renderItem={(item) => (
          <div className="admin-settings-fields admin-settings-fields--2col">
            <label>
              <span>{te("icon")}</span>
              <select
                value={item.structure.icon}
                onChange={(e) => ed.setItemStructure(item.id, { icon: e.target.value })}
              >
                {PUBLIC_BENEFIT_ICON_IDS.map((icon) => (
                  <option key={icon} value={icon}>
                    {t(`benefitIcons.${icon}`)}
                  </option>
                ))}
              </select>
            </label>
            <EditorField
              label={te("itemTitle")}
              value={ed.itemField(item.id, "title")}
              onChange={ed.setItemField(item.id, "title")}
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
