import { getTranslations } from "next-intl/server";
import {
  breakdownTenantModules,
  getPlanLimitsSummary,
  planIncludesFeature,
} from "@/core/config/plan-catalog";
import { PLAN_CONFIGS, type CoreFeature, type PlanId } from "@/core/config/plans";
import { TenantSyncPlanModulesButton } from "@/components/platform-admin/TenantSyncPlanModulesButton";

const FEATURE_KEYS: CoreFeature[] = [
  "calendar",
  "gantt",
  "guest_files",
  "bookings",
  "email_notifications",
  "themes",
  "heatmap",
  "rooms_unlimited",
  "priority_support",
  "custom_domain",
  "sla_guarantee",
  "dedicated_manager",
  "onboarding",
  "automations",
];

function formatLimit(value: number, unlimitedLabel: string): string {
  return Number.isFinite(value) ? String(value) : unlimitedLabel;
}

export async function TenantPlanIncludesPanel({
  tenantId,
  planId,
  activeModules,
}: {
  tenantId: string;
  planId: PlanId;
  activeModules: string[];
}) {
  const t = await getTranslations("platformAdmin.tenantDetail.planIncludes");
  const tModule = await getTranslations("platformAdmin.logsPage.modules");
  const plan = PLAN_CONFIGS[planId];
  const limits = getPlanLimitsSummary(planId);
  const modules = breakdownTenantModules(planId, activeModules);
  const unlimited = t("unlimited");

  const features = FEATURE_KEYS.filter((f) => planIncludesFeature(planId, f));

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-3.5 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold uppercase text-neutral-500">
            {t("title")}
          </h2>
          <p className="mt-1 text-xs text-neutral-400">
            {t("subtitle", { plan: plan.label, price: plan.priceEur })}
          </p>
        </div>
        <TenantSyncPlanModulesButton tenantId={tenantId} planId={planId} />
      </div>

      <div className="grid gap-2 text-xs sm:grid-cols-2">
        <LimitRow label={t("maxRooms")} value={formatLimit(limits.maxRooms, unlimited)} />
        <LimitRow
          label={t("maxTeam")}
          value={formatLimit(limits.maxTeamMembers, unlimited)}
        />
        <LimitRow
          label={t("maxProperties")}
          value={formatLimit(limits.maxProperties, unlimited)}
        />
        <LimitRow
          label={t("emailCap")}
          value={
            limits.emailMonthlyCap == null
              ? unlimited
              : String(limits.emailMonthlyCap)
          }
        />
        <LimitRow
          label={t("branding")}
          value={limits.showBranding ? t("brandingOn") : t("brandingOff")}
        />
      </div>

      {features.length > 0 && (
        <div>
          <h3 className="text-xs font-medium text-neutral-400">{t("features")}</h3>
          <ul className="mt-1 flex flex-wrap gap-1.5">
            {features.map((feature) => (
              <li
                key={feature}
                className="rounded-full bg-neutral-800 px-2 py-0.5 text-[11px] text-neutral-300"
              >
                {t(`feature.${feature}`)}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <h3 className="text-xs font-medium text-neutral-400">{t("modules")}</h3>
        <ul className="mt-1 space-y-1">
          {modules.effective.map((moduleId) => {
            const included = modules.includedInPlan.includes(moduleId);
            const addon = modules.activeAddons.includes(moduleId);
            return (
              <li
                key={moduleId}
                className="flex items-center justify-between gap-2 text-xs text-neutral-300"
              >
                <span>{tModule(moduleId)}</span>
                <span
                  className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide ${
                    included
                      ? "bg-emerald-950/60 text-emerald-400"
                      : addon
                        ? "bg-sky-950/60 text-sky-400"
                        : "bg-neutral-800 text-neutral-500"
                  }`}
                >
                  {included ? t("badgeIncluded") : t("badgeAddon")}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function LimitRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2 rounded-md bg-neutral-950/50 px-2 py-1.5">
      <span className="text-neutral-500">{label}</span>
      <span className="font-medium text-neutral-200">{value}</span>
    </div>
  );
}
