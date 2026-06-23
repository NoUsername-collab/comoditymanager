import { revalidatePath, revalidateTag } from "next/cache";
import { CACHE_TAGS, tenantTag } from "@/lib/cache-tags";

/** Gantt holds/blocks — occupancy only, no booking list churn. */
export function revalidateAdminCalendar() {
  revalidatePath("/admin/calendar");
}

/** Undo on activity log may touch bookings, calendar, istoric, settings. */
export function revalidateAfterActivityUndo() {
  revalidatePath("/admin/settings");
  revalidateBookingSurfacesExtended({ includeHistoric: true });
}

/** Public site request or admin phone booking — sync guest + admin views. */
export function revalidatePublicBookingSurfaces(options?: {
  disponibilitate?: boolean;
  receptie?: boolean;
}) {
  revalidateBookingSurfaces();
  revalidatePath("/calendar");
  if (options?.disponibilitate) {
    revalidatePath("/admin/disponibilitate");
  }
  if (options?.receptie) {
    revalidatePath("/receptie");
  }
}

/**
 * Factory reset — invalidate all tenant-scoped cached admin data.
 * @param tenantId — when provided, only busts this tenant's cache (recommended)
 */
export function revalidateAfterFactoryReset(tenantId?: string) {
  if (tenantId) {
    revalidateTag(tenantTag(tenantId, CACHE_TAGS.pensionSettings), "max");
    revalidateTag(tenantTag(tenantId, CACHE_TAGS.buildings), "max");
    revalidateTag(tenantTag(tenantId, CACHE_TAGS.rooms), "max");
    revalidateTag(tenantTag(tenantId, CACHE_TAGS.roomCatalog), "max");
    revalidateTag(tenantTag(tenantId, CACHE_TAGS.roomOptionsByRoom), "max");
  } else {
    revalidateTag(CACHE_TAGS.pensionSettings, "max");
    revalidateTag(CACHE_TAGS.buildings, "max");
    revalidateTag(CACHE_TAGS.rooms, "max");
    revalidateTag(CACHE_TAGS.roomCatalog, "max");
    revalidateTag(CACHE_TAGS.roomOptionsByRoom, "max");
  }
  revalidatePath("/admin", "layout");
  revalidatePath("/admin/settings");
  revalidatePath("/admin/settings/location");
  revalidatePath("/admin/buildings");
  revalidateBookingSurfaces(tenantId);
}

/**
 * Shared cache invalidation after booking/calendar mutations.
 * @param tenantId — when provided, only busts this tenant's booking cache
 */
export function revalidateBookingSurfaces(tenantId?: string) {
  if (tenantId) {
    revalidateTag(tenantTag(tenantId, CACHE_TAGS.bookingCounts), "max");
  } else {
    revalidateTag(CACHE_TAGS.bookingCounts, "max");
  }
  revalidatePath("/admin/calendar");
  revalidatePath("/admin/bookings");
  revalidatePath("/admin/cazari");
}

export function revalidateBookingSurfacesExtended(options?: {
  tenantId?: string;
  bookingId?: string;
  includeHistoric?: boolean;
  includeStatistics?: boolean;
  includeCereri?: boolean;
}) {
  revalidateBookingSurfaces(options?.tenantId);
  if (options?.includeHistoric) {
    revalidatePath("/admin/istoric");
  }
  if (options?.includeStatistics) {
    revalidatePath("/admin/statistics");
  }
  if (options?.includeCereri) {
    revalidatePath("/admin/cereri");
  }
  if (options?.bookingId) {
    revalidatePath(`/admin/bookings/${options.bookingId}`);
  }
}

/** Check-in / payment on booking — calendar + cazări + detail (fără statistici/istoric). */
export function revalidateBookingOperativeSurfaces(
  bookingId: string,
  tenantId?: string,
) {
  revalidateBookingSurfaces(tenantId);
  revalidatePath(`/admin/bookings/${bookingId}`);
}

/** Confirm/cancel/check-in ops on one booking — admin, public calendar, invoice. */
export function revalidateBookingDetailSurfaces(bookingId: string, tenantId?: string) {
  revalidateBookingSurfacesExtended({
    tenantId,
    bookingId,
    includeHistoric: true,
    includeStatistics: true,
  });
  revalidatePath(`/admin/bookings/${bookingId}/factura`);
  revalidatePath("/calendar");
}
