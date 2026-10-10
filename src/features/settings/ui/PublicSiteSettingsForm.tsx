"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { PublicLocale, PublicSiteConfig } from "@/features/public-site/domain/types";
import { PUBLIC_LOCALES } from "@/features/public-site/domain/types";
import type { PensionContact } from "@/domain/settings/pension-identity";
import { buildPublicSiteConfigFromInput } from "@/domain/public-site/resolve-config";
import { savePublicSiteSettingsAction } from "@/features/settings/actions/public-site";
import { AdminSubmitButton } from "@/components/admin/feedback/AdminSubmitButton";
import { SettingsAlerts, type SettingsAlert } from "@/components/admin/settings/SettingsAlerts";
import { useSettingsUnsavedWarning } from "@/hooks/useSettingsUnsavedWarning";
import { PublicSitePreview } from "@/features/settings/ui/PublicSitePreview";
import { PublicSiteStudio } from "@/features/settings/ui/PublicSiteStudio";
import { PublicSiteLocaleTabs } from "@/features/settings/ui/PublicSiteLocaleTabs";
import {
  PublicSiteEditorProvider,
  type PublicSiteEditorApi,
} from "@/features/settings/ui/PublicSiteEditorKit";
import { PublicSiteDesignPanel } from "@/features/settings/ui/PublicSiteDesignPanel";
import { PublicSiteContentPanel } from "@/features/settings/ui/PublicSiteContentPanel";
import { PublicSiteContactPanel } from "@/features/settings/ui/PublicSiteContactPanel";
import { PublicSitePublishPanel } from "@/features/settings/ui/PublicSitePublishPanel";
import { PublicSiteQuickStart } from "@/features/settings/ui/PublicSiteQuickStart";
import {
  applyQuickStart,
  editKeyFromPreviewTarget,
  fillStudioLocaleFrom,
  isFreshPublicSite,
  quickStartAnswersFrom,
  firstErrorTab,
  PUBLIC_SITE_EDITOR_TABS,
  publicSiteReadiness,
  studioLocaleProgress,
  type PublicSiteEditorTab,
  type QuickStartAnswers,
} from "@/features/settings/ui/public-site-editor-model";
import {
  buildPublicSiteStudioDraft,
  mergeStudioToInput,
  nextGalleryDraftId,
  patchStudioCopy,
  switchStudioLocale,
  type LocaleCopy,
  type PublicSiteStudioDraft,
} from "@/features/settings/ui/public-site-studio-draft";
import "@/styles/features/admin/admin-public-site-editor.css";

