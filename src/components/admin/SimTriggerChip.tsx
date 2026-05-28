"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  startSimulationAction,
  stopSimulationAction,
  advanceDayAction,
  advanceWeekAction,
  advanceMonthAction,
} from "@/app/[locale]/admin/(panel)/simulation/actions";

/**
 * Two-state chip that lives in the admin top bar.
 *
 * INACTIVE → bright red "⚠ Sim" button to start simulation
 * ACTIVE   → danger banner with date, advance controls, and stop
 */
export function SimTriggerChip({
  simActive,
  simDate,
  simDays,
}: {
  simActive: boolean;
  simDate?: string | null;
  simDays?: number;
}) {
  const t = useTranslations("admin.simulation");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showConfirmStop, setShowConfirmStop] = useState(false);

  function handleStart() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await startSimulationAction();
        if (!result.ok) {
          console.error("Sim start failed:", result.error);
          setError(result.error);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        console.error("Sim start exception:", msg);
        setError(msg);
      }
    });
  }

  function handleAdvance(action: typeof advanceDayAction) {
    setError(null);
    startTransition(async () => {
      try {
        const result = await action();
        if (!result.ok) {
          console.error("Sim advance failed:", result.error);
          setError(result.error);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        console.error("Sim advance exception:", msg);
        setError(msg);
      }
    });
  }

  function handleStop() {
    setError(null);
    setShowConfirmStop(false);
    startTransition(async () => {
      try {
        const result = await stopSimulationAction();
        if (!result.ok) {
          console.error("Sim stop failed:", result.error);
          setError(result.error);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        console.error("Sim stop exception:", msg);
        setError(msg);
      }
    });
  }

  /* ── INACTIVE: show start button ── */
  if (!simActive) {
    return (
      <div className="sim-trigger-wrap">
        <button
          type="button"
          className="sim-trigger-chip"
          onClick={handleStart}
          disabled={isPending}
          title={t("startSim")}
        >
          <span className="sim-trigger-chip__icon" aria-hidden>⚠</span>
          <span className="sim-trigger-chip__text">
            {isPending ? t("starting") : "Sim"}
          </span>
          {isPending && <span className="sim-trigger-chip__spinner" />}
        </button>
        {error && (
          <div className="sim-error-toast" role="alert">
            <span className="sim-error-toast__icon">✕</span>
            <span className="sim-error-toast__msg">{error}</span>
            <button
              type="button"
              className="sim-error-toast__dismiss"
              onClick={() => setError(null)}
            >
              ✕
            </button>
          </div>
        )}
      </div>
    );
  }

  /* ── ACTIVE: danger bar with controls ── */
  return (
    <div className="sim-trigger-wrap">
      <div className="sim-active-bar">
        <div className="sim-active-bar__indicator">
          <span className="sim-active-bar__dot" />
          <span className="sim-active-bar__label">SIM</span>
        </div>

        <span className="sim-active-bar__date">{simDate ?? "—"}</span>
        {typeof simDays === "number" && simDays > 0 && (
          <span className="sim-active-bar__days">+{simDays}d</span>
        )}

        <div className="sim-active-bar__controls">
          <button
            type="button"
            className="sim-active-bar__btn"
            onClick={() => handleAdvance(advanceDayAction)}
            disabled={isPending}
            title={t("nextDay")}
          >
            +1d
          </button>
          <button
            type="button"
            className="sim-active-bar__btn"
            onClick={() => handleAdvance(advanceWeekAction)}
            disabled={isPending}
            title={t("nextWeek")}
          >
            +7d
          </button>
          <button
            type="button"
            className="sim-active-bar__btn"
            onClick={() => handleAdvance(advanceMonthAction)}
            disabled={isPending}
            title={t("nextMonth")}
          >
            +30d
          </button>

          {showConfirmStop ? (
            <>
              <button
                type="button"
                className="sim-active-bar__btn sim-active-bar__btn--stop-confirm"
                onClick={handleStop}
                disabled={isPending}
              >
                {t("yes")}
              </button>
              <button
                type="button"
                className="sim-active-bar__btn sim-active-bar__btn--cancel"
                onClick={() => setShowConfirmStop(false)}
              >
                ✕
              </button>
            </>
          ) : (
            <button
              type="button"
              className="sim-active-bar__btn sim-active-bar__btn--stop"
              onClick={() => setShowConfirmStop(true)}
              disabled={isPending}
            >
              STOP
            </button>
          )}
        </div>

        {isPending && <span className="sim-active-bar__spinner" />}
      </div>

      {error && (
        <div className="sim-error-toast" role="alert">
          <span className="sim-error-toast__icon">✕</span>
          <span className="sim-error-toast__msg">{error}</span>
          <button
            type="button"
            className="sim-error-toast__dismiss"
            onClick={() => setError(null)}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
