"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { PUBLIC_BENEFIT_ICON_IDS } from "@/features/public-site/domain/benefit-icons";
import { PUBLIC_LOCALES } from "@/features/public-site/domain/types";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { SettingsFieldHint } from "@/components/admin/settings/SettingsFieldHint";
import { PublicSiteImageField } from "@/features/settings/ui/PublicSiteImageField";
import {
  EditorAdvanced,
  EditorField,
  EditorLinkPicker,
  EditorToggle,
  usePublicSiteEditor,
} from "@/features/settings/ui/PublicSiteEditorKit";
import {
  addStudioBenefit,
  addStudioStep,
  MAX_BENEFIT_ITEMS,
  MAX_STEP_ITEMS,
  nextGalleryDraftId,
  patchStudioCopy,
  removeStudioBenefit,
  removeStudioStep,
  removeStudioTextSection,
  syncStudioStructure,
  type CopyLineDraft,
  type StepLineDraft,
  type TextLineDraft,
} from "@/features/settings/ui/public-site-studio-draft";

export function HeroEditor() {
  const t = useTranslations("admin.pages.publicSite");
  const te = useTranslations("admin.pages.publicSite.editor");
  const { config, draft, copy, patchDraft, patchCopy, fieldError, readOnly } =
    usePublicSiteEditor();

  return (
    <div className="admin-settings-fields admin-settings-fields--2col">
      <div className="admin-settings-fields__full">
        <PublicSiteImageField
          kind="hero"
          label={te("heroImage")}
          value={draft.heroImageUrl}
          onChange={(url) => patchDraft({ heroImageUrl: url })}
          hint={te("heroImageHint")}
          error={fieldError("hero.imageUrl")}
          disabled={readOnly}
        />
      </div>
      <EditorField
        full
        label={te("heroTitle")}
        value={copy.heroTitle}
        placeholder={config.displayName}
        onChange={(heroTitle) => patchCopy({ heroTitle })}
        hint={te("heroTitleHint")}
        error={fieldError("hero.title")}
      />
      <EditorField
        full
        rows={2}
        label={te("heroSubtitle")}
        value={copy.heroSubtitle}
        onChange={(heroSubtitle) => patchCopy({ heroSubtitle })}
        hint={te("heroSubtitleHint")}
      />
      <EditorField
        label={te("heroCtaPrimary")}
        value={copy.heroCtaPrimary}
        onChange={(heroCtaPrimary) => patchCopy({ heroCtaPrimary })}
      />
      <EditorLinkPicker
        label={te("buttonGoesTo")}
        value={draft.heroCtaPrimaryHref}
        onChange={(heroCtaPrimaryHref) => patchDraft({ heroCtaPrimaryHref })}
      />
      <div className="admin-settings-fields__full">
        <EditorAdvanced>
          <div className="admin-settings-fields admin-settings-fields--2col">
            <EditorField
              label={te("heroCtaSecondary")}
              value={copy.heroCtaSecondary}
              onChange={(heroCtaSecondary) => patchCopy({ heroCtaSecondary })}
              hint={te("heroCtaSecondaryHint")}
            />
            <EditorLinkPicker
              label={te("buttonGoesTo")}
              value={draft.heroCtaSecondaryHref}
              onChange={(heroCtaSecondaryHref) => patchDraft({ heroCtaSecondaryHref })}
            />
            <EditorField
              label={te("heroBadge")}
              value={copy.heroBadge}
              onChange={(heroBadge) => patchCopy({ heroBadge })}
            />
            <EditorField
              label={te("heroTagline")}
              value={copy.heroTagline}
              onChange={(heroTagline) => patchCopy({ heroTagline })}
            />
            <div className="admin-settings-fields__full">
              <EditorToggle
                label={t("showCheckTimes")}
                checked={draft.showCheckTimes}
                onChange={(showCheckTimes) => patchDraft({ showCheckTimes })}
              />
            </div>
          </div>
        </EditorAdvanced>
      </div>
    </div>
  );
}

export function IntroEditor() {
  const te = useTranslations("admin.pages.publicSite.editor");
  const { copy, patchCopy } = usePublicSiteEditor();
  return (
    <div className="admin-settings-fields">
      <EditorField
        label={te("sectionTitle")}
        value={copy.introTitle}
        onChange={(introTitle) => patchCopy({ introTitle })}
      />
      <EditorField
        rows={4}
        label={te("introText")}
        value={copy.introLead}
        onChange={(introLead) => patchCopy({ introLead })}
        hint={te("introTextHint")}
      />
    </div>
  );
}

