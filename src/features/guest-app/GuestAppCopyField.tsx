"use client";

import { useState } from "react";

export function GuestAppCopyField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="rounded-xl border border-white/10 bg-zinc-900/60 p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
        {label}
      </p>
      <div className="mt-2 flex items-center gap-2">
        <code className="flex-1 break-all text-sm text-zinc-100">{value}</code>
        <button
          type="button"
          onClick={copy}
          className="shrink-0 rounded-lg bg-[var(--guest-app-primary)] px-3 py-1.5 text-xs font-semibold text-white"
        >
          {copied ? "Copiat" : "Copiază"}
        </button>
      </div>
    </div>
  );
}
