"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AdminButton } from "@/components/admin/ui/AdminButton";
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
  onPublish,
  pending,
  dirty,
  siteUrl,
  onQuickStart,
}: {
  readiness: PublicSiteReadinessItem[];
  onGoTo: (tab: PublicSiteEditorTab) => void;
  /** Flip visibility and save in one go. */
  onPublish: (published: boolean) => void;
  pending: boolean;
  dirty: boolean;
  /** Address of the live site, to copy or send once it is online. */
  siteUrl: string;
  /** Opens the 4-question quick start; offered until the site is online. */
  onQuickStart?: () => void;
}) {
  const t = useTranslations("admin.pages.publicSite");
  const te = useTranslations("admin.pages.publicSite.editor");
  const { config, draft, copy, patchDraft, patchCopy, fieldError, readOnly } =
    usePublicSiteEditor();
  const required = readiness.filter((item) => !item.optional);
  const done = required.filter((item) => item.done).length;
  const missing = required.length - done;

  const googleTitle = copy.seoTitle.trim() || copy.heroTitle.trim() || config.displayName;
  const googleDesc = copy.seoDescription.trim() || copy.heroSubtitle.trim();

  return (
    <>
      <EditorGroup
        title={te("checklistTitle")}
        description={te("checklistDone", { done, total: required.length })}
      >
        <ul className="pub-editor-checklist">
          {readiness.map((item) => (
            <li
              key={item.id}
              data-done={item.done ? "1" : undefined}
              data-optional={item.optional ? "1" : undefined}
            >
              <span className="pub-editor-checklist__mark" aria-hidden>
                {item.done ? "✓" : item.optional ? "○" : "!"}
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
        <p className="pub-editor-publish__text" role="status">
          <strong>{te(draft.published ? "publishedOn" : "publishedOff")}</strong>
          <small>{te(draft.published ? "publishedOnDesc" : "publishedOffDesc")}</small>
        </p>
        {!readOnly ? (
          <>
            <AdminButton
              type="button"
              variant={draft.published ? "secondary" : "primary"}
              className="pub-editor-publish__btn"
              disabled={pending}
              onClick={() => onPublish(!draft.published)}
            >
              {pending
                ? te("publishing")
                : te(draft.published ? "unpublishButton" : "publishButton")}
            </AdminButton>
            {!draft.published && missing > 0 ? (
              <p className="pub-editor-publish__note">
                {te("publishAnyway", { count: missing })}
              </p>
            ) : null}
            {!draft.published && onQuickStart ? (
              <button type="button" className="pub-editor-quickstart-btn" onClick={onQuickStart}>
                <strong>{te("quickStart.open")}</strong>
                <span>{te("quickStart.openHint")}</span>
              </button>
            ) : null}
            {dirty ? <p className="pub-editor-publish__note">{te("publishSavesAll")}</p> : null}
          </>
        ) : null}
      </div>

      {config.published && draft.published ? (
        <SiteShare siteUrl={siteUrl} name={config.displayName} />
      ) : null}

      <EditorAdvanced label={te("googleTitle")}>
        <p className="pub-editor-lead">{te("googleDesc")}</p>
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
      </EditorAdvanced>

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

/** Right after publishing: the address in plain sight, ready to copy or send. */
function SiteShare({ siteUrl, name }: { siteUrl: string; name: string }) {
  const te = useTranslations("admin.pages.publicSite.editor");
  const [copied, setCopied] = useState(false);
  const shown = siteUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(
    te("shareMessage", { name, url: siteUrl }),
  )}`;

  function copy() {
    void navigator.clipboard
      .writeText(siteUrl)
      .then(() => setCopied(true))
      .catch(() => setCopied(false));
  }

  return (
    <div className="pub-editor-share">
      <p className="pub-editor-share__label">{te("shareTitle")}</p>
      <a
        href={siteUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="pub-editor-share__url"
      >
        {shown}
      </a>
      <div className="pub-editor-share__actions">
        <AdminButton type="button" variant="secondary" size="sm" onClick={copy}>
          {copied ? te("shareCopied") : te("shareCopy")}
        </AdminButton>
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className="pub-editor-share__whatsapp"
        >
          {te("shareWhatsapp")}
        </a>
      </div>
    </div>
  );
}
