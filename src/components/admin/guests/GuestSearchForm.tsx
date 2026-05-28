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
      className="guest-search"
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
      <div className="guest-search__bar">
        <svg className="guest-search__icon" viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
          <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
        </svg>
        <input
          name="q"
          type="search"
          defaultValue={defaultQuery ?? ""}
          placeholder={tGuests("searchPlaceholder")}
          className="guest-search__input"
          disabled={pending}
        />
        <select
          name="filter"
          defaultValue={defaultFilter}
          className="guest-search__filter"
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
          className="guest-search__submit"
        >
          {pending ? tCommon("checking") : tCommon("search")}
        </button>
      </div>
      {(defaultQuery || defaultFilter !== "all") && (
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            void runAdminAction(async () => {
              router.push("/admin/guests");
            });
          }}
          className="guest-search__reset"
        >
          {tCommon("reset")}
        </button>
      )}
    </form>
  );
}
