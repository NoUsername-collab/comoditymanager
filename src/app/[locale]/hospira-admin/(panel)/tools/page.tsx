import { getTranslations } from "next-intl/server";
import { auditCriticalMigrations } from "@/lib/hospira-admin/migration-audit";
import { getPlatformInfraHealth } from "@/lib/hospira-admin/platform-health";
import { PlatformDevTools } from "@/components/hospira-admin/PlatformDevTools";
import { PlatformEnvChecklist } from "@/components/hospira-admin/PlatformEnvChecklist";
import { PlatformHealthStrip } from "@/components/hospira-admin/PlatformHealthStrip";

export default async function HospiraAdminToolsPage() {
  const t = await getTranslations("hospiraAdmin.tools");
  const [infraHealth, migrations] = await Promise.all([
    getPlatformInfraHealth(),
    auditCriticalMigrations(),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">{t("title")}</h1>
        <p className="mt-1 text-sm text-neutral-500">{t("lead")}</p>
      </div>

      <PlatformHealthStrip health={infraHealth} />
      <PlatformEnvChecklist />
      <PlatformDevTools migrations={migrations} />
    </div>
  );
}