export function BenefitsEditor() {
  const t = useTranslations("admin.pages.publicSite");
  const te = useTranslations("admin.pages.publicSite.editor");
  const { copy, patchCopy, setDraft } = usePublicSiteEditor();

  function updateItem(index: number, patch: Partial<CopyLineDraft>) {
    setDraft((d) => {
      const next = patchStudioCopy(d, {
        benefitItems: d.copies[d.editLocale].benefitItems.map((item, i) =>
          i === index ? { ...item, ...patch } : item,
        ),
      });
      return patch.icon !== undefined ? syncStudioStructure(next) : next;
    });
  }

  return (
    <>
      <div className="admin-settings-fields">
        <EditorField
          label={te("sectionTitle")}
          value={copy.benefitsTitle}
          onChange={(benefitsTitle) => patchCopy({ benefitsTitle })}
        />
        <EditorField
          rows={2}
          label={te("sectionLead")}
          value={copy.benefitsLead}
          onChange={(benefitsLead) => patchCopy({ benefitsLead })}
        />
      </div>
      <ol className="pub-editor-items">
        {copy.benefitItems.map((item, index) => (
          <li key={`benefit-${index}`} className="pub-editor-item">
            <div className="pub-editor-item__head">
              <strong>{te("benefitNumber", { index: index + 1 })}</strong>
              <button
                type="button"
                className="pub-editor-item__remove"
                onClick={() => setDraft((d) => removeStudioBenefit(d, index))}
              >
                {te("remove")}
              </button>
            </div>
            <div className="admin-settings-fields admin-settings-fields--2col">
              <label>
                <span>{te("icon")}</span>
                <select
                  value={item.icon}
                  onChange={(e) => updateItem(index, { icon: e.target.value })}
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
                value={item.title}
                onChange={(title) => updateItem(index, { title })}
              />
              <EditorField
                full
                rows={2}
                label={te("itemText")}
                value={item.text}
                onChange={(text) => updateItem(index, { text })}
              />
            </div>
          </li>
        ))}
      </ol>
      <AdminButton
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => setDraft(addStudioBenefit)}
        disabled={copy.benefitItems.length >= MAX_BENEFIT_ITEMS}
      >
        {te("addBenefit")}
      </AdminButton>
    </>
  );
}

export function StepsEditor() {
  const te = useTranslations("admin.pages.publicSite.editor");
  const { copy, patchCopy, setDraft } = usePublicSiteEditor();

  function updateItem(index: number, patch: Partial<StepLineDraft>) {
    setDraft((d) =>
      patchStudioCopy(d, {
        stepItems: d.copies[d.editLocale].stepItems.map((item, i) =>
          i === index ? { ...item, ...patch } : item,
        ),
      }),
    );
  }

  return (
    <>
      <div className="admin-settings-fields">
        <EditorField
          label={te("sectionTitle")}
          value={copy.stepsTitle}
          onChange={(stepsTitle) => patchCopy({ stepsTitle })}
        />
        <EditorField
          rows={2}
          label={te("sectionLead")}
          value={copy.stepsLead}
          onChange={(stepsLead) => patchCopy({ stepsLead })}
        />
      </div>
      <ol className="pub-editor-items">
        {copy.stepItems.map((item, index) => (
          <li key={`step-${index}`} className="pub-editor-item">
            <div className="pub-editor-item__head">
              <strong>{te("stepNumber", { index: index + 1 })}</strong>
              <button
                type="button"
                className="pub-editor-item__remove"
                onClick={() => setDraft((d) => removeStudioStep(d, index))}
              >
                {te("remove")}
              </button>
            </div>
            <div className="admin-settings-fields">
              <EditorField
                label={te("itemTitle")}
                value={item.title}
                onChange={(title) => updateItem(index, { title })}
              />
              <EditorField
                rows={2}
                label={te("itemText")}
                value={item.text}
                onChange={(text) => updateItem(index, { text })}
              />
            </div>
          </li>
        ))}
      </ol>
      <AdminButton
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => setDraft(addStudioStep)}
        disabled={copy.stepItems.length >= MAX_STEP_ITEMS}
      >
        {te("addStep")}
      </AdminButton>
    </>
  );
}

