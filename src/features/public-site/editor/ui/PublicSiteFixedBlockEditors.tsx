"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { SettingsFieldHint } from "@/components/admin/settings/SettingsFieldHint";
import { PublicSiteImageField } from "@/features/public-site/editor/ui/PublicSiteImageField";
import {
  EditorAdvanced,
  EditorField,
  EditorLinkPicker,
  EditorToggle,
  usePublicSiteEditor,
} from "@/features/public-site/editor/ui/PublicSiteEditorKit";

/*
 * Editors for the parts of the page that are not movable sections: the hero,
 * the contact band and the header/footer. Sections have their own editor in
 * `sections/<kind>/Editor.tsx`.
 */

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
      {copy.heroTitle.trim() && copy.heroTitle.trim() !== config.displayName ? (
        <SettingsFieldHint className="admin-settings-fields__full block">
          {te("heroTitleNotName", { name: config.displayName })}{" "}
          <Link href="/admin/settings/identity" className="underline">
            {te("heroTitleNameLink")}
          </Link>
        </SettingsFieldHint>
      ) : null}
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
