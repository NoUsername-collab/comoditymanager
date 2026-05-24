"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function GuestSearchForm({ defaultQuery }: { defaultQuery?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="flex flex-wrap gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const q = String(fd.get("q") ?? "").trim();
        startTransition(() => {
          router.push(q ? `/admin/guests?q=${encodeURIComponent(q)}` : "/admin/guests");
        });
      }}
    >
      <input
        name="q"
        type="search"
        defaultValue={defaultQuery ?? ""}
        placeholder="Caută nume, email, telefon…"
        className="min-w-[220px] flex-1 border border-zinc-300 px-3 py-2 text-sm"
      />
      <button
        type="submit"
        disabled={pending}
        className="admin-cereri-fill px-4 py-2 text-sm font-medium disabled:opacity-60"
      >
        {pending ? "…" : "Caută"}
      </button>
    </form>
  );
}