export function CtaEditor() {
  const te = useTranslations("admin.pages.publicSite.editor");
  const { draft, copy, patchCopy, patchDraft } = usePublicSiteEditor();
  return (
    <div className="admin-settings-fields admin-settings-fields--2col">
      <EditorField
        full
        label={te("sectionTitle")}
        value={copy.ctaTitle}
        onChange={(ctaTitle) => patchCopy({ ctaTitle })}
      />
      <EditorField
        full
        rows={2}
        label={te("sectionLead")}
        value={copy.ctaLead}
        onChange={(ctaLead) => patchCopy({ ctaLead })}
      />
      <EditorField
        label={te("buttonText")}
        value={copy.ctaLabel}
        onChange={(ctaLabel) => patchCopy({ ctaLabel })}
      />
      <EditorLinkPicker
        label={te("buttonGoesTo")}
        value={draft.ctaHref}
        onChange={(ctaHref) => patchDraft({ ctaHref })}
      />
    </div>
  );
}

export function GalleryEditor() {
  const te = useTranslations("admin.pages.publicSite.editor");
  const t = useTranslations("admin.pages.publicSite");
  const { draft, copy, patchCopy, setDraft, readOnly } = usePublicSiteEditor();

  function addPhoto() {
    setDraft((d) => {
      const id = nextGalleryDraftId();
      const copies = { ...d.copies };
      for (const loc of PUBLIC_LOCALES) {
        copies[loc] = {
          ...copies[loc],
          galleryCaptions: { ...copies[loc].galleryCaptions, [id]: "" },
        };
      }
      return { ...d, galleryItems: [...d.galleryItems, { id, url: "" }], copies };
    });
  }

  function movePhoto(id: string, direction: -1 | 1) {
    setDraft((d) => {
      const items = [...d.galleryItems];
      const index = items.findIndex((item) => item.id === id);
      const target = index + direction;
      if (index === -1 || target < 0 || target >= items.length) return d;
      const [moved] = items.splice(index, 1);
      items.splice(target, 0, moved!);
      return { ...d, galleryItems: items };
    });
  }

  return (
    <>
      <div className="admin-settings-fields">
        <EditorField
          label={te("sectionTitle")}
          value={copy.galleryTitle}
          onChange={(galleryTitle) => patchCopy({ galleryTitle })}
        />
      </div>
      {draft.galleryItems.length === 0 ? (
        <p className="pub-gallery-editor__empty">{te("galleryEmpty")}</p>
      ) : (
        <ol className="pub-editor-items">
          {draft.galleryItems.map((item, index) => (
            <li key={item.id} className="pub-editor-item">
              <PublicSiteImageField
                kind="gallery"
                label={t("galleryPhotoLabel", { index: index + 1 })}
                value={item.url}
                onChange={(url) =>
                  setDraft((d) => ({
                    ...d,
                    galleryItems: d.galleryItems.map((row) =>
                      row.id === item.id ? { ...row, url } : row,
                    ),
                  }))
                }
                disabled={readOnly}
              />
              <EditorField
                label={te("photoCaption")}
                value={copy.galleryCaptions[item.id] ?? ""}
                onChange={(caption) =>
                  setDraft((d) =>
                    patchStudioCopy(d, {
                      galleryCaptions: {
                        ...d.copies[d.editLocale].galleryCaptions,
                        [item.id]: caption,
                      },
                    }),
                  )
                }
              />
              <div className="pub-editor-item__head">
                <span className="pub-gallery-editor__actions">
                  <button
                    type="button"
                    className="pub-gallery-editor__icon-btn"
                    aria-label={t("galleryMoveUp")}
                    disabled={index === 0}
                    onClick={() => movePhoto(item.id, -1)}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="pub-gallery-editor__icon-btn"
                    aria-label={t("galleryMoveDown")}
                    disabled={index === draft.galleryItems.length - 1}
                    onClick={() => movePhoto(item.id, 1)}
                  >
                    ↓
                  </button>
                </span>
                <button
                  type="button"
                  className="pub-editor-item__remove"
                  onClick={() =>
                    setDraft((d) => ({
                      ...d,
                      galleryItems: d.galleryItems.filter((row) => row.id !== item.id),
                    }))
                  }
                >
                  {t("galleryRemove")}
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}
      <AdminButton type="button" variant="secondary" size="sm" onClick={addPhoto}>
        {t("galleryAddPhoto")}
      </AdminButton>
      <EditorAdvanced>
        <div className="admin-settings-fields">
          <EditorField
            rows={2}
            label={te("sectionLead")}
            value={copy.galleryLead}
            onChange={(galleryLead) => patchCopy({ galleryLead })}
          />
        </div>
      </EditorAdvanced>
    </>
  );
}

export function TextBlockEditor({ item }: { item: TextLineDraft }) {
  const te = useTranslations("admin.pages.publicSite.editor");
  const { copy, patchCopy, setDraft } = usePublicSiteEditor();

  function patchItem(patch: Partial<TextLineDraft>) {
    patchCopy({
      textItems: copy.textItems.map((row) => (row.id === item.id ? { ...row, ...patch } : row)),
    });
  }

  return (
    <>
      <div className="admin-settings-fields">
        <EditorField label={te("sectionTitle")} value={item.title} onChange={(title) => patchItem({ title })} />
        <EditorField
          rows={2}
          label={te("sectionLead")}
          value={item.lead}
          onChange={(lead) => patchItem({ lead })}
        />
        <EditorField
          rows={6}
          label={te("textBody")}
          value={item.body}
          onChange={(body) => patchItem({ body })}
          hint={te("textBodyHint")}
        />
      </div>
      <button
        type="button"
        className="pub-editor-item__remove"
        onClick={() => setDraft((d) => removeStudioTextSection(d, item.id))}
      >
        {te("removeText")}
      </button>
    </>
  );
}

export function StaysEditor() {
  const te = useTranslations("admin.pages.publicSite.editor");
  const { draft, patchDraft } = usePublicSiteEditor();
  return (
    <>
      <EditorToggle
        label={te("stayPrices")}
        checked={draft.showStayPrices}
        onChange={(showStayPrices) => patchDraft({ showStayPrices })}
      />
      <SettingsFieldHint className="mt-2 block">
        {te("staysHint")}{" "}
        <Link href="/admin/rooms" className="underline">
          {te("openRooms")}
        </Link>
      </SettingsFieldHint>
    </>
  );
}

export function PlaceEditor() {
  const te = useTranslations("admin.pages.publicSite.editor");
  return (
    <SettingsFieldHint className="block">
      {te("placeHint")}{" "}
      <Link href="/admin/settings/fiscal" className="underline">
        {te("openLocation")}
      </Link>
    </SettingsFieldHint>
  );
}

export function ContactBarEditor({ onOpenContact }: { onOpenContact: () => void }) {
  const te = useTranslations("admin.pages.publicSite.editor");
  return (
    <SettingsFieldHint className="block">
      {te("contactBarHint")}{" "}
      <button type="button" className="underline" onClick={onOpenContact}>
        {te("openContactTab")}
      </button>
    </SettingsFieldHint>
  );
}

export function ChromeEditor() {
  const t = useTranslations("admin.pages.publicSite");
  const te = useTranslations("admin.pages.publicSite.editor");
  const { draft, copy, patchDraft, patchCopy } = usePublicSiteEditor();

  return (
    <>
      <SettingsFieldHint className="mb-3 block">
        {t("logoManaged")}{" "}
        <Link href="/admin/settings/identity" className="underline">
          {t("logoManagedLink")}
        </Link>
      </SettingsFieldHint>
      <div className="admin-settings-fields">
        <EditorField
          label={te("headerSubtitle")}
          value={copy.headerSubtitle}
          onChange={(headerSubtitle) => patchCopy({ headerSubtitle })}
          hint={te("headerSubtitleHint")}
        />
        <EditorField
          rows={2}
          label={te("footerTagline")}
          value={copy.footerTagline}
          onChange={(footerTagline) => patchCopy({ footerTagline })}
        />
      </div>
      <EditorAdvanced label={te("menuTitle")}>
        <SettingsFieldHint className="mb-2 block">{te("menuHint")}</SettingsFieldHint>
        <div className="pub-editor-menu">
          <EditorToggle
            label={t("showNavHome")}
            checked={draft.showNavHome}
            onChange={(showNavHome) => patchDraft({ showNavHome })}
          />
          <EditorToggle
            label={t("showNavPrivacy")}
            checked={draft.showNavPrivacy}
            onChange={(showNavPrivacy) => patchDraft({ showNavPrivacy })}
          />
          <EditorToggle
            label={t("showNavTerms")}
            checked={draft.showNavTerms}
            onChange={(showNavTerms) => patchDraft({ showNavTerms })}
          />
        </div>
        <div className="admin-settings-fields admin-settings-fields--2col mt-3">
          <EditorField label={t("navHomeLabel")} value={copy.navHome} onChange={(navHome) => patchCopy({ navHome })} />
          <EditorField
            label={t("navPrivacyLabel")}
            value={copy.navPrivacy}
            onChange={(navPrivacy) => patchCopy({ navPrivacy })}
          />
          <EditorField label={t("navTermsLabel")} value={copy.navTerms} onChange={(navTerms) => patchCopy({ navTerms })} />
          <EditorField label={t("navBookLabel")} value={copy.navBook} onChange={(navBook) => patchCopy({ navBook })} />
        </div>
      </EditorAdvanced>
    </>
  );
}
