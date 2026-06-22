"use client";

import { useState, useTransition } from "react";
import { changeTenantModulesAction } from "@/app/[locale]/nestio-admin/(panel)/actions/tenant-actions";

const ALL_MODULES = [
  { id: "ical_sync", label: "iCal Sync" },
  { id: "invoicing", label: "Facturare" },
  { id: "whatsapp", label: "WhatsApp" },
  { id: "public_page", label: "Pagina publică" },
  { id: "advanced_reports", label: "Rapoarte avansate" },
  { id: "multi_property", label: "Multi-proprietate" },
  { id: "white_label", label: "White Label" },
  { id: "api_access", label: "API Access" },
];

export function TenantModulesForm({
  tenantId,
  currentModules,
}: {
  tenantId: string;
  currentModules: string[];
}) {
  const [selected, setSelected] = useState<string[]>(currentModules);
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);

  const toggle = (moduleId: string) => {
    setSelected((prev) =>
      prev.includes(moduleId)
        ? prev.filter((m) => m !== moduleId)
        : [...prev, moduleId]
    );
  };

  const hasChanged =
    JSON.stringify([...selected].sort()) !==
    JSON.stringify([...currentModules].sort());

  const handleSave = () => {
    if (!hasChanged) return;
    setFeedback(null);
    startTransition(async () => {
      const result = await changeTenantModulesAction(tenantId, selected);
      if (result.success) {
        setFeedback("Module actualizate.");
      } else {
        setFeedback(`Eroare: ${result.error}`);
      }
    });
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {ALL_MODULES.map((m) => (
          <label
            key={m.id}
            className={`nestio-tenant-option flex min-h-[var(--ml-touch-min,2.75rem)] cursor-pointer items-center gap-3 rounded-md border px-3 py-2 text-sm transition-colors ${
              selected.includes(m.id)
                ? "border-sky-600 bg-sky-950/50 text-white"
                : "border-neutral-700 text-neutral-400 hover:border-neutral-600"
            }`}
          >
            <input
              type="checkbox"
              checked={selected.includes(m.id)}
              onChange={() => toggle(m.id)}
              className="h-3.5 w-3.5 rounded border-neutral-600 bg-neutral-800 text-sky-500 focus:ring-sky-600"
            />
            <span className="flex-1">{m.label}</span>
          </label>
        ))}
      </div>

      <button
        onClick={handleSave}
        disabled={isPending || !hasChanged}
        className="w-full rounded-md bg-sky-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? "Se salvează..." : "Salvează module"}
      </button>

      {feedback && (
        <p
          className={`text-xs ${feedback.startsWith("Eroare") ? "text-red-400" : "text-emerald-400"}`}
        >
          {feedback}
        </p>
      )}
    </div>
  );
}
