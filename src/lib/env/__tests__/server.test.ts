import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const BASE_ENV = {
  NEXT_PUBLIC_SUPABASE_URL: "https://ci-placeholder.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ci-anon-placeholder-key",
  SUPABASE_SERVICE_ROLE_KEY:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ci-service-placeholder-key",
  ADMIN_LOCATION_UNLOCK_SECRET: "x".repeat(32),
};

function applyBaseEnv() {
  for (const [key, value] of Object.entries(BASE_ENV)) {
    vi.stubEnv(key, value);
  }
}

describe("getServerEnv platform admin emails", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    applyBaseEnv();
    delete process.env.ZALMOX_ADMIN_EMAILS;
    delete process.env.HOSPIRA_ADMIN_EMAILS;
    delete process.env.NESTIO_ADMIN_EMAILS;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("accepts ZALMOX_ADMIN_EMAILS alone in production", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("ZALMOX_ADMIN_EMAILS", "ops@zalmox.app");
    const { getServerEnv } = await import("@/lib/env/server");
    expect(getServerEnv().ZALMOX_ADMIN_EMAILS).toBe("ops@zalmox.app");
  });

  it("still accepts legacy HOSPIRA_ADMIN_EMAILS alone in production", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("HOSPIRA_ADMIN_EMAILS", "ops@hospira.ro");
    const { getServerEnv } = await import("@/lib/env/server");
    expect(() => getServerEnv()).not.toThrow();
  });

  it("throws in production when no platform-admin email var is set", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    const { getServerEnv } = await import("@/lib/env/server");
    expect(() => getServerEnv()).toThrow(/ZALMOX_ADMIN_EMAILS must be set in production/);
  });

  it("does not require platform-admin emails outside production", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("NODE_ENV", "test");
    const { getServerEnv } = await import("@/lib/env/server");
    expect(() => getServerEnv()).not.toThrow();
  });
});
