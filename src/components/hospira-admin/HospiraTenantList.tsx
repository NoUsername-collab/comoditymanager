"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { TenantBillingToggle } from "@/components/hospira-admin/TenantBillingToggle";
import { TenantCsvExportButton } from "@/components/hospira-admin/TenantCsvExportButton";
import { CopyTextButton } from "@/components/hospira-admin/CopyTextButton";
import type { PlatformTenantSummary } from "@/services/platform-admin";

import { HOSPIRA_STATUS_BADGE } from "@/lib/hospira-admin/status-badge";

const STATUS_BADGE = HOSPIRA_STATUS_BADGE;

type StatusFilter = "all" | "active" | "trial" | "suspended" | "cancelled";

export function HospiraTenantList({
  tenants,
}: {
  tenants: PlatformTenantSummary[];
}) {
  const t = useTranslations("hospiraAdmin.tenants");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [planFilter, setPlanFilter] = useState("all");

  const planOptions = useMemo(() => {
    const plans = new Set<string>();
    for (const tenant of tenants) {
      plans.add(tenant.plan_id || "free");
    }
    return [...plans].sort();
  }, [tenants]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tenants.filter((tenant) => {
      if (statusFilter !== "all" && tenant.status !== statusFilter) return false;
      const plan = tenant.plan_id || "free";
      if (planFilter !== "all" && plan !== planFilter) return false;
      if (!q) return true;
      const domainMatch = (tenant.domain_hosts ?? []).some((host) =>
        host.toLowerCase().includes(q)
      );
      return (
        tenant.display_name.toLowerCase().includes(q) ||
        tenant.slug.toLowerCase().includes(q) ||
        (tenant.owner_email?.toLowerCase().includes(q) ?? false) ||
        domainMatch
      );
    });
  }, [tenants, query, statusFilter, planFilter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">
          {t("title", { count: tenants.length })}
        </h1>
        <p className="text-sm text-neutral-500">
          {t("showing", { filtered: filtered.length, total: tenants.length })}
        </p>
      </div>

      <div className="hospira-tenant-toolbar flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("searchPlaceholder")}
          className="min-h-[var(--ml-touch-min,2.75rem)] flex-1 rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-sky-600 focus:outline-none"
          aria-label={t("searchPlaceholder")}
        />
        <TenantCsvExportButton />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="min-h-[var(--ml-touch-min,2.75rem)] rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 focus:border-sky-600 focus:outline-none"
          aria-label={t("statusFilter")}
        >
          <option value="all">{t("statusAll")}</option>
          <option value="active">{t("statusActive")}</option>
          <option value="trial">{t("statusTrial")}</option>
          <option value="suspended">{t("statusSuspended")}</option>
          <option value="cancelled">{t("statusCancelled")}</option>
        </select>
        <select
          value={planFilter}
          onChange={(e) => setPlanFilter(e.target.value)}
          className="min-h-[var(--ml-touch-min,2.75rem)] rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 focus:border-sky-600 focus:outline-none"
          aria-label={t("planFilter")}
        >
          <option value="all">{t("planAll")}</option>
          {planOptions.map((plan) => (
            <option key={plan} value={plan}>
              {plan}
            </option>
          ))}
        </select>
      </div>

      <HospiraTenantsMobileCards tenants={filtered} />

      <div className="hospira-tenant-table-desktop max-h-[min(75dvh,40rem)] overflow-auto rounded-lg border border-neutral-800">
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-800 bg-neutral-900 text-left text-xs uppercase text-neutral-500">
            <tr>
              <th className="px-3 py-2">{t("colName")}</th>
              <th className="px-3 py-2">{t("colSlug")}</th>
              <th className="px-3 py-2">{t("colPlan")}</th>
              <th className="px-3 py-2">{t("colStatus")}</th>
              <th className="px-3 py-2 text-right">{t("colRooms")}</th>
              <th className="px-3 py-2 text-right">{t("colBookings")}</th>
              <th className="px-3 py-2 text-right">{t("colMembers")}</th>
              <th className="px-3 py-2">{t("colBilling")}</th>
              <th className="px-3 py-2">{t("colCreated")}</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800">
            {filtered.map((tenant) => (
              <tr
                key={tenant.id}
                className="hospira-tenant-row transition-colors hover:bg-neutral-900/50"
              >
                <td className="px-3 py-2 font-medium text-white">
                  {tenant.display_name}
                </td>
                <td className="px-3 py-2 font-mono text-xs text-neutral-400">
                  <div className="flex items-center gap-2">
                    <span>{tenant.slug}</span>
                    <CopyTextButton text={tenant.slug} />
                  </div>
                </td>
                <td className="px-3 py-2">
                  <span className="rounded-full bg-neutral-800 px-2 py-0.5 text-xs font-medium capitalize text-neutral-300">
                    {tenant.plan_id || "free"}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[tenant.status] ?? STATUS_BADGE.cancelled}`}
                  >
                    {tenant.status}
                  </span>
                </td>
                <td className="px-3 py-2 text-right text-neutral-300">
                  {tenant.room_count}
                </td>
                <td className="px-3 py-2 text-right text-neutral-300">
                  {tenant.booking_count}
                </td>
                <td className="px-3 py-2 text-right text-neutral-300">
                  {tenant.member_count}
                </td>
                <td className="px-3 py-2">
                  <TenantBillingToggle
                    tenantId={tenant.id}
                    isPaying={tenant.is_paying ?? false}
                  />
                </td>
                <td className="px-3 py-2 text-xs text-neutral-500">
                  {new Date(tenant.created_at).toLocaleDateString("ro")}
                </td>
                <td className="px-3 py-2 text-right">
                  <Link
                    href={`/hospira-admin/tenants/${tenant.id}`}
                    className="text-xs text-sky-400 hover:text-sky-300"
                  >
                    {t("details")} →
                  </Link>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={10}
                  className="px-4 py-4 text-center text-neutral-500"
                >
                  {tenants.length === 0 ? t("empty") : t("noMatches")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function HospiraTenantsMobileCards({
  tenants,
}: {
  tenants: PlatformTenantSummary[];
}) {
  const t = useTranslations("hospiraAdmin.tenants");

  if (tenants.length === 0) {
    return (
      <p className="hospira-tenant-cards hospira-tenant-cards--empty rounded-lg border border-neutral-800 px-4 py-4 text-center text-neutral-500">
        {t("noMatches")}
      </p>
    );
  }

  return (
    <ul className="hospira-tenant-cards space-y-3">
      {tenants.map((tenant) => (
        <li
          key={tenant.id}
          className="hospira-tenant-card rounded-lg border border-neutral-800 bg-neutral-900 p-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-semibold text-white">
                {tenant.display_name}
              </p>
              <p className="font-mono text-xs text-neutral-500">{tenant.slug}</p>
            </div>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[tenant.status] ?? STATUS_BADGE.cancelled}`}
            >
              {tenant.status}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-neutral-800 px-2 py-1 capitalize text-neutral-300">
              {tenant.plan_id || "free"}
            </span>
            <span className="rounded-full bg-neutral-800 px-2 py-1 text-neutral-400">
              {tenant.room_count} {t("roomsShort")}
            </span>
            <span className="rounded-full bg-neutral-800 px-2 py-1 text-neutral-400">
              {tenant.booking_count} {t("bookingsShort")}
            </span>
            <span className="rounded-full bg-neutral-800 px-2 py-1 text-neutral-400">
              {tenant.member_count} {t("membersShort")}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <TenantBillingToggle
              tenantId={tenant.id}
              isPaying={tenant.is_paying ?? false}
            />
            <Link
              href={`/hospira-admin/tenants/${tenant.id}`}
              className="hospira-tenant-card__detail inline-flex min-h-[var(--ml-touch-min,2.75rem)] items-center rounded-md border border-neutral-700 bg-neutral-800 px-4 text-sm font-medium text-sky-400 hover:bg-neutral-700"
            >
              {t("details")} →
            </Link>
          </div>

          <p className="mt-2 text-[11px] text-neutral-500">
            {t("created", {
              date: new Date(tenant.created_at).toLocaleDateString("ro"),
            })}
          </p>
        </li>
      ))}
    </ul>
  );
}
