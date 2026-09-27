"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import "@/styles/features/admin/admin-public-site-studio.css";
import "@/styles/features/admin/admin-guest-app-preview.css";

type StudioPane = "edit" | "preview";

const LEAVE_MS = 180;

export function GuestAppStudio({
  form,
  preview,
  saveControl,
  dirty,
  banner,
  enabled,
}: {
  form: ReactNode;
  preview: ReactNode;
  saveControl?: ReactNode;
  dirty?: boolean;
  banner?: ReactNode;
  enabled: boolean;
}) {
  const t = useTranslations("admin.pages.guestApp");
  const tSettings = useTranslations("admin.pages.settings");
  const router = useRouter();
  const [pane, setPane] = useState<StudioPane>("edit");
  const [leaving, setLeaving] = useState(false);
  const dirtyRef = useRef(Boolean(dirty));
  dirtyRef.current = Boolean(dirty);
  const leavingRef = useRef(false);

  useEffect(() => {
    document.documentElement.dataset.pubStudio = "immersive";
    document.body.style.overflow = "hidden";
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
      className="pub-site-studio pub-site-studio--immersive guest-app-studio"
      data-pane={pane}
      data-device="phone"
      data-leave={leaving ? "1" : undefined}
    >
      <header className="pub-site-studio__chrome">
        <button type="button" className="pub-site-studio__back-settings" onClick={leaveStudio}>
          ← {t("studioBackSettings")}
        </button>

        <p className="pub-site-studio__live">
          <span className="pub-site-studio__live-dot" aria-hidden />
          <span>{t("studioLiveHint")}</span>
        </p>

        {!enabled ? (
          <p className="pub-site-studio__unpublished" role="status">
            {t("previewDisabled")}
          </p>
        ) : null}

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
          </div>

          <div className="pub-site-studio__stage">
            <div
              className="pub-site-studio__frame"
              data-device="phone"
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
