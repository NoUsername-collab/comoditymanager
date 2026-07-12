import { describe, expect, it } from "vitest";
import { tenantsToCsv } from "../tenant-csv";
import type { PlatformTenantSummary } from "@/services/platform-admin";

function sampleTenant(
  partial: Partial<PlatformTenantSummary> = {}
): PlatformTenantSummary {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    slug: "casa-emil",
    display_name: "Casa Emil",
    plan_id: "starter",
    active_modules: [],
    locale: "ro",
    country: "RO",
    timezone: "Europe/Bucharest",
    status: "active",
    trial_ends_at: null,
    owner_id: null,
    owner_email: "owner@example.com",
    is_paying: true,
    stripe_customer_id: null,
    stripe_subscription_id: null,
    created_at: "2026-01-15T10:00:00.000Z",
    updated_at: "2026-01-15T10:00:00.000Z",
    member_count: 2,
    room_count: 5,
    booking_count: 12,
    domain_hosts: [],
    email_sent_month: 0,
    email_cap_month: null,
    email_alert: "unlimited",
    setup_incomplete: false,
    ...partial,
  };
}

describe("tenantsToCsv", () => {
  it("includes header row and tenant data", () => {
    const csv = tenantsToCsv([sampleTenant()]);
    const lines = csv.split("\n");
    expect(lines[0]).toContain("display_name");
    expect(lines[1]).toContain("casa-emil");
    expect(lines[1]).toContain("owner@example.com");
  });

  it("escapes commas and quotes in display name", () => {
    const csv = tenantsToCsv([
      sampleTenant({ display_name: 'Pensiunea "Valea", SRL' }),
    ]);
    expect(csv).toContain('"Pensiunea ""Valea"", SRL"');
  });

  it("returns header only for empty list", () => {
    const csv = tenantsToCsv([]);
    expect(csv.split("\n")).toHaveLength(1);
    expect(csv).toContain("slug");
  });
});
