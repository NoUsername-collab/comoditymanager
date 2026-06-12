"use client";

import { useTranslations } from "next-intl";
import { AdminMetricHint } from "@/components/admin/ui/AdminMetricHint";

export function GuestScoreHint({ wide = true }: { wide?: boolean }) {
  const t = useTranslations("admin.guests.scoreHints");

  return (
    <span className={wide ? "guest-score-hint guest-score-hint--wide" : "guest-score-hint"}>
      <AdminMetricHint text={t("stars")} label={t("starsLabel")} />
    </span>
  );
}
