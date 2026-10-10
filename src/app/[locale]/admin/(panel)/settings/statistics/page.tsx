import { localeRedirect as redirect } from "@/i18n/server-redirect";
import { guardSettingsOwner } from "@/lib/settings/page-context";

export const dynamic = "force-dynamic";

/** Statistics access now lives with the other team permissions; keep old links working. */
export default async function SettingsStatisticsPage() {
  await guardSettingsOwner();
  await redirect("/admin/settings/team-permissions#statistics-access");
}
