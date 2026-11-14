import { getTranslations } from "next-intl/server";
import { SettingsPageLayout } from "@/components/admin/settings/SettingsPageLayout";
import { SettingsSection } from "@/components/admin/settings/SettingsSection";
import { IcalSyncPanel } from "@/features/settings/ui/IcalSyncPanel";
import { loadSettingsIcalPage } from "@/features/settings/loaders";
import { guardSettingsPermission } from "@/lib/settings/page-context";
import { checkModule } from "@/core/hooks/use-feature-gate";
import { Link } from "@/i18n/navigation";

export const dynamic = "force-dynamic";

export default async function SettingsIcalPage() {
  const [t, tSettings] = await Promise.all([
    getTranslations("admin.ical"),
    getTranslations("admin.pages.settings"),
    guardSettingsPermission("pension_settings"),
  ]);

  if (!checkModule("ical_sync")) {
    return (
      <SettingsPageLayout title={tSettings("navIcal")} description={tSettings("navIcalDesc")}>
        <SettingsSection title={t("title")} description={t("lead")}>
          <p className="settings-empty">
            {t("planRequired")}{" "}
            <Link href="/admin/settings/billing" className="underline">
              {t("planLink")}
            </Link>
          </p>
        </SettingsSection>
      </SettingsPageLayout>
    );
  }

  const { rooms, origin } = await loadSettingsIcalPage();
  return (
    <SettingsPageLayout title={tSettings("navIcal")} description={tSettings("navIcalDesc")}>
      <SettingsSection title={t("title")} description={t("lead")}>
        <IcalSyncPanel rooms={rooms} origin={origin} />
      </SettingsSection>
    </SettingsPageLayout>
  );
}
