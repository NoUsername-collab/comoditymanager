import { Link } from "@/i18n/navigation";
import { AdminRetroPageFrame } from "@/components/admin/retro/AdminRetroPageFrame";
import { AdminRoomCatalogPanel } from "@/components/admin/catalog/AdminRoomCatalogPanel";
import { listRoomOptions, listRoomTypes } from "@/services/room-catalog";
import { requireLocationAdmin } from "@/lib/auth/require-staff";
import { getTranslations } from "next-intl/server";

export default async function LocationSetupPage() {
  const [tPage, tCommon, catalogResult] = await Promise.all([
    getTranslations("admin.pages.settingsLocation"),
    getTranslations("admin.common"),
    Promise.all([
      requireLocationAdmin(),
      listRoomTypes(true),
      listRoomOptions(true),
    ])
      .then(([, types, options]) => ({
        ok: true as const,
        catalogTypes: types,
        catalogOptions: options,
      }))
      .catch((e) => ({
        ok: false as const,
        error: e instanceof Error ? e.message : "catalogUnavailable",
      })),
  ]);

  let catalogError: string | null = null;
  let catalogTypes: Awaited<ReturnType<typeof listRoomTypes>> = [];
  let catalogOptions: Awaited<ReturnType<typeof listRoomOptions>> = [];
  if (catalogResult.ok) {
    catalogTypes = catalogResult.catalogTypes;
    catalogOptions = catalogResult.catalogOptions;
  } else {
    catalogError =
      catalogResult.error === "catalogUnavailable"
        ? tPage("catalogUnavailable")
        : catalogResult.error;
  }

  return (
    <AdminRetroPageFrame
      title={tPage("setup.title")}
      className="admin-settings-page w-full max-w-none"
      description={tPage("setup.description")}
    >
      <div className="mb-4">
        <Link
          href="/admin/settings/location"
          className="text-sm text-zinc-600 underline hover:text-zinc-900"
        >
          {tPage("backToLocationHub")}
        </Link>
      </div>

      <div className="mb-4 grid gap-2 md:grid-cols-2">
        <Link
          href="/admin/settings/location/structure"
          className="rounded-xl border-2 border-zinc-900 bg-zinc-900 px-3 py-3 text-white shadow-sm hover:bg-zinc-800"
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
          className="rounded-xl border border-zinc-300 bg-white px-3 py-3 hover:bg-zinc-50"
        >
          <span className="block text-sm font-semibold text-zinc-900">
            {tPage("setup.addRoomsTitle")}
          </span>
          <span className="mt-1 block text-sm text-zinc-600">
            {tPage("setup.addRoomsBody")}
          </span>
        </Link>
      </div>

      <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
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
