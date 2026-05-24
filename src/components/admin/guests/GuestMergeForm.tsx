"use client";

import { useState, useTransition } from "react";
import { mergeGuestsAction } from "@/app/admin/(panel)/guests/actions";

export function GuestMergeForm({
  guestId,
  duplicates,
}: {
  guestId: string;
  duplicates: {
    id: string;
    display_name: string;
    email: string | null;
    phone: string | null;
  }[];
}) {
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState("");

  if (duplicates.length === 0) return null;

  return (
    <form
      action={(fd) => startTransition(() => mergeGuestsAction(fd))}
      className="mt-4 space-y-2 rounded border border-amber-200 bg-amber-50 p-3"
    >
      <input type="hidden" name="target_id" value={guestId} />
      <p className="text-sm font-semibold text-amber-950">
        Posibile duplicate — combină manual
      </p>
      <select
        name="source_id"
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        className="w-full border border-zinc-300 px-2 py-2 text-sm"
        required
      >
        <option value="">Alege profilul de combinat…</option>
        {duplicates.map((d) => (
          <option key={d.id} value={d.id}>
            {d.display_name}
            {d.email ? ` · ${d.email}` : ""}
            {d.phone ? ` · ${d.phone}` : ""}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={pending || !selected}
        className="rounded border border-amber-400 bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-950 disabled:opacity-60"
      >
        {pending ? "Combin…" : "Combină profilul selectat aici"}
      </button>
    </form>
  );
}
