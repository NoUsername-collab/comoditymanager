"use client";

import { useTranslations } from "next-intl";
import { PublicSiteImageField } from "@/features/settings/ui/PublicSiteImageField";
import {
  EditorAdvanced,
  EditorField,
  EditorGroup,
  usePublicSiteEditor,
} from "@/features/settings/ui/PublicSiteEditorKit";
import type {
  PublicSiteEditorTab,
  PublicSiteReadinessItem,
} from "@/features/settings/ui/public-site-editor-model";

export function PublicSitePublishPanel({
  readiness,
  onGoTo,
}: {
  readiness: PublicSiteReadinessItem[];
  onGoTo: (tab: PublicSiteEditorTab) => void;
}) {
  const t = useTranslations("admin.pages.publicSite");
  const te = useTranslations("admin.pages.publicSite.editor");
  const { config, draft, copy, patchDraft, patchCopy, fieldError, readOnly } =
    usePublicSiteEditor();
  const done = readiness.filter((item) => item.done).length;

  const googleTitle = copy.seoTitle.trim() || copy.heroTitle.trim() || config.displayName;
  const googleDesc = copy.seoDescription.trim() || copy.heroSubtitle.trim();

  return (
    <>
      <EditorGroup
        title={te("checklistTitle")}
        description={te("checklistDone", { done, total: readiness.length })}
      >
        <ul className="pub-editor-checklist">
          {readiness.map((item) => (
            <li key={item.id} data-done={item.done ? "1" : undefined}>
              <span className="pub-editor-checklist__mark" aria-hidden>
                {item.done ? "✓" : "!"}
              </span>
              <span className="pub-editor-checklist__label">{te(`checks.${item.id}`)}</span>
              {!item.done ? (
                <button type="button" onClick={() => onGoTo(item.tab)}>
                  {te("checkFix")}
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      </EditorGroup>

      <div className="pub-editor-publish" data-on={draft.published ? "1" : undefined}>
        <label className="pub-editor-publish__switch">
          <input
            type="checkbox"
            role="switch"
            checked={draft.published}
            onChange={(e) => patchDraft({ published: e.target.checked })}
          />
          <span className="pub-editor-publish__text">
            <strong>{te(draft.published ? "publishedOn" : "publishedOff")}</strong>
            <small>{te(draft.published ? "publishedOnDesc" : "publishedOffDesc")}</small>
          </span>
        </label>
        <p className="pub-editor-publish__note">{te("publishSaveHint")}</p>
      </div>

      <EditorGroup title={te("googleTitle")} description={te("googleDesc")}>
        <div className="pub-editor-serp" aria-label={te("googlePreviewLabel")}>
          <span className="pub-editor-serp__title">{googleTitle}</span>
          <span className="pub-editor-serp__desc">{googleDesc || te("googleDescEmpty")}</span>
        </div>
        <div className="admin-settings-fields mt-3">
          <EditorField
            label={te("googleTitleLabel")}
            value={copy.seoTitle}
            placeholder={copy.heroTitle || config.displayName}
            onChange={(seoTitle) => patchCopy({ seoTitle })}
            hint={te("googleTitleHint", { count: googleTitle.length })}
          />
          <EditorField
            rows={3}
            label={te("googleDescLabel")}
            value={copy.seoDescription}
            placeholder={copy.heroSubtitle}
            onChange={(seoDescription) => patchCopy({ seoDescription })}
            hint={te("googleDescHint", { count: googleDesc.length })}
          />
          <div className="admin-settings-fields__full">
            <PublicSiteImageField
              kind="og"
              label={te("shareImage")}
              value={draft.ogImageUrl}
              onChange={(ogImageUrl) => patchDraft({ ogImageUrl })}
              hint={te("shareImageHint")}
              error={fieldError("pages.ogImageUrl")}
              disabled={readOnly}
            />
          </div>
        </div>
      </EditorGroup>

      <EditorAdvanced label={te("otherPagesTitle")}>
        <p className="pub-editor-lead">{te("otherPagesDesc")}</p>
        <div className="admin-settings-fields">
          <h4 className="pub-editor-subhead">{te("comingSoon")}</h4>
          <EditorField
            label={te("pageTitle")}
            value={copy.comingSoonTitle}
            onChange={(comingSoonTitle) => patchCopy({ comingSoonTitle })}
          />
          <EditorField
            rows={2}
            label={te("pageText")}
            value={copy.comingSoonLead}
            onChange={(comingSoonLead) => patchCopy({ comingSoonLead })}
          />

          <h4 className="pub-editor-subhead">{te("calendarPage")}</h4>
          <EditorField
            label={te("pageTitle")}
            value={copy.calendarTitle}
            onChange={(calendarTitle) => patchCopy({ calendarTitle })}
          />
          <EditorField
            rows={2}
            label={te("pageText")}
            value={copy.calendarLead}
            onChange={(calendarLead) => patchCopy({ calendarLead })}
          />

          <h4 className="pub-editor-subhead">{te("termsPage")}</h4>
          <EditorField
            label={te("pageTitle")}
            value={copy.termsTitle}
            onChange={(termsTitle) => patchCopy({ termsTitle })}
          />
          <EditorField
            label={te("pageIntro")}
            value={copy.termsLead}
            onChange={(termsLead) => patchCopy({ termsLead })}
          />
          <EditorField
            rows={8}
            label={te("pageBody")}
            value={copy.termsBody}
            onChange={(termsBody) => patchCopy({ termsBody })}
            hint={t("legalBodyHint")}
          />

          <h4 className="pub-editor-subhead">{te("privacyPage")}</h4>
          <EditorField
            label={te("pageTitle")}
            value={copy.privacyTitle}
            onChange={(privacyTitle) => patchCopy({ privacyTitle })}
          />
          <EditorField
            label={te("pageIntro")}
            value={copy.privacyLead}
            onChange={(privacyLead) => patchCopy({ privacyLead })}
          />
          <EditorField
            rows={8}
            label={te("pageBody")}
            value={copy.privacyBody}
            onChange={(privacyBody) => patchCopy({ privacyBody })}
            hint={t("legalBodyHint")}
          />

          <h4 className="pub-editor-subhead">{te("otherSeo")}</h4>
          <EditorField
            label={te("seoFor", { page: te("calendarPage") })}
            value={copy.seoCalendarTitle}
            onChange={(seoCalendarTitle) => patchCopy({ seoCalendarTitle })}
          />
          <EditorField
            rows={2}
            label={te("seoDescFor", { page: te("calendarPage") })}
            value={copy.seoCalendarDescription}
            onChange={(seoCalendarDescription) => patchCopy({ seoCalendarDescription })}
          />
          <EditorField
            label={te("seoFor", { page: te("termsPage") })}
            value={copy.seoTermsTitle}
            onChange={(seoTermsTitle) => patchCopy({ seoTermsTitle })}
          />
          <EditorField
            rows={2}
            label={te("seoDescFor", { page: te("termsPage") })}
            value={copy.seoTermsDescription}
            onChange={(seoTermsDescription) => patchCopy({ seoTermsDescription })}
          />
          <EditorField
            label={te("seoFor", { page: te("privacyPage") })}
            value={copy.seoPrivacyTitle}
            onChange={(seoPrivacyTitle) => patchCopy({ seoPrivacyTitle })}
          />
          <EditorField
            rows={2}
            label={te("seoDescFor", { page: te("privacyPage") })}
            value={copy.seoPrivacyDescription}
            onChange={(seoPrivacyDescription) => patchCopy({ seoPrivacyDescription })}
          />
        </div>
      </EditorAdvanced>
    </>
  );
}
