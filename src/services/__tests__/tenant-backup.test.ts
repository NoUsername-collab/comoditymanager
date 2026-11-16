import { beforeEach, describe, expect, it, vi } from "vitest";

/*
 * The backup against a fake database: tables are read in full, past the API's
 * 1,000-row cap, and each property's backup time is recorded.
 */

const BOOKINGS = Array.from({ length: 2345 }, (_, i) => ({
  id: String(i).padStart(5, "0"),
  tenant_id: "t1",
}));
const uploads: { path: string; body: string }[] = [];
const marked: Record<string, unknown>[] = [];
let tenantsDue = [{ id: "t1", slug: "casa" }];

function from(table: string) {
  let range: [number, number] = [0, 999];
  const builder = {
    select: () => builder,
    eq: () => builder,
    gte: () => builder,
    in: () => builder,
    or: () => builder,
    order: () => builder,
    limit: async () => ({ data: tenantsDue, error: null }),
    range: async (a: number, b: number) => {
      range = [a, b];
      const rows = table === "bookings" ? BOOKINGS : [];
      // The API never returns more than 1,000 rows at once.
      return { data: rows.slice(range[0], Math.min(range[1] + 1, range[0] + 1000)), error: null };
    },
    update: (patch: Record<string, unknown>) => ({
      eq: async () => {
        marked.push(patch);
        return { error: null };
      },
    }),
  };
  return builder;
}

vi.mock("@/lib/supabase/admin", () => ({
  createPublicAdminClient: () => ({
    from,
    storage: {
      createBucket: async () => ({}),
      from: () => ({
        upload: async (path: string, body: string) => {
          uploads.push({ path, body });
          return { error: null };
        },
        list: async () => ({ data: [] }),
        remove: async () => ({}),
      }),
    },
  }),
}));

import { runDueTenantBackups } from "@/services/tenant-backup";

describe("the daily backup", () => {
  beforeEach(() => {
    uploads.length = 0;
    marked.length = 0;
    tenantsDue = [{ id: "t1", slug: "casa" }];
  });

  it("writes every row of a table, past the 1,000-row cap, and records when", async () => {
    const { results } = await runDueTenantBackups(40_000);
    expect(results).toEqual([expect.objectContaining({ slug: "casa", ok: true, rows: 2345 })]);
    const backup = JSON.parse(uploads[0]!.body);
    expect(backup.data.bookings).toHaveLength(2345);
    expect(uploads[0]!.path).toMatch(/^tenants\/casa\/backup-.+\.json$/);
    expect(marked[0]).toHaveProperty("last_backup_at");
  });

  it("starts no new property once its time is spent; they wait for the next run", async () => {
    tenantsDue = [
      { id: "t1", slug: "a" },
      { id: "t2", slug: "b" },
    ];
    const { due, results } = await runDueTenantBackups(-1);
    expect(due).toBe(2);
    expect(results).toHaveLength(0);
  });
});
