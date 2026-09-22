"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

type StudioDevice = "desktop" | "tablet" | "phone";
type StudioPane = "edit" | "preview";

const DEVICES: StudioDevice[] = ["desktop", "tablet", "phone"];

export function PublicSiteStudio({
  form,
  preview,
  published,
}: {
  form: ReactNode;
  preview: ReactNode;
  published: boolean;
}) {
  const t = useTranslations("admin.pages.publicSite");
  const [pane, setPane] = useState<StudioPane>("edit");
  const [device, setDevice] = useState<StudioDevice>("desktop");

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1099px)");
    function syncLock() {
      const lock = pane === "preview" && mq.matches;
      document.body.style.overflow = lock ? "hidden" : "";
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setPane("edit");
    }
    syncLock();
    mq.addEventListener("change", syncLock);
    window.addEventListener("keydown", onKey);
    return () => {
      mq.removeEventListener("change", syncLock);
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [pane]);

  return (
    <div className="pub-site-studio" data-pane={pane} data-device={device}>
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
  );
}
