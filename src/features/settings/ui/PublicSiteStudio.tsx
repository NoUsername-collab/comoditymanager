"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { consumePublicSiteStudioEnter } from "@/features/settings/ui/public-site-studio-enter";
import "@/styles/features/admin/admin-public-site-studio.css";

type StudioDevice = "desktop" | "tablet" | "phone";
type StudioPane = "edit" | "preview";

const DEVICES: StudioDevice[] = ["desktop", "tablet", "phone"];
const LEAVE_MS = 180;

export function PublicSiteStudio({
  form,
  preview,
  published,
  editLocale,
  localeTabs,
  saveControl,
  dirty,
  banner,
}: {
  form: ReactNode;
  preview: ReactNode;
  published: boolean;
  editLocale?: "ro" | "en" | "bg";
  localeTabs?: ReactNode;
  saveControl?: ReactNode;
  dirty?: boolean;
  banner?: ReactNode;
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

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (window.matchMedia("(max-width: 1099px)").matches && pane === "preview") {
        setPane("edit");
        return;
      }
      leaveStudio();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pane, tSettings, router]);

  return (
    <div
      className="pub-site-studio pub-site-studio--immersive"
      data-pane={pane}
      data-device={device}
      data-enter={enter ? "1" : undefined}
      data-leave={leaving ? "1" : undefined}
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

        <p className="pub-site-studio__live">
          <span className="pub-site-studio__live-dot" aria-hidden />
          <span>{t("studioLiveHint")}</span>
        </p>

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

        {saveControl ? <div className="pub-site-studio__save">{saveControl}</div> : null}
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
          </div>

          <div className="pub-site-studio__stage">
            <div
              className="pub-site-studio__frame"
              data-device={device}
              tabIndex={0}
              aria-label={t("studioCanvasAria")}
            >
              {preview}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
