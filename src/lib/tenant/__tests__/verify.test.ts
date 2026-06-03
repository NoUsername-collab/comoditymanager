import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  requireBuildingInTenant,
  requireRoomInTenant,
  requireRoomsInTenant,
  requireRoomTypeInTenant,
} from "@/lib/tenant/verify";

// ---------------------------------------------------------------------------
// Mock helpers
// ---------------------------------------------------------------------------

function mockSupabase(response: { data: unknown; error: unknown }) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(response),
  };
  return { from: vi.fn().mockReturnValue(chain), _chain: chain } as any;
}

function mockSupabaseArray(response: { data: unknown[] | null; error: unknown }) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockResolvedValue(response),
  };
  return { from: vi.fn().mockReturnValue(chain), _chain: chain } as any;
}

const TENANT = "tenant-1";

// ---------------------------------------------------------------------------
// requireBuildingInTenant
// ---------------------------------------------------------------------------

describe("requireBuildingInTenant", () => {
  it("resolves when the building exists in the tenant", async () => {
    const sb = mockSupabase({ data: { id: "b1" }, error: null });
    await expect(requireBuildingInTenant(sb, TENANT, "b1")).resolves.toBeUndefined();
  });

  it("throws 'building.not_found' when data is null", async () => {
    const sb = mockSupabase({ data: null, error: null });
    await expect(requireBuildingInTenant(sb, TENANT, "b1")).rejects.toThrow(
      "building.not_found"
    );
  });

  it("throws the error message when the DB query errors", async () => {
    const sb = mockSupabase({ data: null, error: { message: "connection lost" } });
    await expect(requireBuildingInTenant(sb, TENANT, "b1")).rejects.toThrow(
      "connection lost"
    );
  });

  it("queries the correct table with correct filters", async () => {
    const sb = mockSupabase({ data: { id: "b1" }, error: null });
    await requireBuildingInTenant(sb, TENANT, "b1");

    expect(sb.from).toHaveBeenCalledWith("buildings");
    expect(sb._chain.select).toHaveBeenCalledWith("id");
    expect(sb._chain.eq).toHaveBeenCalledWith("tenant_id", TENANT);
    expect(sb._chain.eq).toHaveBeenCalledWith("id", "b1");
    expect(sb._chain.maybeSingle).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// requireRoomInTenant
// ---------------------------------------------------------------------------

describe("requireRoomInTenant", () => {
  it("resolves when the room exists", async () => {
    const sb = mockSupabase({ data: { id: "r1" }, error: null });
    await expect(requireRoomInTenant(sb, TENANT, "r1")).resolves.toBeUndefined();
  });

  it("throws 'rooms.not_found' when data is null", async () => {
    const sb = mockSupabase({ data: null, error: null });
    await expect(requireRoomInTenant(sb, TENANT, "r1")).rejects.toThrow(
      "rooms.not_found"
    );
  });

  it("throws the error message on DB error", async () => {
    const sb = mockSupabase({ data: null, error: { message: "timeout" } });
    await expect(requireRoomInTenant(sb, TENANT, "r1")).rejects.toThrow("timeout");
  });
});

// ---------------------------------------------------------------------------
// requireRoomsInTenant
// ---------------------------------------------------------------------------

describe("requireRoomsInTenant", () => {
  it("resolves when all rooms are found", async () => {
    const sb = mockSupabaseArray({
      data: [{ id: "r1" }, { id: "r2" }],
      error: null,
    });
    await expect(
      requireRoomsInTenant(sb, TENANT, ["r1", "r2"])
    ).resolves.toBeUndefined();
  });

  it("throws 'rooms.not_found' when some rooms are missing", async () => {
    const sb = mockSupabaseArray({
      data: [{ id: "r1" }],
      error: null,
    });
    await expect(
      requireRoomsInTenant(sb, TENANT, ["r1", "r2"])
    ).rejects.toThrow("rooms.not_found");
  });

  it("resolves immediately for an empty array without querying", async () => {
    const sb = mockSupabaseArray({ data: [], error: null });
    await expect(requireRoomsInTenant(sb, TENANT, [])).resolves.toBeUndefined();
    expect(sb.from).not.toHaveBeenCalled();
  });

  it("deduplicates room IDs before querying", async () => {
    const sb = mockSupabaseArray({
      data: [{ id: "r1" }],
      error: null,
    });
    await requireRoomsInTenant(sb, TENANT, ["r1", "r1", "r1"]);

    // .in should be called with the deduplicated array
    expect(sb._chain.in).toHaveBeenCalledWith("id", ["r1"]);
  });

  it("throws the error message on DB error", async () => {
    const sb = mockSupabaseArray({
      data: null,
      error: { message: "permission denied" },
    });
    await expect(
      requireRoomsInTenant(sb, TENANT, ["r1"])
    ).rejects.toThrow("permission denied");
  });
});

// ---------------------------------------------------------------------------
// requireRoomTypeInTenant
// ---------------------------------------------------------------------------

describe("requireRoomTypeInTenant", () => {
  it("resolves when the room type exists", async () => {
    const sb = mockSupabase({ data: { id: "t1" }, error: null });
    await expect(
      requireRoomTypeInTenant(sb, TENANT, "t1")
    ).resolves.toBeUndefined();
  });

  it("throws 'room_catalog.type_not_found' when data is null", async () => {
    const sb = mockSupabase({ data: null, error: null });
    await expect(
      requireRoomTypeInTenant(sb, TENANT, "t1")
    ).rejects.toThrow("room_catalog.type_not_found");
  });

  it("queries the correct table", async () => {
    const sb = mockSupabase({ data: { id: "t1" }, error: null });
    await requireRoomTypeInTenant(sb, TENANT, "t1");
    expect(sb.from).toHaveBeenCalledWith("room_type_definitions");
  });
});
