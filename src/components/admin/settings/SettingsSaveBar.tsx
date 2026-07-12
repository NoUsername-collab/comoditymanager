"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";

type Props = {
  children: ReactNode;
  hint?: string;
  status?: "idle" | "saving" | "success" | "error";
  statusMessage?: string;
};

const STATUS_TEXT_CLASS: Record<NonNullable<Props["status"]>, string> = {
  idle: "text-[var(--admin-text-muted,#71717a)]",
  saving: "text-[var(--admin-text,#18181b)]",
  success: "text-[var(--admin-tint-success-text,#059669)]",
  error: "text-[var(--admin-tint-danger-text,#b91c1c)]",
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
    <div
      className="settings-save-bar mt-2"
      role="group"
      aria-label={t("saveBarAria")}
    >
      <div
        className={[
          "settings-save-bar__inner",
          "flex flex-wrap items-center justify-between gap-[0.65rem]",
          "rounded-[var(--admin-surface-radius,1rem)] border border-[var(--admin-surface-border,#e4e4e7)]",
          "bg-[var(--surface-2,#fafafa)] px-[0.85rem] py-3",
        ].join(" ")}
      >
        {message ? (
          <p
            className={[
              "m-0 min-w-32 flex-1 text-xs leading-snug",
              STATUS_TEXT_CLASS[status],
            ].join(" ")}
            role={status === "error" ? "alert" : "status"}
            aria-live="polite"
          >
            {message}
          </p>
        ) : null}
        <div className="settings-save-bar__actions ml-auto flex justify-end">
          {children}
        </div>
      </div>
    </div>
  );
}
