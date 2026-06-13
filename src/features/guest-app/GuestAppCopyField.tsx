"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { copyTextToClipboard } from "@/lib/guest-app/copy-text";
import { useGuestAppToast } from "./GuestAppToast";

type Props = {
  label: string;
  value: string;
  compact?: boolean;
};

export function GuestAppCopyField({ label, value, compact = false }: Props) {
  const t = useTranslations("guestApp.copy");
  const { showToast } = useGuestAppToast();
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");

  async function copy() {
    const ok = await copyTextToClipboard(value);
    setStatus(ok ? "copied" : "failed");
    showToast(ok ? t("copiedLive", { label }) : t("failedLive"));
    window.setTimeout(() => setStatus("idle"), 2500);
  }

  return (
    <div
      className={
        compact
          ? "guest-app__copy-field guest-app__copy-field--compact"
          : "guest-app__panel guest-app__copy-field"
      }
    >
      <p className="guest-app__copy-field__label">{label}</p>
      <button
        type="button"
        onClick={copy}
        className="guest-app__copy-field__row"
        aria-label={t("copyAria", { label })}
      >
        <code className="guest-app__copy-field__value">{value}</code>
        <span
          className={[
            "guest-app__copy-field__btn",
            status === "copied" && "guest-app__copy-field__btn--success",
            status === "failed" && "guest-app__copy-field__btn--failed",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {status === "copied" ? t("copied") : status === "failed" ? t("failed") : t("copy")}
        </span>
      </button>
    </div>
  );
}
