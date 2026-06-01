"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import type { StepStatus } from "@/domain/onboarding/progress";

export function OnboardingChecklist({ steps }: { steps: StepStatus[] }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mt-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-xs text-amber-400 hover:text-amber-300 transition-colors"
      >
        {expanded ? "Ascunde pașii ▲" : "Vezi pașii ▼"}
      </button>

      {expanded && (
        <div className="mt-3 space-y-1.5">
          {steps.map(({ step, completed }) => (
            <Link
              key={step.id}
              href={step.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                completed
                  ? "bg-emerald-950/30 text-emerald-300"
                  : "bg-amber-950/30 text-amber-100 hover:bg-amber-900/40"
              }`}
            >
              <span className="text-base">{step.emoji}</span>
              <span className="flex-1">
                {step.id === "pension_name" && (completed ? "Pensiune configurată" : "Configurează pensiunea")}
                {step.id === "first_building" && (completed ? "Clădire adăugată" : "Adaugă prima clădire")}
                {step.id === "first_room" && (completed ? "Cameră adăugată" : "Adaugă prima cameră")}
                {step.id === "test_booking" && (completed ? "Rezervare creată" : "Creează o rezervare test")}
                {step.id === "confirm_booking" && (completed ? "Rezervare confirmată" : "Confirmă o rezervare")}
                {step.id === "invite_team" && (completed ? "Coleg invitat" : "Invită un coleg (opțional)")}
              </span>
              {completed ? (
                <span className="text-emerald-400">✓</span>
              ) : (
                <span className="text-xs text-amber-500">→</span>
              )}
              {step.optional && !completed && (
                <span className="text-[10px] uppercase tracking-wider text-amber-700">
                  opțional
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
