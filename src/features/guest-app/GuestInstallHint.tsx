"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

const DISMISS_KEY = "guest-app-install-hint-dismissed";

function isStandalone(): boolean {
  if (typeof window === "undefined") return true;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && (navigator as Navigator & { standalone?: boolean }).standalone === true)
  );
}

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

export function GuestInstallHint() {
  const t = useTranslations("guestApp.install");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    if (window.localStorage.getItem(DISMISS_KEY) === "1") return;
    setVisible(true);
  }, []);

  if (!visible) return null;

  function dismiss() {
    window.localStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  }

  return (
    <aside className="guest-app__install-hint" role="note">
      <p className="guest-app__install-hint__title">{t("title")}</p>
      <p className="guest-app__install-hint__body">
        {isIos() ? t("iosSteps") : t("androidSteps")}
      </p>
      <button type="button" className="guest-app__install-hint__dismiss" onClick={dismiss}>
        {t("dismiss")}
      </button>
    </aside>
  );
}
