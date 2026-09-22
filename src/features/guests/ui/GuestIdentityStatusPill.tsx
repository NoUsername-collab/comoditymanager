"use client";

import { useTranslations } from "next-intl";

function IdentityStatusPill({
  status,
  t,
  compact = false,
}: {
  status: string;
  t: (key: string) => string;
  compact?: boolean;
}) {
  const cls = [
    "guest-identity-status",
    compact && "guest-identity-status--compact",
    status === "complete" && "guest-identity-status--complete",
    status === "partial" && "guest-identity-status--partial",
    status === "draft" && "guest-identity-status--draft",
  ]
    .filter(Boolean)
    .join(" ");

  const icon = status === "complete" ? "✓" : status === "partial" ? "○" : "−";
  const label = t(`status.${status}`);

  return (
    <span className={cls}>
      <span className="guest-identity-status__icon">{icon}</span>
      {label}
    </span>
  );
}

export function GuestIdentityStatusPill({
  status,
  compact = false,
}: {
  status: string;
  compact?: boolean;
}) {
  const t = useTranslations("admin.guests.identity");
  return <IdentityStatusPill status={status} t={t} compact={compact} />;
}
