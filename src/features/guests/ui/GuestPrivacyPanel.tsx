"use client";

import { useState, useTransition } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { AdminInput } from "@/components/admin/ui/AdminInput";
import { eraseGuestPersonalDataAction } from "@/features/guests/privacy-actions";

type Props = {
  guestId: string;
  isOwner: boolean;
  erasedAt: string | null;
};

/** The guest's rights over their data: a copy of it, and erasure on request. */
export function GuestPrivacyPanel({ guestId, isOwner, erasedAt }: Props) {
  const t = useTranslations("admin.guests.privacy");
  const format = useFormatter();
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (erasedAt) {
    return (
      <p className="m-0 text-sm text-[var(--admin-text-muted)]" role="status">
        {t("erasedOn", { date: format.dateTime(new Date(erasedAt), { dateStyle: "long" }) })}
      </p>
    );
  }

  function erase() {
    setError(null);
    startTransition(async () => {
      const result = await eraseGuestPersonalDataAction({ guestId, confirm });
      if (!result.ok) setError(t(`errors.${result.error}`));
      else setConfirm("");
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <p className="m-0 text-sm text-[var(--admin-text-muted)]">{t("exportHint")}</p>
        <Link
          href={`/admin/guests/${guestId}/export`}
          prefetch={false}
          download
          className="admin-btn admin-btn--secondary admin-btn--sm self-start"
        >
          {t("export")}
        </Link>
      </div>

      {isOwner ? (
        <div className="flex flex-col gap-2 border-t border-[var(--admin-border)] pt-4">
          <span className="text-sm font-medium">{t("eraseTitle")}</span>
          <p className="m-0 text-sm text-[var(--admin-text-muted)]">{t("eraseHint")}</p>
          <label className="flex flex-col gap-1 text-sm">
            {t("eraseConfirmLabel")}
            <AdminInput
              fieldSize="sm"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="off"
              className="max-w-[14rem]"
            />
          </label>
          <AdminButton
            type="button"
            size="sm"
            variant="danger"
            className="self-start"
            onClick={erase}
            disabled={pending || !confirm.trim()}
          >
            {pending ? t("erasing") : t("erase")}
          </AdminButton>
          {error ? (
            <p className="m-0 text-sm text-[var(--admin-danger,#b91c1c)]" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      ) : (
        <p className="m-0 text-xs text-[var(--admin-text-muted)]">{t("ownerOnly")}</p>
      )}
    </div>
  );
}
