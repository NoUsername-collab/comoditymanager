import { getTranslations } from "next-intl/server";
import {
  onboardingProgressTone,
  type TenantOnboardingItem,
} from "@/domain/platform-admin/tenant-onboarding";
import { getTenantOnboardingChecklist } from "@/services/tenant-onboarding";

const TONE_CLASS = {
  ok: "text-emerald-400",
  warn: "text-amber-400",
  bad: "text-red-400",
} as const;

export async function TenantOnboardingChecklistPanel({
  tenantId,
}: {
  tenantId: string;
}) {
  const [checklist, t] = await Promise.all([
    getTenantOnboardingChecklist(tenantId),
    getTranslations("platformAdmin.tenantDetail.onboarding"),
  ]);

  if (!checklist) return null;

  const tone = onboardingProgressTone(
    checklist.readyCount,
    checklist.totalRequired,
  );

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-3.5 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold uppercase text-neutral-500">
            {t("title")}
          </h2>
          <p className={`mt-1 text-xs ${TONE_CLASS[tone]}`}>
            {checklist.isGoLiveReady
              ? t("ready")
              : t("progress", {
                  ready: checklist.readyCount,
                  total: checklist.totalRequired,
                })}
          </p>
        </div>
        {checklist.isGoLiveReady && (
          <span className="rounded-full bg-emerald-950/50 px-2 py-0.5 text-[10px] font-medium uppercase text-emerald-400">
            {t("goLive")}
          </span>
        )}
      </div>

      <ul className="space-y-1.5">
        {checklist.items.map((item) => (
          <ChecklistRow
            key={item.id}
            item={item}
            label={t(`item.${item.id}`)}
            optionalLabel={t("optional")}
          />
        ))}
      </ul>
    </div>
  );
}

function ChecklistRow({
  item,
  label,
  optionalLabel,
}: {
  item: TenantOnboardingItem;
  label: string;
  optionalLabel: string;
}) {
  return (
    <li className="flex items-start gap-2 text-xs">
      <span
        className={item.ok ? "text-emerald-400" : "text-neutral-500"}
        aria-hidden
      >
        {item.ok ? "✓" : "○"}
      </span>
      <span className={item.ok ? "text-neutral-300" : "text-neutral-400"}>
        {label}
        {!item.required && (
          <span className="ml-1 text-[10px] uppercase text-neutral-600">
            ({optionalLabel})
          </span>
        )}
      </span>
    </li>
  );
}
