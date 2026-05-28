"use client";

import { useTranslations } from "next-intl";
import { AdminMetricHint } from "@/components/admin/ui/AdminMetricHint";

export type GuestScoreHintKind = "trust" | "loyalty" | "stars";

export function GuestScoreHint({
  kind,
  wide = true,
}: {
  kind: GuestScoreHintKind;
  wide?: boolean;
}) {
  const t = useTranslations("admin.guests.scoreHints");

  return (
    <span className={wide ? "guest-score-hint guest-score-hint--wide" : "guest-score-hint"}>
      <AdminMetricHint text={t(kind)} label={t(`${kind}Label`)} />
    </span>
  );
}
