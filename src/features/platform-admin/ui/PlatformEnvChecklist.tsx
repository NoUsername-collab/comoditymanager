import { getTranslations } from "next-intl/server";
import {
  getPlatformCronStatus,
  getPlatformEnvChecklist,
} from "@/lib/platform-admin/platform-env-check";

export async function PlatformEnvChecklist() {
  const t = await getTranslations("platformAdmin.tools.env");
  const checklist = getPlatformEnvChecklist();
  const cron = getPlatformCronStatus();

  const configured = checklist.filter((item) => item.configured).length;

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-3.5">
      <h2 className="text-base font-semibold">{t("title")}</h2>
      <p className="mt-1 text-xs text-neutral-500">
        {t("summary", { configured, total: checklist.length })}
      </p>

      <ul className="mt-3 space-y-1">
        {checklist.map((item) => (
          <li
            key={item.key}
            className={`flex items-center justify-between gap-2 rounded px-2 py-1 text-xs ${
              item.configured
                ? "text-neutral-400"
                : item.required
                  ? "bg-red-950/30 text-red-300"
                  : "bg-amber-950/20 text-amber-300"
            }`}
          >
            <span className="font-mono">{item.key}</span>
            <span>
              {item.configured
                ? t("configured")
                : item.required
                  ? t("missingRequired")
                  : t("missingOptional")}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-4 border-t border-neutral-800 pt-3">
        <h3 className="text-sm font-medium text-neutral-300">{t("cronTitle")}</h3>
        <p className="mt-1 text-xs text-neutral-500">
          {cron.secretConfigured ? t("cronSecretOk") : t("cronSecretMissing")}
        </p>
        <ul className="mt-2 space-y-1 text-xs text-neutral-400">
          {cron.endpoints.map((endpoint) => (
            <li key={endpoint.path} className="font-mono">
              {endpoint.path} — {endpoint.schedule}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
