"use client";

import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import type { GuestSearchFilter } from "@/domain/guest/types";
import { useAdminPending, useRunAdminAction } from "@/components/admin/feedback/AdminPendingProvider";

export function GuestSearchForm({
  defaultQuery,
  defaultFilter = "all",
}: {
  defaultQuery?: string;
  defaultFilter?: GuestSearchFilter;
}) {
  const tGuests = useTranslations("admin.guests");
  const tCommon = useTranslations("admin.common");
  const router = useRouter();
  const { pending } = useAdminPending();
  const runAdminAction = useRunAdminAction();
  const filterOptions: { value: GuestSearchFilter; label: string }[] = [
    { value: "all", label: tGuests("filters.all") },
    { value: "flagged", label: tGuests("filters.flagged") },
    { value: "blacklist", label: tGuests("filters.blacklist") },
    { value: "watchlist", label: tGuests("filters.watchlist") },
    { value: "recent", label: tGuests("filters.recent") },
    { value: "rated", label: tGuests("filters.rated") },
    { value: "unreviewed", label: tGuests("filters.unreviewed") },
    { value: "loyal", label: tGuests("filters.loyal") },
  ];

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
        placeholder={tGuests("searchPlaceholder")}
        className="min-w-[220px] flex-1 border border-zinc-300 px-3 py-2 text-sm"
        disabled={pending}
      />
      <select
        name="filter"
        defaultValue={defaultFilter}
        className="border border-zinc-300 bg-white px-3 py-2 text-sm"
        disabled={pending}
      >
        {filterOptions.map((option) => (
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
        {pending ? "…" : tCommon("search")}
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
          {tCommon("reset")}
        </button>
      )}
    </form>
  );
}
