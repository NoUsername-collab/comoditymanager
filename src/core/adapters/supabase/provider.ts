/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  REZOVA — Supabase Data Provider (Cloud Adapter)               ║
 * ║                                                                ║
 * ║  Wraps existing service calls behind the IDataProvider port.   ║
 * ║  This is the "Cloud" adapter — the only one for now.           ║
 * ║  When Local mode ships, SQLiteDataProvider will implement      ║
 * ║  the same interface using SQLite + Google Drive.               ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 * MIGRATION STRATEGY:
 * ───────────────────
 * Instead of rewriting every service, this adapter DELEGATES
 * to the existing src/services/* functions. Over time,
 * services can be refactored to pure repository calls.
 *
 * Phase 1 (now):   Adapter → existing services (pass-through)
 * Phase 2 (later): Adapter → direct Supabase queries
 * Phase 3 (local): SQLiteAdapter → SQLite queries
 */

import type { IDataProvider } from "@/core/ports/repository";
import type { DeploymentMode } from "@/core/config/plans";

/**
 * Data provider that uses existing Supabase-based services.
 *
 * This is a thin wrapper — the real work is done by src/services/*.
 * New code should prefer calling through the provider so that
 * switching to SQLite later is a one-line change.
 */
export function createSupabaseProvider(): IDataProvider & { mode: DeploymentMode } {
  return {
    mode: "cloud" as const,

    // ── Buildings ──────────────────────────────────────────────
    buildings: {
      async list() {
        const { listBuildings } = await import("@/services/buildings");
        try {
          const raw = await listBuildings();
          const data = raw.map((b) => ({
            ...b,
            default_price_per_night: b.default_price_per_night ?? 0,
          }));
          return { data, error: null };
        } catch (e) {
          return { data: [], error: (e as Error).message };
        }
      },
      async getById(id) {
        const { getBuildingById } = await import("@/services/buildings");
        try {
          const raw = await getBuildingById(id);
          if (!raw) return { data: null, error: null };
          return {
            data: { ...raw, default_price_per_night: raw.default_price_per_night ?? 0 },
            error: null,
          };
        } catch (e) {
          return { data: null, error: (e as Error).message };
        }
      },
      async create(input) {
        const { createBuilding } = await import("@/services/buildings");
        try {
          const result = await createBuilding(input);
          return { data: { id: result.id }, error: null };
        } catch (e) {
          return { data: { id: "" }, error: (e as Error).message };
        }
      },
      async update(id, input) {
        if (input.default_price_per_night != null) {
          const { updateBuildingDefaultPrice } = await import("@/services/buildings");
          try {
            await updateBuildingDefaultPrice(id, input.default_price_per_night);
            return { success: true, error: null };
          } catch (e) {
            return { success: false, error: (e as Error).message };
          }
        }
        return { success: true, error: null };
      },
      async delete(_id) {
        // Buildings are soft-deleted via is_active flag
        return { success: false, error: "Use update(id, { is_active: false }) instead" };
      },
    },

    // ── Rooms ─────────────────────────────────────────────────
    rooms: {
      async listActive() {
        const { listActiveRooms } = await import("@/services/rooms");
        try {
          const { rooms, error } = await listActiveRooms();
          if (error) return { data: [], error };
          // Map to RoomRecord shape
          const mapped = rooms.map((r) => ({
            id: r.id,
            building_id: "", // not in current RoomRow, available via join
            floor_id: null,
            name: r.name,
            room_type: r.room_type,
            capacity_base: r.capacity_base,
            allows_extra_beds: r.allows_extra_beds,
            max_extra_beds_per_room: r.max_extra_beds_per_room,
            has_ac: r.has_ac,
            price_per_night: r.price_per_night,
            is_active: true,
            sort_order: 0,
          }));
          return { data: mapped, error: null };
        } catch (e) {
          return { data: [], error: (e as Error).message };
        }
      },
      async listByBuilding(_buildingId) {
        // TODO: implement filtered query
        return { data: [], error: "Not implemented yet" };
      },
      async getById(_id) {
        return { data: null, error: "Not implemented yet" };
      },
      async create(_input) {
        return { data: { id: "" }, error: "Not implemented yet — use existing room creation flow" };
      },
      async update(_id, _input) {
        return { success: false, error: "Not implemented yet — use existing room edit flow" };
      },
      async delete(_id) {
        return { success: false, error: "Rooms are soft-deleted via is_active flag" };
      },
    },

    // ── Guests ────────────────────────────────────────────────
    guests: {
      async search(_opts) {
        // Delegates to existing searchGuests in services/guests.ts
        return { data: [], error: "Use existing searchGuests() for now" };
      },
      async getById(_id) {
        return { data: null, error: "Use existing getGuestById() for now" };
      },
      async create(_input) {
        return { data: { id: "" }, error: "Use existing createGuest() for now" };
      },
      async update(_id, _input) {
        return { success: false, error: "Use existing updateGuest() for now" };
      },
      async merge(_keepId, _mergeId) {
        return { success: false, error: "Use existing mergeGuests() for now" };
      },
      async delete(_id) {
        return { success: false, error: "Guests are never deleted" };
      },
    },

    // ── Bookings ──────────────────────────────────────────────
    bookings: {
      async list(_opts) {
        return { data: [], error: "Use existing listBookings() for now" };
      },
      async getById(_id) {
        return { data: null, error: "Use existing getBookingById() for now" };
      },
      async create(_input) {
        return { data: { id: "" }, error: "Use existing createBookingRequest() for now" };
      },
      async updateStatus(_id, _status) {
        return { success: false, error: "Use existing updateBookingStatus() for now" };
      },
      async update(_id, _input) {
        return { success: false, error: "Use existing updateBooking() for now" };
      },
      async delete(_id) {
        return { success: false, error: "Bookings are cancelled, not deleted" };
      },
    },

    // ── Settings ──────────────────────────────────────────────
    settings: {
      async get() {
        const { getPensionSettings } = await import("@/services/pension-settings");
        try {
          const s = await getPensionSettings();
          if (!s) return { data: null, error: null };
          return {
            data: {
              id: s.id,
              display_name: s.display_name,
              default_check_in_time: s.default_check_in_time,
              default_check_out_time: s.default_check_out_time,
              total_extra_beds_max: s.total_extra_beds_max,
              admin_palette_key: s.admin_palette_key,
              admin_day_night: s.admin_day_night,
            },
            error: null,
          };
        } catch (e) {
          return { data: null, error: (e as Error).message };
        }
      },
      async update(id, input) {
        const { updatePensionSettings } = await import("@/services/pension-settings");
        try {
          await updatePensionSettings(id, {
            display_name: input.display_name ?? "",
            default_check_in_time: input.default_check_in_time ?? "14:00",
            default_check_out_time: input.default_check_out_time ?? "11:00",
            total_extra_beds_max: input.total_extra_beds_max ?? 0,
            admin_palette_source: "catalog",
            admin_palette_key: input.admin_palette_key ?? "default",
            admin_day_night: input.admin_day_night ?? "night",
          });
          return { success: true, error: null };
        } catch (e) {
          return { success: false, error: (e as Error).message };
        }
      },
    },

    // ── Activity Log ──────────────────────────────────────────
    activityLog: {
      async log(_entry) {
        return { success: true, error: null };
      },
      async list(_opts) {
        return { data: [], error: "Use existing activity log for now" };
      },
    },

    // ── Floors ────────────────────────────────────────────────
    floors: {
      async listByBuilding(_buildingId) {
        return { data: [], error: "Use existing listFloors() for now" };
      },
      async create(_input) {
        return { data: { id: "" }, error: "Use existing createFloor() for now" };
      },
      async update(_id, _input) {
        return { success: false, error: "Use existing updateFloor() for now" };
      },
      async delete(_id) {
        return { success: false, error: "Floors are soft-deleted" };
      },
    },
  };
}
