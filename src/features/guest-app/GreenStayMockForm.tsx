"use client";

import { useState } from "react";

export function GreenStayMockForm({ description }: { description?: string }) {
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/40 p-4 text-sm text-emerald-100">
        Cererea a fost înregistrată (demo). Recepția va fi notificată în versiunea
        finală.
      </div>
    );
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        setSubmitted(true);
      }}
    >
      {description ? (
        <p className="text-sm leading-relaxed text-zinc-300">{description}</p>
      ) : null}
      <label className="flex items-start gap-3 text-sm text-zinc-200">
        <input type="checkbox" className="mt-1" required />
        <span>
          Solicit omiterea curățăeniei zilnice pentru ziua de mâine (demo — nu se
          trimite încă la recepție).
        </span>
      </label>
      <button
        type="submit"
        className="w-full rounded-xl bg-[var(--guest-app-primary)] px-4 py-3 text-sm font-semibold text-white"
      >
        Trimite cererea
      </button>
    </form>
  );
}
