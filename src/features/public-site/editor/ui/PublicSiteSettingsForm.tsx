"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type {
  PublicLocale,
  PublicSiteConfig,
  PublicStockCopy,
} from "@/features/public-site/domain/types";
import { PUBLIC_LOCALES } from "@/features/public-site/domain/types";
import type { PensionContact } from "@/domain/settings/pension-identity";
import { buildPublicSiteConfigFromInput } from "@/domain/public-site/resolve-config";
import { savePublicSiteSettingsAction } from "@/features/settings/actions/public-site";
import { AdminSubmitButton } from "@/components/admin/feedback/AdminSubmitButton";
import { SettingsAlerts, type SettingsAlert } from "@/components/admin/settings/SettingsAlerts";
import { useSettingsUnsavedWarning } from "@/hooks/useSettingsUnsavedWarning";
import { PublicSitePreview } from "@/features/public-site/editor/ui/PublicSitePreview";
import { PublicSiteStudio } from "@/features/public-site/editor/ui/PublicSiteStudio";
import { PublicSiteLocaleTabs } from "@/features/public-site/editor/ui/PublicSiteLocaleTabs";
import {
  PublicSiteEditorProvider,
  type PublicSiteEditorApi,
} from "@/features/public-site/editor/ui/PublicSiteEditorKit";
import { PublicSiteDesignPanel } from "@/features/public-site/editor/ui/PublicSiteDesignPanel";
import { PublicSiteContentPanel } from "@/features/public-site/editor/ui/PublicSiteContentPanel";
import { PublicSiteContactPanel } from "@/features/public-site/editor/ui/PublicSiteContactPanel";
import { PublicSitePagesPanel } from "@/features/public-site/editor/ui/PublicSitePagesPanel";
import { PublicSitePublishControl } from "@/features/public-site/editor/ui/PublicSitePublishControl";
import { PublicSiteQuickStart } from "@/features/public-site/editor/ui/PublicSiteQuickStart";
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
} from "@/features/public-site/editor/model/editor-model";
import {
  buildPublicSiteStudioDraft,
  mergeStudioDrafts,
  mergeStudioToInput,
  patchStudioCopy,
  switchStudioLocale,
  type LocaleCopy,
  type PublicSiteStudioDraft,
} from "@/features/public-site/editor/model/studio-draft";
import { nextItemDraftId } from "@/features/public-site/editor/model/section-draft";
import "@/styles/features/admin/admin-public-site-editor.css";

