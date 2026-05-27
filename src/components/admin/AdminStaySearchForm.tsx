"use client";

import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import {
  useAdminPending,
  useRunAdminAction,
} from "@/components/admin/feedback/AdminPendingProvider";

export function AdminStaySearchForm({ defaultQuery }: { defaultQuery?: string }) {
  const t = useTranslations("admin.common");
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
        void runAdminAction(async () => {
          router.push(q ? `/admin/cazari?q=${encodeURIComponent(q)}` : "/admin/cazari");
        });
      }}
    >
      <input
        name="q"
        type="search"
        defaultValue={defaultQuery ?? ""}
        placeholder={t("searchStay")}
        className="min-w-[260px] flex-1 border border-zinc-300 px-3 py-2 text-sm"
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
              router.push("/admin/cazari");
            });
          }}
        >
          {t("cancel")}
        </button>
      ) : null}
    </form>
  );
}
