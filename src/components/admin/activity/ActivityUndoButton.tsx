"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { undoActivityLogAction } from "@/app/[locale]/admin/(panel)/activity/actions";
import { useAdminFx } from "@/components/admin/feedback/AdminToastProvider";

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
        "inline-flex items-center gap-1 rounded-md border border-amber-200/90 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-900 transition hover:bg-amber-100 disabled:opacity-50",
        compact && "px-1.5",
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
      <span aria-hidden>↩</span>
      {!compact && <span>{pending ? t("undoPending") : t("undo")}</span>}
    </button>
  );
}