export function PublicSiteSettingsForm({
  config,
  locale,
  primaryContact,
  readOnly = false,
  alerts = [],
}: {
  config: PublicSiteConfig;
  locale: string;
  primaryContact: PensionContact;
  readOnly?: boolean;
  alerts?: SettingsAlert[];
}) {
  const t = useTranslations("admin.pages.publicSite");
  const te = useTranslations("admin.pages.publicSite.editor");
  const tSettings = useTranslations("admin.pages.settings");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [tab, setTab] = useState<PublicSiteEditorTab>("content");
  const formRef = useRef<HTMLFormElement>(null);
  const [openKey, setOpenKey] = useState<string | null>("hero");
  const [scrollSeq, setScrollSeq] = useState(0);
  const [quickStartOpen, setQuickStartOpen] = useState(false);
  const [quickStartAnswers, setQuickStartAnswers] = useState<QuickStartAnswers | null>(null);

  const [draft, setDraftState] = useState<PublicSiteStudioDraft>(() =>
    buildPublicSiteStudioDraft(config, locale),
  );
  const copy = draft.copies[draft.editLocale];

  const draftInput = useMemo(() => mergeStudioToInput({ config, draft }), [config, draft]);
  const previewConfig = useMemo(
    () => buildPublicSiteConfigFromInput(config, draftInput, primaryContact),
    [config, draftInput, primaryContact],
  );
  // While the quick start is open the preview shows its answers before they are applied.
  const studioPreviewConfig = useMemo(() => {
    if (!quickStartOpen || !quickStartAnswers) return previewConfig;
    let seq = 0;
    const answered = applyQuickStart(draft, quickStartAnswers, () => `quick-preview-${++seq}`);
    const input = mergeStudioToInput({ config, draft: answered });
    return buildPublicSiteConfigFromInput(config, input, primaryContact);
  }, [quickStartOpen, quickStartAnswers, previewConfig, draft, config, primaryContact]);
  const progress = useMemo(() => studioLocaleProgress(draft), [draft]);
  const readiness = useMemo(() => publicSiteReadiness(draft, previewConfig), [draft, previewConfig]);

  const initialSnapshot = useRef(JSON.stringify(draftInput));
  const dirty = JSON.stringify(draftInput) !== initialSnapshot.current;
  useSettingsUnsavedWarning(!readOnly && dirty);

  function fieldError(...paths: string[]): string | undefined {
    for (const path of paths) {
      if (fieldErrors[path]) return fieldErrors[path];
    }
    const key = Object.keys(fieldErrors).find((candidate) =>
      paths.some((path) => candidate.startsWith(`${path}.`)),
    );
    return key ? fieldErrors[key] : undefined;
  }

  const api: PublicSiteEditorApi = {
    config,
    draft,
    copy,
    readOnly,
    setDraft: (update) => setDraftState(update),
    patchDraft: (partial) => setDraftState((d) => ({ ...d, ...partial })),
    patchCopy: (partial: Partial<LocaleCopy>) => setDraftState((d) => patchStudioCopy(d, partial)),
    fieldError,
  };

  function goTo(next: PublicSiteEditorTab) {
    setTab(next);
    formRef.current?.closest(".pub-site-studio__form")?.scrollTo({ top: 0 });
  }

  useEffect(() => {
    if (readOnly || !isFreshPublicSite(draft) || quickStartDismissed()) return;
    setQuickStartOpen(true);
    // Only on first render: a fresh site opens the guide once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function closeQuickStart() {
    rememberQuickStartDismissed();
    setQuickStartOpen(false);
    setQuickStartAnswers(null);
  }

  function finishQuickStart(answers: QuickStartAnswers) {
    setDraftState((d) => applyQuickStart(d, answers, nextGalleryDraftId));
    closeQuickStart();
    goTo("publish");
  }

  /** Language names mid-sentence: lower-case except in English („în română”). */
  function languageName(loc: PublicLocale): string {
    const name = t(`localeTab_${loc}`);
    return locale === "en" ? name : name.toLocaleLowerCase(locale);
  }

  function pickFromPreview(target: Element): boolean {
    const key = editKeyFromPreviewTarget(target, draft.sectionOrder);
    if (!key) return false;
    setTab("content");
    setOpenKey(key);
    setScrollSeq((n) => n + 1);
    return true;
  }

  function setEditLocale(next: PublicLocale) {
    setDraftState((d) => switchStudioLocale(d, next));
  }

  const copySource = PUBLIC_LOCALES.filter((loc) => loc !== draft.editLocale).sort(
    (a, b) => progress[b] - progress[a],
  )[0];
  const canCopy =
    !readOnly && copySource !== undefined && progress[draft.editLocale] < progress[copySource];

  function save(next: PublicSiteStudioDraft, onFail?: () => void) {
    setError(null);
    setFieldErrors({});
    const payload = mergeStudioToInput({ config, draft: next });
    startTransition(async () => {
      const result = await savePublicSiteSettingsAction(payload);
      if (!result.ok) {
        onFail?.();
        setError(result.error);
        const errors = result.fieldErrors ?? {};
        setFieldErrors(errors);
        const errorTab = firstErrorTab(errors);
        if (errorTab) goTo(errorTab);
      } else {
        initialSnapshot.current = JSON.stringify(payload);
        router.push(result.redirectTo);
        router.refresh();
      }
    });
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    save(draft);
  }

  /** Publish or hide in one gesture: flips the switch and saves everything. */
  function setPublished(published: boolean) {
    const next = { ...draft, published };
    setDraftState(next);
    save(next, () => setDraftState((d) => ({ ...d, published: !published })));
  }

  const errorTabs = new Set(
    Object.keys(fieldErrors).map((path) => firstErrorTab({ [path]: "x" })),
  );

  return (
    <PublicSiteStudio
      published={draft.published}
      editLocale={draft.editLocale}
      dirty={dirty}
      onPreviewPick={quickStartOpen ? undefined : pickFromPreview}
      wideForm={quickStartOpen}
      preview={<PublicSitePreview config={studioPreviewConfig} locale={draft.editLocale} />}
      localeTabs={
        <PublicSiteLocaleTabs
          variant="chrome"
          value={draft.editLocale}
          onChange={setEditLocale}
          disabled={readOnly}
          progress={progress}
        />
      }
      saveControl={
        readOnly || quickStartOpen ? null : (
          <AdminSubmitButton
            form="public-site-studio-form"
            type="submit"
            variant="primary"
            size="sm"
            disabled={pending}
          >
            {pending ? t("saving") : t("save")}
          </AdminSubmitButton>
        )
      }
      banner={
        <>
          <SettingsAlerts alerts={alerts} />
          {!readOnly && dirty ? (
            <p className="settings-unsaved-banner pub-site-studio__unsaved" role="status">
              {tSettings("unsavedChanges")}
            </p>
          ) : null}
          {error ? (
            <div className="settings-alerts">
              <p className="settings-alerts__item settings-alerts__item--error" role="alert">
                {error}
              </p>
            </div>
          ) : null}
        </>
      }
      form={
        quickStartOpen ? (
          <PublicSiteQuickStart
            initial={quickStartAnswersFrom(draft)}
            displayName={config.displayName}
            language={languageName(draft.editLocale)}
            otherLanguages={PUBLIC_LOCALES.filter((loc) => loc !== draft.editLocale).map(
              languageName,
            )}
            onChange={setQuickStartAnswers}
            onFinish={finishQuickStart}
            onClose={closeQuickStart}
          />
        ) : (
        <form
          ref={formRef}
          id="public-site-studio-form"
          onSubmit={handleSubmit}
          className="pub-editor"
        >
          <nav className="pub-editor-tabs" role="tablist" aria-label={te("tabsAria")}>
            {PUBLIC_SITE_EDITOR_TABS.map((key, index) => (
              <button
                key={key}
                type="button"
                role="tab"
                id={`pub-editor-tab-${key}`}
                aria-selected={tab === key}
                aria-controls="pub-editor-panel"
                className="pub-editor-tabs__tab"
                data-error={errorTabs.has(key) ? "1" : undefined}
                onClick={() => goTo(key)}
              >
                <span className="pub-editor-tabs__step">{index + 1}</span>
                <span className="pub-editor-tabs__label">{te(`tabs.${key}`)}</span>
              </button>
            ))}
          </nav>

          <div className="pub-editor-locale" role="status">
            <span>
              {te("editingLocale", { language: t(`localeTab_${draft.editLocale}`) })}
            </span>
            {canCopy && copySource ? (
              <button
                type="button"
                onClick={() =>
                  setDraftState((d) => fillStudioLocaleFrom(d, copySource, d.editLocale))
                }
                title={te("copyFromHint", { locale: copySource.toUpperCase() })}
              >
                {te("copyFrom", { locale: copySource.toUpperCase() })}
              </button>
            ) : null}
          </div>

          <fieldset
            disabled={readOnly}
            id="pub-editor-panel"
            role="tabpanel"
            aria-labelledby={`pub-editor-tab-${tab}`}
            className="pub-editor__panel"
          >
            {tab !== "content" ? (
              <p className="pub-editor-tabhint">{te(`tabHints.${tab}`)}</p>
            ) : null}
            <PublicSiteEditorProvider value={api}>
              {tab === "design" ? <PublicSiteDesignPanel /> : null}
              {tab === "content" ? (
                <PublicSiteContentPanel
                  openKey={openKey}
                  onOpenKeyChange={setOpenKey}
                  scrollSeq={scrollSeq}
                  onOpenContact={() => goTo("contact")}
                  onQuickStart={readOnly ? undefined : () => setQuickStartOpen(true)}
                />
              ) : null}
              {tab === "contact" ? <PublicSiteContactPanel /> : null}
              {tab === "publish" ? (
                <PublicSitePublishPanel
                  readiness={readiness}
                  onGoTo={goTo}
                  onPublish={setPublished}
                  pending={pending}
                  dirty={dirty}
                />
              ) : null}
            </PublicSiteEditorProvider>
          </fieldset>
        </form>
        )
      }
    />
  );
}

const QUICK_START_DISMISSED_KEY = "pub-site-quickstart-dismissed";

function quickStartDismissed(): boolean {
  try {
    return localStorage.getItem(QUICK_START_DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

function rememberQuickStartDismissed(): void {
  try {
    localStorage.setItem(QUICK_START_DISMISSED_KEY, "1");
  } catch {
    /* private mode */
  }
}
