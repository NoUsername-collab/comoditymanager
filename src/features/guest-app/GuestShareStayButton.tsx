"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { copyTextToClipboard } from "@/lib/guest-app/copy-text";
import { useGuestAppToast } from "./GuestAppToast";

export function GuestShareStayButton() {
  const t = useTranslations("guestApp.home");
  const { showToast } = useGuestAppToast();
  const [pending, setPending] = useState(false);

  async function share() {
    if (pending) return;
    setPending(true);
    const url = window.location.href.split("#")[0] ?? window.location.href;

    try {
      if (navigator.share) {
        await navigator.share({
          title: document.title,
          url,
        });
        showToast(t("shareSuccess"));
      } else {
        const ok = await copyTextToClipboard(url);
        showToast(ok ? t("linkCopied") : t("shareFailed"));
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        setPending(false);
        return;
      }
      const ok = await copyTextToClipboard(url);
      showToast(ok ? t("linkCopied") : t("shareFailed"));
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      className="guest-app__share-btn"
      onClick={share}
      disabled={pending}
    >
      {t("shareStay")}
    </button>
  );
}
