"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { GUEST_RETENTION_CHOICES } from "@/domain/guest/privacy";
import { updateGuestRetentionAction } from "@/features/guests/privacy-actions";

/** How long guests' identity documents are kept after their last stay. */
export function GuestRetentionPanel({ months }: { months: number }) {
  const t = useTranslations("admin.guests.privacy");
  const [value, setValue] = useState(months);
  const [status, setStatus] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const choices: number[] = GUEST_RETENTION_CHOICES.includes(months as (typeof GUEST_RETENTION_CHOICES)[number])
    ? [...GUEST_RETENTION_CHOICES]
    : [...GUEST_RETENTION_CHOICES, months].sort((a, b) => a - b);

  function save(next: number) {
    const previous = value;
    setValue(next);
    setStatus(null);
    startTransition(async () => {
      const result = await updateGuestRetentionAction(next);
      if (result.ok) {
        setStatus(t("retentionSaved"));
      } else {
        setValue(previous);
        setStatus(t(`errors.${result.error}`));
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="flex flex-col gap-1 text-sm">
        {t("retentionLabel")}
        <select
          className="checkin-field__input checkin-field__input--narrow"
          value={value}
          disabled={pending}
          onChange={(e) => save(Number(e.target.value))}
        >
          {choices.map((m) => (
            <option key={m} value={m}>
              {t("retentionMonths", { count: m })}
            </option>
          ))}
        </select>
      </label>
      <p className="m-0 text-sm text-[var(--admin-text-muted)]">{t("retentionHint")}</p>
      {status ? (
        <p className="m-0 text-xs text-[var(--admin-text-muted)]" role="status">
          {status}
        </p>
      ) : null}
    </div>
  );
}
