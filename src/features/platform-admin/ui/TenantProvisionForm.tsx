"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { PLAN_CONFIGS, type PlanId } from "@/core/config/plans";
import { slugifyTenantName } from "@/lib/platform-admin/tenant-slug";
import { provisionTenantAction } from "@/features/platform-admin/provision-actions";

const PLAN_OPTIONS = Object.keys(PLAN_CONFIGS) as PlanId[];

export function TenantProvisionForm() {
  const t = useTranslations("platformAdmin.tenants.provision");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [slug, setSlug] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [locale, setLocale] = useState<"ro" | "en" | "bg">("ro");
  const [country, setCountry] = useState<"RO" | "MD" | "BG">("RO");
  const [planId, setPlanId] = useState<PlanId>("free");

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await provisionTenantAction({
        displayName,
        slug: slug.trim() || slugifyTenantName(displayName),
        ownerEmail,
        ownerPassword,
        locale,
        country,
        planId,
      });

      if (!result.success) {
        setError(result.error ?? t("failed"));
        return;
      }

      setOpen(false);
      setDisplayName("");
      setSlug("");
      setOwnerEmail("");
      setOwnerPassword("");
      router.push(`/platform-admin/tenants/${result.tenantId}`);
      router.refresh();
    });
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="min-h-[var(--ml-touch-min,2.75rem)] rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
      >
        {t("open")}
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-neutral-800 bg-neutral-900 p-4 space-y-3"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-white">{t("title")}</h2>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-neutral-500 hover:text-neutral-300"
        >
          {t("cancel")}
        </button>
      </div>
      <p className="text-xs text-neutral-500">{t("hint")}</p>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span className="text-neutral-400">{t("displayName")}</span>
          <input
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full min-h-[var(--ml-touch-min,2.75rem)] rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-neutral-100 focus:border-sky-600 focus:outline-none"
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-neutral-400">{t("slug")}</span>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase())}
            placeholder={slugifyTenantName(displayName) || "pension-demo"}
            className="w-full min-h-[var(--ml-touch-min,2.75rem)] rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 font-mono text-neutral-100 focus:border-sky-600 focus:outline-none"
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-neutral-400">{t("ownerEmail")}</span>
          <input
            required
            type="email"
            value={ownerEmail}
            onChange={(e) => setOwnerEmail(e.target.value)}
            className="w-full min-h-[var(--ml-touch-min,2.75rem)] rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-neutral-100 focus:border-sky-600 focus:outline-none"
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-neutral-400">{t("ownerPassword")}</span>
          <input
            required
            type="password"
            minLength={8}
            value={ownerPassword}
            onChange={(e) => setOwnerPassword(e.target.value)}
            className="w-full min-h-[var(--ml-touch-min,2.75rem)] rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-neutral-100 focus:border-sky-600 focus:outline-none"
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-neutral-400">{t("locale")}</span>
          <select
            value={locale}
            onChange={(e) => setLocale(e.target.value as "ro" | "en" | "bg")}
            className="w-full min-h-[var(--ml-touch-min,2.75rem)] rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-neutral-200 focus:border-sky-600 focus:outline-none"
          >
            <option value="ro">ro</option>
            <option value="en">en</option>
            <option value="bg">bg</option>
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-neutral-400">{t("country")}</span>
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value as "RO" | "MD" | "BG")}
            className="w-full min-h-[var(--ml-touch-min,2.75rem)] rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-neutral-200 focus:border-sky-600 focus:outline-none"
          >
            <option value="RO">RO</option>
            <option value="MD">MD</option>
            <option value="BG">BG</option>
          </select>
        </label>
        <label className="space-y-1 text-sm sm:col-span-2">
          <span className="text-neutral-400">{t("plan")}</span>
          <select
            value={planId}
            onChange={(e) => setPlanId(e.target.value as PlanId)}
            className="w-full min-h-[var(--ml-touch-min,2.75rem)] rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-neutral-200 focus:border-sky-600 focus:outline-none"
          >
            {PLAN_OPTIONS.map((plan) => (
              <option key={plan} value={plan}>
                {plan}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && (
        <p className="text-xs text-red-400" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="min-h-[var(--ml-touch-min,2.75rem)] rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
      >
        {pending ? t("submitting") : t("submit")}
      </button>
    </form>
  );
}