export function PublicSiteSettingsForm({
  config,
  locale,
  primaryContact,
  readOnly = false,
  alerts = [],
  siteUrl,
  stockCopy,
}: {
  /** Default texts per language, so progress can tell them from the operator's own. */
  stockCopy: PublicStockCopy;
  config: PublicSiteConfig;
  locale: string;
  primaryContact: PensionContact;
  readOnly?: boolean;
  alerts?: SettingsAlert[];
  siteUrl: string;
}) {
  const t = useTranslations("admin.pages.publicSite");
  const te = useTranslations("admin.pages.publicSite.editor");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  // Version this editor last loaded or saved; a save from an older one is refused.
  const versionRef = useRef(config.version);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [tab, setTab] = useState<PublicSiteEditorTab>("content");
  const formRef = useRef<HTMLFormElement>(null);
  // Null shows the page outline; a key opens that part on its own screen.
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [scrollSeq, setScrollSeq] = useState(0);
  const [quickStartOpen, setQuickStartOpen] = useState(false);
  const [quickStartAnswers, setQuickStartAnswers] = useState<QuickStartAnswers | null>(null);

  const [draft, setDraftState] = useState<PublicSiteStudioDraft>(() =>
    buildPublicSiteStudioDraft(config, locale),
  );
  // The saved version this draft started from; a conflict merges against it.
  const baseDraftRef = useRef(draft);
  const [mergedAfterConflict, setMergedAfterConflict] = useState(false);
  const [reloadingWithEdits, setReloadingWithEdits] = useState(false);
  const conflictKey = `${CONFLICT_DRAFT_KEY}:${config.id || "new"}`;
  const copy = draft.copies[draft.editLocale];

  // Typing updates `draft` at once; everything derived from the whole draft (the
  // save payload, the preview, progress, the checklist) follows on this deferred
  // copy, so React can render it in the background without slowing keystrokes.
  const settledDraft = useDeferredValue(draft);
  const draftInput = useMemo(
    () => mergeStudioToInput({ config, draft: settledDraft }),
    [config, settledDraft],
  );
  const draftInputJson = useMemo(() => JSON.stringify(draftInput), [draftInput]);
  const previewConfig = useMemo(
    () => buildPublicSiteConfigFromInput(config, draftInput, primaryContact),
    [config, draftInput, primaryContact],
  );
  // While the quick start is open the preview shows its answers before they are applied.
  const studioPreviewConfig = useMemo(() => {
    if (!quickStartOpen || !quickStartAnswers) return previewConfig;
    let seq = 0;
    const answered = applyQuickStart(settledDraft, quickStartAnswers, () => `quick-preview-${++seq}`);
    const input = mergeStudioToInput({ config, draft: answered });
    return buildPublicSiteConfigFromInput(config, input, primaryContact);
  }, [quickStartOpen, quickStartAnswers, previewConfig, settledDraft, config, primaryContact]);
  const progress = useMemo(
    () => studioLocaleProgress(settledDraft, stockCopy),
    [settledDraft, stockCopy],
  );
  const readiness = useMemo(
    () => publicSiteReadiness(settledDraft, previewConfig, stockCopy),
    [settledDraft, previewConfig, stockCopy],
  );
  const preview = useMemo(
    () => <PublicSitePreview config={studioPreviewConfig} locale={settledDraft.editLocale} />,
    [studioPreviewConfig, settledDraft.editLocale],
  );

  const initialSnapshot = useRef<string | null>(null);
  initialSnapshot.current ??= draftInputJson;
  // A keystroke the deferred copy has not caught up with yet still counts as unsaved.
  const dirty = draft !== settledDraft || draftInputJson !== initialSnapshot.current;
  // Not while reloading to keep the edits: they come back after the reload.
  useSettingsUnsavedWarning(!readOnly && dirty && !reloadingWithEdits);
  useEffect(() => {
    if (reloadingWithEdits) window.location.reload();
  }, [reloadingWithEdits]);

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
    primaryContact,
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

  // Back from "reload and keep my changes": lay them over the colleague's version.
  useEffect(() => {
    const kept = takeConflictDraft(conflictKey);
    if (!kept || readOnly) return;
    setDraftState((theirs) => mergeStudioDrafts(kept.base, kept.mine, theirs));
    setMergedAfterConflict(true);
    // Once, on the load that follows the reload.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    setDraftState((d) => applyQuickStart(d, answers, nextItemDraftId));
    closeQuickStart();
    setTab("content");
  }

  /** Language names mid-sentence: lower-case except in English („în română”). */
  function languageName(loc: PublicLocale): string {
    const name = t(`localeTab_${loc}`);
    return locale === "en" ? name : name.toLocaleLowerCase(locale);
  }

  function pickFromPreview(target: Element): boolean {
    const key = editKeyFromPreviewTarget(target, draft);
    if (!key) return false;
    setTab("content");
    setOpenKey(key);
    setScrollSeq((n) => n + 1);
    return true;
  }

  function setEditLocale(next: PublicLocale) {
    setDraftState((d) => switchStudioLocale(d, next));
  }

  const copySource = PUBLIC_LOCALES.filter((loc) => loc !== settledDraft.editLocale).sort(
    (a, b) => progress[b] - progress[a],
  )[0];
  // Offered while the best-filled language still has text for an empty field here.
  const hasCopyGaps = useMemo(
    () =>
      copySource !== undefined &&
      fillStudioLocaleFrom(settledDraft, copySource, settledDraft.editLocale) !== settledDraft,
    [settledDraft, copySource],
  );
  const canCopy = !readOnly && hasCopyGaps;
  // The guide is for setting a site up; once it is online it is only noise.
  const quickStartOffered = !readOnly && !config.published;

  function save(next: PublicSiteStudioDraft, onFail?: () => void) {
    setError(null);
    setConflict(false);
    setFieldErrors({});
    const payload = mergeStudioToInput({ config, draft: next });
    startTransition(async () => {
      const result = await savePublicSiteSettingsAction(payload, versionRef.current);
      if (!result.ok) {
        onFail?.();
        setError(result.error);
        setConflict(result.conflict === true);
        const errors = result.fieldErrors ?? {};
        setFieldErrors(errors);
        const errorTab = firstErrorTab(errors);
        if (errorTab) goTo(errorTab);
      } else {
        initialSnapshot.current = JSON.stringify(payload);
        baseDraftRef.current = next;
        setMergedAfterConflict(false);
        versionRef.current = result.version;
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
      editLocale={draft.editLocale}
      dirty={dirty}
      onPreviewPick={quickStartOpen ? undefined : pickFromPreview}
      wideForm={quickStartOpen}
      preview={preview}
      localeTabs={
        <PublicSiteLocaleTabs
          variant="chrome"
          value={draft.editLocale}
          onChange={setEditLocale}
          disabled={readOnly}
          progress={progress}
        />
      }
      publishControl={
        quickStartOpen ? null : (
          <PublicSitePublishControl
            readiness={readiness}
            onGoTo={goTo}
            onPublish={setPublished}
            pending={pending}
            dirty={dirty}
            published={draft.published}
            live={config.published}
            readOnly={readOnly}
            siteUrl={siteUrl}
            siteName={config.displayName}
          />
        )
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
          {mergedAfterConflict ? (
            <p className="settings-unsaved-banner" role="status">
              {te("conflictMerged")}
            </p>
          ) : null}
          {error ? (
            <div className="settings-alerts">
              <p className="settings-alerts__item settings-alerts__item--error" role="alert">
                {error}
                {conflict ? (
                  <>
                    {" "}
                    <button
                      type="button"
                      onClick={() => {
                        keepConflictDraft(conflictKey, baseDraftRef.current, draft);
                        setReloadingWithEdits(true);
                      }}
                    >
                      {te("conflictReload")}
                    </button>
                  </>
                ) : null}
              </p>
            </div>
          ) : null}
        </>
      }
      form={
        quickStartOpen ? (
          <PublicSiteQuickStart
            initial={quickStartAnswersFrom(draft)}
            contact={previewConfig.contact}
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
            {PUBLIC_SITE_EDITOR_TABS.map((key) => (
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
                <span className="pub-editor-tabs__label">{te(`tabs.${key}`)}</span>
              </button>
            ))}
          </nav>

          {tab !== "design" ? (
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
          ) : null}

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
                  onOpenContact={() => goTo("settings")}
                  onQuickStart={quickStartOffered ? () => setQuickStartOpen(true) : undefined}
                />
              ) : null}
              {tab === "settings" ? (
                <>
                  <PublicSiteContactPanel />
                  <PublicSitePagesPanel />
                </>
              ) : null}
            </PublicSiteEditorProvider>
          </fieldset>
        </form>
        )
      }
    />
  );
}

const CONFLICT_DRAFT_KEY = "pub-site-conflict-draft";

/** Carries the operator's edits across the reload that fetches a colleague's version. */
function keepConflictDraft(
  key: string,
  base: PublicSiteStudioDraft,
  mine: PublicSiteStudioDraft,
): void {
  try {
    sessionStorage.setItem(key, JSON.stringify({ base, mine }));
  } catch {
    /* storage blocked: the reload then shows their version only */
  }
}

function takeConflictDraft(
  key: string,
): { base: PublicSiteStudioDraft; mine: PublicSiteStudioDraft } | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    sessionStorage.removeItem(key);
    return JSON.parse(raw) as { base: PublicSiteStudioDraft; mine: PublicSiteStudioDraft };
  } catch {
    return null;
  }
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
