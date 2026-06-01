"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function TenantLogFilter({
  tenants,
}: {
  tenants: { id: string; slug: string; displayName: string }[];
}) {
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
      className="rounded-md border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-sm text-neutral-200 focus:border-sky-600 focus:outline-none"
    >
      <option value="">Toți tenanții</option>
      {tenants.map((t) => (
        <option key={t.id} value={t.id}>
          {t.displayName} ({t.slug})
        </option>
      ))}
    </select>
  );
}
