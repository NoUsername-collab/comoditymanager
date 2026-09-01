import { getTranslations } from "next-intl/server";
import { auditCriticalMigrations } from "@/lib/platform-admin/migration-audit";
import { getPlatformInfraHealth } from "@/lib/platform-admin/platform-health";
import { PlatformDevTools } from "@/features/platform-admin/ui/PlatformDevTools";
import { PlatformEnvChecklist } from "@/features/platform-admin/ui/PlatformEnvChecklist";
import { PlatformHealthStrip } from "@/features/platform-admin/ui/PlatformHealthStrip";

export default async function PlatformAdminToolsPage() {
  const t = await getTranslations("platformAdmin.tools");
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
