"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { SettingsFieldHint } from "@/components/admin/settings/SettingsFieldHint";
import {
  EditorField,
  EditorToggle,
  usePublicSiteEditor,
} from "@/features/public-site/editor/ui/PublicSiteEditorKit";
import { PublicSiteImageField } from "@/features/public-site/editor/ui/PublicSiteImageField";
import {
  useSectionEditing,
  type SectionEditorProps,
} from "@/features/public-site/editor/ui/section-editing";

/**
 * The rooms come from the room settings (name, guests, price); here each one
 * gets a photo and a few words. A room's row is made the first time it is given
 * either, under the room type's id.
 */
export function StaysEditor({ section }: SectionEditorProps) {
  const te = useTranslations("admin.pages.publicSite.editor");
  const th = useTranslations("public.home");
  const { config, readOnly } = usePublicSiteEditor();
  const ed = useSectionEditing(section);
  const has = (id: string) => section.items.some((item) => item.id === id);

  function setPhoto(id: string, imageUrl: string) {
    if (has(id)) ed.setItemStructure(id, { imageUrl });
    else ed.addItem({ imageUrl }, id);
  }

  function setText(id: string, text: string) {
    if (!has(id)) ed.addItem({}, id);
    ed.setItemField(id, "text")(text);
  }

  return (
    <>
      <div className="admin-settings-fields">
        <EditorField
          label={te("sectionTitle")}
          value={ed.field("title")}
          placeholder={th("roomsTitle")}
          onChange={ed.setField("title")}
        />
        <EditorField
          rows={2}
          label={te("sectionLead")}
          value={ed.field("lead")}
          placeholder={th("roomsLead")}
          onChange={ed.setField("lead")}
        />
        <EditorToggle
          label={te("stayPrices")}
          checked={ed.setting("showPrices") !== "0"}
          onChange={(show) => ed.setSetting("showPrices")(show ? "1" : "0")}
        />
      </div>

      {config.stayOffers.length > 0 ? (
        <ol className="pub-editor-items">
          {config.stayOffers.map((offer) => {
            const item = section.items.find((row) => row.id === offer.id);
            return (
              <li key={offer.id} className="pub-editor-item" data-edit-key={offer.id}>
                <div className="pub-editor-item__head">
                  <strong>{offer.name}</strong>
                  <span className="pub-editor-item__meta">
                    {th("roomsCapacity", { count: offer.capacity })}
                  </span>
                </div>
                <div className="admin-settings-fields admin-settings-fields--2col">
                  <div className="admin-settings-fields__full">
                    <PublicSiteImageField
                      kind="room"
                      label={te("roomPhoto")}
                      value={item?.structure.imageUrl ?? ""}
                      onChange={(url) => setPhoto(offer.id, url)}
                      disabled={readOnly}
                    />
                  </div>
                  <EditorField
                    full
                    rows={3}
                    label={te("roomText")}
                    value={item ? ed.itemField(offer.id, "text") : ""}
                    placeholder={te("roomTextPlaceholder")}
                    onChange={(text) => setText(offer.id, text)}
                  />
                </div>
              </li>
            );
          })}
        </ol>
      ) : null}

      <SettingsFieldHint className="mt-2 block">
        {te("staysHint")}{" "}
        <Link href="/admin/rooms" className="underline">
          {te("openRooms")}
        </Link>
      </SettingsFieldHint>
    </>
  );
}
