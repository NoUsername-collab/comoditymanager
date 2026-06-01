import { Link } from "@/i18n/navigation";
import { AdminRetroPageFrame } from "@/components/admin/retro/AdminRetroPageFrame";
import { AdminRoomCatalogPanel } from "@/components/admin/catalog/AdminRoomCatalogPanel";
import { listRoomOptions, listRoomTypes } from "@/services/room-catalog";
import { requireLocationAdmin } from "@/lib/auth/require-staff";
import { getTranslations } from "next-intl/server";

export default async function LocationSetupPage() {
  const tPage = await getTranslations("admin.pages.settingsLocation");
  const tCommon = await getTranslations("admin.common");
  await requireLocationAdmin();

  let catalogError: string | null = null;
  let catalogTypes: Awaited<ReturnType<typeof listRoomTypes>> = [];
  let catalogOptions: Awaited<ReturnType<typeof listRoomOptions>> = [];

  try {
    catalogTypes = await listRoomTypes(true);
    catalogOptions = await listRoomOptions(true);
  } catch (e) {
    catalogError = e instanceof Error ? e.message : tPage("catalogUnavailable");
  }

  return (
    <AdminRetroPageFrame
      title={tPage("setup.title")}
      className="admin-settings-page w-full max-w-none px-4 py-6 sm:px-6 lg:px-8"
      description={tPage("setup.description")}
    >
      <div className="mb-6">
        <Link
          href="/admin/settings/location"
          className="text-sm text-zinc-600 underline hover:text-zinc-900"
        >
          {tPage("backToLocationHub")}
        </Link>
      </div>

      <div className="mb-8 grid gap-3 md:grid-cols-2">
        <Link
          href="/admin/settings/location/structure"
          className="rounded-xl border-2 border-zinc-900 bg-zinc-900 px-4 py-4 text-white shadow-sm hover:bg-zinc-800"
        >
          <span className="block text-sm font-semibold">
            {tPage("structure.cardStructureTitle")}
          </span>
          <span className="mt-1 block text-sm text-zinc-200">
            {tPage("structure.cardStructureBody")}
          </span>
        </Link>
        <Link
          href="/admin/rooms/new?return_to=structure"
          className="rounded-xl border border-zinc-300 bg-white px-4 py-4 hover:bg-zinc-50"
        >
          <span className="block text-sm font-semibold text-zinc-900">
            {tPage("setup.addRoomsTitle")}
          </span>
          <span className="mt-1 block text-sm text-zinc-600">
            {tPage("setup.addRoomsBody")}
          </span>
        </Link>
      </div>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-zinc-900">{tCommon("modularCatalog")}</h2>
        <p className="mt-1 text-sm text-zinc-600">{tPage("catalog.subtitle")}</p>
        <div className="mt-4">
          <AdminRoomCatalogPanel
            types={catalogTypes}
            options={catalogOptions}
            catalogError={catalogError}
          />
        </div>
      </section>
    </AdminRetroPageFrame>
  );
}
