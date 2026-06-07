"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { undoActivityLogAction } from "@/app/[locale]/admin/(panel)/activity/actions";
import { useAdminFx } from "@/components/admin/feedback/AdminToastProvider";

function UndoIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      className={className}
      aria-hidden
    >
      <path
        d="M3.5 5.5h6a3.5 3.5 0 0 1 0 7H7"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6 3 3.5 5.5 6 8"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type Props = {
  logId: string;
  compact?: boolean;
  className?: string;
};

export function ActivityUndoButton({ logId, compact = false, className = "" }: Props) {
  const t = useTranslations("admin.activity");
  const router = useRouter();
  const { showToast } = useAdminFx();
  const [pending, setPending] = useState(false);

  return (
    <button
      type="button"
      title={t("undo")}
      aria-label={t("undo")}
      disabled={pending}
      className={[
        "activity-undo-btn",
        compact && "activity-undo-btn--compact",
        pending && "activity-undo-btn--pending",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={() => {
        if (!window.confirm(t("undoConfirm"))) return;
        setPending(true);
        void undoActivityLogAction(logId).then((res) => {
          setPending(false);
          if (res.ok) {
            router.refresh();
            showToast({
              kind: "info",
              title: t("undoSuccessTitle"),
              message: t("undoSuccessMessage"),
            });
          } else {
            showToast({
              kind: "error",
              title: t("undoFailedTitle"),
              message: res.error,
            });
          }
        });
      }}
    >
      <UndoIcon className="activity-undo-btn__icon" />
      {!compact && <span>{pending ? t("undoPending") : t("undo")}</span>}
    </button>
  );
}
