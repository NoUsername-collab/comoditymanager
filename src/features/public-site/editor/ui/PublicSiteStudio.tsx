"use client";

import { useEffect, useEffectEvent, useRef, useState, type ReactNode } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { consumePublicSiteStudioEnter } from "@/features/public-site/editor/model/studio-enter";
import { StudioPreviewIframe } from "@/features/public-site/editor/ui/StudioPreviewIframe";
import "@/styles/features/admin/admin-public-site-studio.css";

type StudioDevice = "desktop" | "tablet" | "phone";
type StudioPane = "edit" | "preview";

const DEVICES: StudioDevice[] = ["desktop", "tablet", "phone"];
const LEAVE_MS = 180;

function isEditableTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || target.closest("input, textarea, select, [role='dialog']") !== null)
  );
}

export function PublicSiteStudio({
  form,
  preview,
  published,
  editLocale,
  localeTabs,
  saveControl,
  dirty,
  banner,
  onPreviewPick,
  wideForm = false,
}: {
  form: ReactNode;
  preview: ReactNode;
  published: boolean;
  editLocale?: "ro" | "en" | "bg";
  localeTabs?: ReactNode;
  saveControl?: ReactNode;
  dirty?: boolean;
  banner?: ReactNode;
  /** Click inside the preview; return true when it opened an editor. */
  onPreviewPick?: (target: Element) => boolean;
  /** Wider editor column (quick start) with the preview still beside it. */
  wideForm?: boolean;
}) {
  const t = useTranslations("admin.pages.publicSite");
  const tSettings = useTranslations("admin.pages.settings");
  const router = useRouter();
  const [pane, setPane] = useState<StudioPane>("edit");
  const [device, setDevice] = useState<StudioDevice>("desktop");
  const [enter, setEnter] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const dirtyRef = useRef(Boolean(dirty));
  dirtyRef.current = Boolean(dirty);
  const leavingRef = useRef(false);

  useEffect(() => {
    document.documentElement.dataset.pubStudio = "immersive";
    document.body.style.overflow = "hidden";
    if (consumePublicSiteStudioEnter()) {
      setEnter(true);
    }
    return () => {
      delete document.documentElement.dataset.pubStudio;
      document.body.style.overflow = "";
    };
  }, []);

  function leaveStudio() {
    if (leavingRef.current) return;
    if (dirtyRef.current && !window.confirm(tSettings("unsavedChanges"))) return;
    leavingRef.current = true;
    setLeaving(true);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.setTimeout(() => {
      router.push("/admin/settings");
    }, reduceMotion ? 0 : LEAVE_MS);
  }

  // Reads the current pane on every key without re-subscribing.
  const onKey = useEffectEvent((event: KeyboardEvent) => {
    if (event.key !== "Escape" || event.defaultPrevented || event.isComposing) return;
    // Escape in a field closes its own popup or cancels typing; it never leaves the studio.
    if (isEditableTarget(event.target)) return;
    if (window.matchMedia("(max-width: 1099px)").matches && pane === "preview") {
      setPane("edit");
      return;
    }
    leaveStudio();
  });

  useEffect(() => {
    const handler = (event: KeyboardEvent) => onKey(event);
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div
      className="pub-site-studio pub-site-studio--immersive"
      data-pane={pane}
      data-device={device}
      data-enter={enter ? "1" : undefined}
      data-leave={leaving ? "1" : undefined}
      data-wide={wideForm ? "1" : undefined}
    >
      <header className="pub-site-studio__chrome">
        <button
          type="button"
          className="pub-site-studio__back-settings"
          onClick={leaveStudio}
        >
          ← {t("studioBackSettings")}
        </button>

        {localeTabs}

        {!published ? (
          <p className="pub-site-studio__unpublished" role="status">
            {t("studioUnpublished")}
          </p>
        ) : null}

        <div className="pub-site-studio__devices" role="radiogroup" aria-label={t("studioCanvasAria")}>
          {DEVICES.map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={device === option}
              className={[
                "pub-site-studio__device",
                device === option && "pub-site-studio__device--active",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => setDevice(option)}
            >
              {t(
                option === "desktop"
                  ? "studioDeviceDesktop"
                  : option === "tablet"
                    ? "studioDeviceTablet"
                    : "studioDevicePhone",
              )}
            </button>
          ))}
        </div>

        <Link
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="pub-site-studio__live-link"
        >
          {t("studioOpenLive")}
          <span aria-hidden>↗</span>
        </Link>

        {saveControl ? (
          <div className="pub-site-studio__save">
            {dirty ? (
              <span className="pub-site-studio__dirty" role="status">
                {t("studioUnsaved")}
              </span>
            ) : null}
            {saveControl}
          </div>
        ) : null}
      </header>

      {banner}

      <div className="pub-site-studio__workspace">
        <div className="pub-site-studio__form">
          {form}
          <button
            type="button"
            className="pub-site-studio__pane-switch"
            onClick={() => setPane("preview")}
          >
            {t("studioPreview")}
          </button>
        </div>

        <section className="pub-site-studio__canvas" aria-label={t("studioAria")}>
          <div className="pub-site-studio__toolbar">
            <button
              type="button"
              className="pub-site-studio__back"
              onClick={() => setPane("edit")}
            >
              {t("studioEdit")}
            </button>

            {editLocale ? (
              <p className="pub-site-studio__locale" aria-label={t("studioLocaleAria")}>
                {t(`localeTab_${editLocale}`)}
              </p>
            ) : null}
            {onPreviewPick ? (
              <p className="pub-site-studio__pick-hint">{t("editor.previewClickHint")}</p>
            ) : null}
          </div>

          <div className="pub-site-studio__stage">
            <div
              className="pub-site-studio__frame"
              data-device={device}
              onClick={(event) => {
                // Clicks inside the iframe bubble here through the React portal.
                if (onPreviewPick?.(event.target as Element)) setPane("edit");
              }}
            >
              <StudioPreviewIframe title={t("studioCanvasAria")} pickable={Boolean(onPreviewPick)}>
                {preview}
              </StudioPreviewIframe>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
