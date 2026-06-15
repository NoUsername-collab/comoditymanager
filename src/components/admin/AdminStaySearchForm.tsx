"use client";

import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import {
  useAdminPending,
  useRunAdminAction,
} from "@/components/admin/feedback/AdminPendingProvider";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { AdminInput } from "@/components/admin/ui/AdminInput";

function buildCazariHref(
  q: string,
  preserve?: { view?: string; h?: string }
): string {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (preserve?.view && preserve.view !== "confirmate") {
    params.set("view", preserve.view);
  }
  if (preserve?.h && preserve.h !== "30d") params.set("h", preserve.h);
  const qs = params.toString();
  return qs ? `/admin/cazari?${qs}` : "/admin/cazari";
}

export function AdminStaySearchForm({
  defaultQuery,
  preserveParams,
}: {
  defaultQuery?: string;
  preserveParams?: { view?: string; h?: string };
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
      <AdminInput
        name="q"
        type="search"
        defaultValue={defaultQuery ?? ""}
        placeholder={t("searchStay")}
        className="min-w-0 w-full flex-1"
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
        <AdminButton
          variant="secondary"
          disabled={pending}
          onClick={() => {
            void runAdminAction(async () => {
              router.push(buildCazariHref("", preserveParams));
            });
          }}
        >
          {t("cancel")}
        </AdminButton>
      ) : null}
    </form>
  );
}
