"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";

/** Serializable step data (no functions — safe for server→client boundary). */
export interface ChecklistStep {
  id: string;
  emoji: string;
  href: string;
  optional: boolean;
  completed: boolean;
}

const STEP_LABELS: Record<string, { done: string; todo: string }> = {
  pension_name:    { done: "Pensiune configurată",  todo: "Configurează pensiunea" },
  first_building:  { done: "Clădire adăugată",      todo: "Adaugă prima clădire" },
  first_room:      { done: "Cameră adăugată",       todo: "Adaugă prima cameră" },
  test_booking:    { done: "Rezervare creată",       todo: "Creează o rezervare test" },
  confirm_booking: { done: "Rezervare confirmată",   todo: "Confirmă o rezervare" },
  invite_team:     { done: "Coleg invitat",          todo: "Invită un coleg (opțional)" },
};

export function OnboardingChecklist({ steps }: { steps: ChecklistStep[] }) {
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
          {steps.map((step) => {
            const labels = STEP_LABELS[step.id];
            const label = step.completed
              ? labels?.done ?? step.id
              : labels?.todo ?? step.id;

            return (
              <Link
                key={step.id}
                href={step.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                  step.completed
                    ? "bg-emerald-950/30 text-emerald-300"
                    : "bg-amber-950/30 text-amber-100 hover:bg-amber-900/40"
                }`}
              >
                <span className="text-base">{step.emoji}</span>
                <span className="flex-1">{label}</span>
                {step.completed ? (
                  <span className="text-emerald-400">✓</span>
                ) : (
                  <span className="text-xs text-amber-500">→</span>
                )}
                {step.optional && !step.completed && (
                  <span className="text-[10px] uppercase tracking-wider text-amber-700">
                    opțional
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
