import { after } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { CACHE_TAGS, tenantTag } from "@/lib/cache-tags";

type BookingSurfaceOptions = {
  tenantId?: string;
  bookingId?: string;
  includeHistoric?: boolean;
  includeStatistics?: boolean;
  includeRequests?: boolean;
  includeCalendar?: boolean;
  includePublicCalendar?: boolean;
  includeInvoice?: boolean;
  includeCheckins?: boolean;
  availability?: boolean;
  reception?: boolean;
};

/**
 * Marks booking data caches stale. Cheap — does not rebuild RSC trees.
 * Call on the mutation hot path so the next occupancy/list read is fresh.
 */
export function bustBookingDataCache(
  tenantId?: string,
  extra?: { checkins?: boolean },
) {
  if (tenantId) {
    revalidateTag(tenantTag(tenantId, CACHE_TAGS.bookingCounts), "max");
    if (extra?.checkins) {
      revalidateTag(tenantTag(tenantId, CACHE_TAGS.checkins), "max");
    }
  } else {
    revalidateTag(CACHE_TAGS.bookingCounts, "max");
    if (extra?.checkins) {
      revalidateTag(CACHE_TAGS.checkins, "max");
    }
  }
}

function revalidateBookingPaths(options?: BookingSurfaceOptions) {
  if (options?.includeCalendar !== false) {
    revalidatePath("/admin/calendar");
  }
  revalidatePath("/admin/bookings");
  revalidatePath("/admin/cazari");
  if (options?.includeHistoric) {
    revalidatePath("/admin/istoric");
  }
  if (options?.includeStatistics) {
    revalidatePath("/admin/statistics");
  }
  if (options?.includeRequests) {
    revalidatePath("/admin/cazari");
  }
  if (options?.bookingId) {
    revalidatePath(`/admin/bookings/${options.bookingId}`);
    if (options.includeInvoice) {
      revalidatePath(`/admin/bookings/${options.bookingId}/factura`);
    }
  }
  if (options?.includePublicCalendar) {
    revalidatePath("/calendar");
  }
  if (options?.availability) {
    revalidatePath("/admin/disponibilitate");
  }
  if (options?.reception) {
    revalidatePath("/receptie");
  }
}

/**
 * Production default after a booking mutation:
 * tags now (next read/mutation is consistent), path rebuild after the response.
 */
export function invalidateBookingSurfaces(options?: BookingSurfaceOptions) {
  bustBookingDataCache(options?.tenantId, { checkins: options?.includeCheckins });
  after(() => {
    revalidateBookingPaths(options);
  });
}

/** Gantt holds/blocks — occupancy only, no booking list churn. */
export function revalidateAdminCalendar() {
  revalidatePath("/admin/calendar");
}

/** Undo on activity log may touch bookings, calendar, history, settings. */
export function revalidateAfterActivityUndo() {
  revalidatePath("/admin/settings");
  invalidateBookingSurfaces({ includeHistoric: true });
}

/** Public site request or admin phone booking — sync guest + admin views. */
export function revalidatePublicBookingSurfaces(options?: {
  availability?: boolean;
  reception?: boolean;
  tenantId?: string;
}) {
  invalidateBookingSurfaces({
    tenantId: options?.tenantId,
    includePublicCalendar: true,
    availability: options?.availability,
    reception: options?.reception,
  });
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
  bustBookingDataCache(tenantId);
  revalidateBookingPaths({ includeCalendar: true });
}

/**
 * Shared cache invalidation after booking/calendar mutations.
 * Tags are busted immediately; page rebuilds run after the response.
 */
export function revalidateBookingSurfaces(
  tenantId?: string,
  options?: { includeCalendar?: boolean },
) {
  invalidateBookingSurfaces({
    tenantId,
    includeCalendar: options?.includeCalendar,
  });
}

export function revalidateBookingSurfacesExtended(options?: {
  tenantId?: string;
  bookingId?: string;
  includeHistoric?: boolean;
  includeStatistics?: boolean;
  includeRequests?: boolean;
  includeCalendar?: boolean;
}) {
  invalidateBookingSurfaces(options);
}

/** Check-in / payment on booking — calendar + stays + detail (no statistics/history). */
export function revalidateBookingOperativeSurfaces(
  bookingId: string,
  tenantId?: string,
) {
  invalidateBookingSurfaces({
    tenantId,
    bookingId,
    includeCheckins: true,
  });
}

/** Confirm/cancel/check-in ops on one booking — admin, public calendar, invoice. */
export function revalidateBookingDetailSurfaces(bookingId: string, tenantId?: string) {
  invalidateBookingSurfaces({
    tenantId,
    bookingId,
    includeHistoric: true,
    includeStatistics: true,
    includePublicCalendar: true,
    includeInvoice: true,
    includeCheckins: true,
  });
}
