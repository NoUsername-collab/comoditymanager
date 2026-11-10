import { getTranslations } from "next-intl/server";
import { SettingsPageLayout } from "@/components/admin/settings/SettingsPageLayout";
import { SettingsSection } from "@/components/admin/settings/SettingsSection";
import { loadMediaLibraryPage } from "@/features/settings/loaders";
import { MediaLibrary } from "@/features/settings/ui/MediaLibrary";
import { guardSettingsPermission } from "@/lib/settings/page-context";

export const dynamic = "force-dynamic";

export default async function SettingsPhotosPage() {
  const [t, , library] = await Promise.all([
    getTranslations("admin.pages.settings"),
    guardSettingsPermission("pension_settings"),
    loadMediaLibraryPage(),
  ]);

  return (
    <SettingsPageLayout title={t("navPhotos")} description={t("navPhotosDesc")}>
      <SettingsSection title={t("photos.sectionTitle")} description={t("photos.sectionDesc")}>
        <MediaLibrary initial={library.assets} roomTypes={library.roomTypes} />
      </SettingsSection>
    </SettingsPageLayout>
  );
}
