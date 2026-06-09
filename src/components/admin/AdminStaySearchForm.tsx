"use client";

import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import {
  useAdminPending,
  useRunAdminAction,
} from "@/components/admin/feedback/AdminPendingProvider";

function buildCazariHref(
  q: string,
  preserve?: { tab?: string; h?: string }
): string {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (preserve?.tab && preserve.tab !== "ops") params.set("tab", preserve.tab);
  if (preserve?.h && preserve.h !== "30d") params.set("h", preserve.h);
  const qs = params.toString();
  return qs ? `/admin/cazari?${qs}` : "/admin/cazari";
}

export function AdminStaySearchForm({
  defaultQuery,
  preserveParams,
}: {
  defaultQuery?: string;
  preserveParams?: { tab?: string; h?: string };
}) {
  const t = useTranslations("admin.common");
  const router = useRouter();
  const { pending } = useAdminPending();
  const runAdminAction = useRunAdminAction();

  return (
    <form
      className="cazari-search-form flex flex-wrap gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const q = String(fd.get("q") ?? "").trim();
        void runAdminAction(async () => {
          router.push(buildCazariHref(q, preserveParams));
        });
      }}
    >
      <input
        name="q"
        type="search"
        defaultValue={defaultQuery ?? ""}
        placeholder={t("searchStay")}
        className="min-w-0 w-full flex-1 border border-zinc-300 px-3 py-2 text-base sm:text-sm"
        disabled={pending}
      />
      <button
        type="submit"
        disabled={pending}
        className="admin-cereri-fill px-4 py-2 text-sm font-medium disabled:opacity-60"
      >
        {pending ? "…" : t("searchGuest")}
      </button>
      {defaultQuery?.trim() ? (
        <button
          type="button"
          disabled={pending}
          className="border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 disabled:opacity-60"
          onClick={() => {
            void runAdminAction(async () => {
              router.push(buildCazariHref("", preserveParams));
            });
          }}
        >
          {t("cancel")}
        </button>
      ) : null}
    </form>
  );
}
