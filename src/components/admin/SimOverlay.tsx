"use client";

import { useTranslations } from "next-intl";

type SimOverlayProps = {
  active: boolean;
  currentDate: string | null;
  daysAdvanced: number;
  realDate: string;
};

/**
 * Thin fixed banner at the bottom edge of the viewport.
 * Reminds the user they're in simulation mode.
 * All controls (advance / stop) live in the top-bar SimTriggerChip.
 */
export function SimOverlay({
  active,
  currentDate,
  daysAdvanced,
  realDate,
}: SimOverlayProps) {
  const t = useTranslations("admin.simulation");

  if (!active) return null;

  return (
    <div className="sim-bottom-strip" role="status" aria-live="polite">
      <span className="sim-bottom-strip__dot" />
      <span className="sim-bottom-strip__text">
        ⚠ {t("simActive")} — {currentDate}
        {daysAdvanced > 0 && ` (+${daysAdvanced}d)`}
        {" · "}
        {t("realDateLabel", { date: realDate })}
      </span>
    </div>
  );
}
