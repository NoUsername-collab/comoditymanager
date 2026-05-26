"use client";

import { useRouter } from "next/navigation";
import type { GuestSearchFilter } from "@/domain/guest/types";
import { useAdminPending, useRunAdminAction } from "@/components/admin/feedback/AdminPendingProvider";

const FILTER_OPTIONS: { value: GuestSearchFilter; label: string }[] = [
  { value: "all", label: "Toți" },
  { value: "flagged", label: "Flag-uiți" },
  { value: "blacklist", label: "Blacklist" },
  { value: "watchlist", label: "Watchlist" },
  { value: "recent", label: "Recenți" },
  { value: "rated", label: "Cu review" },
  { value: "unreviewed", label: "Fără review" },
  { value: "loyal", label: "Fideli" },
];

export function GuestSearchForm({
  defaultQuery,
  defaultFilter = "all",
}: {
  defaultQuery?: string;
  defaultFilter?: GuestSearchFilter;
}) {
  const router = useRouter();
  const { pending } = useAdminPending();
  const runAdminAction = useRunAdminAction();

  return (
    <form
      className="flex flex-wrap gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const q = String(fd.get("q") ?? "").trim();
        const filter = String(fd.get("filter") ?? "all").trim();
        const params = new URLSearchParams();
        if (q) params.set("q", q);
        if (filter && filter !== "all") params.set("filter", filter);
        void runAdminAction(async () => {
          router.push(params.size > 0 ? `/admin/guests?${params}` : "/admin/guests");
        });
      }}
    >
      <input
        name="q"
        type="search"
        defaultValue={defaultQuery ?? ""}
        placeholder="Caută nume, email, telefon…"
        className="min-w-[220px] flex-1 border border-zinc-300 px-3 py-2 text-sm"
        disabled={pending}
      />
      <select
        name="filter"
        defaultValue={defaultFilter}
        className="border border-zinc-300 bg-white px-3 py-2 text-sm"
        disabled={pending}
      >
        {FILTER_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={pending}
        className="admin-cereri-fill px-4 py-2 text-sm font-medium disabled:opacity-60"
      >
        {pending ? "…" : "Caută"}
      </button>
      {(defaultQuery || defaultFilter !== "all") && (
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            void runAdminAction(async () => {
              router.push("/admin/guests");
            });
          }}
          className="rounded border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
        >
          Resetează
        </button>
      )}
    </form>
  );
}
