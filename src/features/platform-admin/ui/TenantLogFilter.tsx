"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

export function TenantLogFilter({
  tenants,
}: {
  tenants: { id: string; slug: string; displayName: string }[];
}) {
  const t = useTranslations("platformAdmin.logsPage.filter");
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get("tenant") ?? "";

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    const params = new URLSearchParams(searchParams.toString());
    if (val) {
      params.set("tenant", val);
    } else {
      params.delete("tenant");
    }
    router.push(`?${params.toString()}`);
  };

  return (
    <select
      value={current}
      onChange={handleChange}
      className="nestio-log-filter min-h-[var(--ml-touch-min,2.75rem)] rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-200 focus:border-sky-600 focus:outline-none"
    >
      <option value="">{t("allTenants")}</option>
      {tenants.map((row) => (
        <option key={row.id} value={row.id}>
          {row.displayName} ({row.slug})
        </option>
      ))}
    </select>
  );
}
