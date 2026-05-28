"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  stopSimulationAction,
  advanceDayAction,
  advanceWeekAction,
  advanceMonthAction,
} from "@/app/[locale]/admin/(panel)/simulation/actions";

type SimOverlayProps = {
  active: boolean;
  currentDate: string | null;
  daysAdvanced: number;
  realDate: string;
};

export function SimOverlay({
  active: initialActive,
  currentDate: initialDate,
  daysAdvanced: initialDays,
  realDate,
}: SimOverlayProps) {
  const t = useTranslations("admin.simulation");
  const [active, setActive] = useState(initialActive);
  const [currentDate, setCurrentDate] = useState(initialDate);
  const [daysAdvanced, setDaysAdvanced] = useState(initialDays);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [showConfirmStop, setShowConfirmStop] = useState(false);

  function handleStop() {
    setError(null);
    setShowConfirmStop(false);
    startTransition(async () => {
      const result = await stopSimulationAction();
      if (result.ok) {
        setActive(false);
        setCurrentDate(null);
        setDaysAdvanced(0);
      } else {
        setError(result.error);
      }
    });
  }

  function handleAdvance(
    action: typeof advanceDayAction
  ) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        setCurrentDate(result.currentDate ?? currentDate);
        setDaysAdvanced(result.daysAdvanced ?? daysAdvanced);
      } else {
        setError(result.error);
      }
    });
  }

  // Not active — trigger is now in the top bar (SimTriggerChip)
  if (!active) return null;

  // Active — show full overlay bar
  return (
    <div className="sim-overlay">
      <div className="sim-overlay__bar">
        <div className="sim-overlay__indicator">
          <span className="sim-overlay__dot" />
          <span className="sim-overlay__label">{t("simActive")}</span>
        </div>

        <div className="sim-overlay__date">
          <span className="sim-overlay__date-label">{t("simDate")}</span>
          <span className="sim-overlay__date-value">{currentDate}</span>
          <span className="sim-overlay__days">
            {t("daysAdvanced", { count: daysAdvanced })}
          </span>
        </div>

        <div className="sim-overlay__controls">
          <button
            type="button"
            className="sim-overlay__btn sim-overlay__btn--advance"
            onClick={() => handleAdvance(advanceDayAction)}
            disabled={isPending}
            title={t("nextDay")}
          >
            +1 {t("dayShort")}
          </button>
          <button
            type="button"
            className="sim-overlay__btn sim-overlay__btn--advance"
            onClick={() => handleAdvance(advanceWeekAction)}
            disabled={isPending}
            title={t("nextWeek")}
          >
            +7 {t("dayShort")}
          </button>
          <button
            type="button"
            className="sim-overlay__btn sim-overlay__btn--advance"
            onClick={() => handleAdvance(advanceMonthAction)}
            disabled={isPending}
            title={t("nextMonth")}
          >
            +30 {t("dayShort")}
          </button>

          {showConfirmStop ? (
            <div className="sim-overlay__confirm-stop">
              <span className="sim-overlay__confirm-text">{t("confirmStop")}</span>
              <button
                type="button"
                className="sim-overlay__btn sim-overlay__btn--stop-yes"
                onClick={handleStop}
                disabled={isPending}
              >
                {t("yes")}
              </button>
              <button
                type="button"
                className="sim-overlay__btn sim-overlay__btn--stop-no"
                onClick={() => setShowConfirmStop(false)}
              >
                {t("no")}
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="sim-overlay__btn sim-overlay__btn--stop"
              onClick={() => setShowConfirmStop(true)}
              disabled={isPending}
            >
              {t("stopSim")}
            </button>
          )}
        </div>

        {isPending && (
          <span className="sim-overlay__loading">{t("processing")}</span>
        )}
      </div>

      {error && (
        <div className="sim-overlay__error">{error}</div>
      )}
    </div>
  );
}
