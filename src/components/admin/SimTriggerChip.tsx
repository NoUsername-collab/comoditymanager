"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { startSimulationAction } from "@/app/[locale]/admin/(panel)/simulation/actions";

export function SimTriggerChip({ simActive }: { simActive: boolean }) {
  const t = useTranslations("admin.simulation");
  const [isPending, startTransition] = useTransition();

  if (simActive) return null;

  function handleStart() {
    startTransition(async () => {
      await startSimulationAction();
    });
  }

  return (
    <button
      type="button"
      className="admin-hud__chip admin-hud__chip--sim"
      onClick={handleStart}
      disabled={isPending}
      title={t("startSim")}
    >
      <span className="admin-hud__chip-sim-icon" aria-hidden>
        ⚗
      </span>
      <span className="admin-hud__chip-label-text">
        {isPending ? t("starting") : "Sim"}
      </span>
    </button>
  );
}
