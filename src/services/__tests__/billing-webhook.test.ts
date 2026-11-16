import { beforeEach, describe, expect, it, vi } from "vitest";

/*
 * The webhook against an in-memory database and a fake Stripe: events apply
 * once, the subscription is always re-read, and an old subscription ending
 * does not undo a newer one.
 */

type Row = Record<string, unknown>;
const db: { tenants: Row[]; stripe_webhook_events: Row[]; tenant_domains: Row[] } = {
  tenants: [],
  stripe_webhook_events: [],
  tenant_domains: [],
};
const stripeSubscriptions = new Map<string, Row>();

function query(table: keyof typeof db) {
  const filters: [string, unknown, "eq" | "in"][] = [];
  let action: { kind: "select" } | { kind: "update"; patch: Row } | { kind: "delete" } = {
    kind: "select",
  };
  const match = (row: Row) =>
    filters.every(([col, value, op]) =>
      op === "eq" ? row[col] === value : (value as unknown[]).includes(row[col]),
    );
  const run = () => {
    const rows = db[table].filter(match);
    if (action.kind === "update")
      for (const row of rows) Object.assign(row, (action as { patch: Row }).patch);
    if (action.kind === "delete") db[table] = db[table].filter((row) => !match(row)) as never;
    return rows;
  };
  const builder = {
    select: () => builder,
    update: (patch: Row) => ((action = { kind: "update", patch }), builder),
    delete: () => ((action = { kind: "delete" }), builder),
    eq: (col: string, value: unknown) => (filters.push([col, value, "eq"]), builder),
    maybeSingle: async () => ({ data: run()[0] ?? null, error: null }),
    insert: async (row: Row) => {
      if (db[table].some((r) => r.id === row.id))
        return { error: { code: "23505", message: "duplicate" } };
      db[table].push({ ...row });
      return { error: null };
    },
    then: (resolve: (value: { data: Row[]; error: null }) => void) =>
      resolve({ data: run(), error: null }),
  };
  return builder;
}

vi.mock("@/lib/supabase/admin", () => ({ createPublicAdminClient: () => ({ from: query }) }));
vi.mock("next/cache", () => ({ revalidateTag: vi.fn() }));
vi.mock("@/lib/billing/stripe", () => ({
  getStripeConfig: () => ({
    secretKey: "sk",
    webhookSecret: "wh",
    prices: { essential: "price_light", professional: "price_pro" },
  }),
  stripeRequest: vi.fn(async (_c: unknown, _m: string, path: string) => {
    const id = decodeURIComponent(path.split("/").pop()!);
    const sub = stripeSubscriptions.get(id);
    if (!sub) throw new Error("no such subscription");
    return sub;
  }),
}));

import { applyStripeEvent } from "@/services/billing";

const tenant = () => db.tenants[0]!;
const subscription = (id: string, status: string, price: string) =>
  stripeSubscriptions.set(id, {
    id,
    status,
    customer: "cus_1",
    current_period_end: 1_800_000_000,
    cancel_at_period_end: false,
    metadata: { tenant_id: "t1" },
    items: { data: [{ price: { id: price } }] },
  });
const event = (id: string, type: string, object: Row) => ({ id, type, data: { object } });

describe("Stripe's webhook", () => {
  beforeEach(() => {
    db.tenants = [
      {
        id: "t1",
        slug: "casa",
        plan_id: "free",
        is_paying: false,
        stripe_customer_id: null,
        stripe_subscription_id: null,
        subscription_status: null,
      },
    ];
    db.stripe_webhook_events = [];
    db.tenant_domains = [];
    stripeSubscriptions.clear();
  });

  it("puts the property on the plan it paid for at checkout, once", async () => {
    subscription("sub_1", "active", "price_pro");
    const paid = event("evt_1", "checkout.session.completed", {
      mode: "subscription",
      subscription: "sub_1",
      client_reference_id: "t1",
    });
    expect(await applyStripeEvent(paid)).toBe("applied");
    expect(tenant()).toMatchObject({
      plan_id: "professional",
      is_paying: true,
      stripe_customer_id: "cus_1",
      stripe_subscription_id: "sub_1",
      subscription_status: "active",
    });
    expect(await applyStripeEvent(paid)).toBe("duplicate");
  });

  it("reads the subscription as it is now, whatever order the events come in", async () => {
    subscription("sub_1", "canceled", "price_pro");
    // A late "updated" event still carrying the active subscription changes nothing: Stripe says it is cancelled.
    await applyStripeEvent(
      event("evt_2", "customer.subscription.updated", { id: "sub_1", status: "active" }),
    );
    expect(tenant()).toMatchObject({
      plan_id: "free",
      is_paying: false,
      subscription_status: "canceled",
    });
  });

  it("does not let an old subscription ending undo a newer one", async () => {
    Object.assign(tenant(), {
      plan_id: "professional",
      is_paying: true,
      stripe_customer_id: "cus_1",
      stripe_subscription_id: "sub_new",
      subscription_status: "active",
    });
    subscription("sub_old", "canceled", "price_light");
    await applyStripeEvent(event("evt_3", "customer.subscription.deleted", { id: "sub_old" }));
    expect(tenant()).toMatchObject({ plan_id: "professional", stripe_subscription_id: "sub_new" });
  });

  it("forgets an event that failed, so Stripe's retry applies it", async () => {
    await expect(
      applyStripeEvent(event("evt_4", "customer.subscription.updated", { id: "sub_missing" })),
    ).rejects.toThrow();
    expect(db.stripe_webhook_events).toHaveLength(0);
  });

  it("ignores events it has no use for", async () => {
    expect(await applyStripeEvent(event("evt_5", "charge.succeeded", {}))).toBe("ignored");
    expect(
      await applyStripeEvent(event("evt_6", "checkout.session.completed", { mode: "payment" })),
    ).toBe("ignored");
  });
});
