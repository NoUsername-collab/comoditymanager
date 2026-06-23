"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";

type Props = {
  children: ReactNode;
  hint?: string;
  status?: "idle" | "saving" | "success" | "error";
  statusMessage?: string;
};

/** Sticky save actions — visible above mobile bottom nav on compact layout. */
export function SettingsSaveBar({
  children,
  hint,
  status = "idle",
  statusMessage,
}: Props) {
  const t = useTranslations("admin.pages.settings");
  const message = statusMessage ?? hint;

  return (
    <div className="settings-save-bar" role="group" aria-label={t("saveBarAria")}>
      <div className="settings-save-bar__inner">
        {message ? (
          <p
            className={[
              "settings-save-bar__status",
              status !== "idle" && `settings-save-bar__status--${status}`,
            ]
              .filter(Boolean)
              .join(" ")}
            role={status === "error" ? "alert" : "status"}
            aria-live="polite"
          >
            {message}
          </p>
        ) : null}
        <div className="settings-save-bar__actions">{children}</div>
      </div>
    </div>
  );
}
