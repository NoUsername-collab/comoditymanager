import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// We need to isolate module imports so env changes take effect.
// The module caches nothing (reads process.env on every call), so a
// dynamic import after setting the env var is sufficient.

let isPlatformAdminEmail: (email: string) => boolean;
let isPlatformAdminEmailEdge: (email: string | undefined) => boolean;

// Mock next/navigation to avoid import errors (the module imports redirect)
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

// Mock the supabase server client to avoid import errors
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

beforeEach(async () => {
  // Re-import to pick up fresh env reads
  const mod = await import("@/lib/auth/require-platform-admin");
  isPlatformAdminEmail = mod.isPlatformAdminEmail;
  isPlatformAdminEmailEdge = mod.isPlatformAdminEmailEdge;
});

afterEach(() => {
  delete process.env.HOSPIRA_ADMIN_EMAILS;
  delete process.env.NESTIO_ADMIN_EMAILS;
});

// ---------------------------------------------------------------------------
// isPlatformAdminEmail
// ---------------------------------------------------------------------------

describe("isPlatformAdminEmail", () => {
  it("returns true for the default admin email when env is not set", () => {
    delete process.env.HOSPIRA_ADMIN_EMAILS;
    delete process.env.NESTIO_ADMIN_EMAILS;
    expect(isPlatformAdminEmail("admin@zalmox.app")).toBe(true);
  });

  it("returns false for a random email when env is not set", () => {
    delete process.env.HOSPIRA_ADMIN_EMAILS;
    delete process.env.NESTIO_ADMIN_EMAILS;
    expect(isPlatformAdminEmail("random@email.com")).toBe(false);
  });

  it("denies all emails in production when env is not set", () => {
    vi.stubEnv("NODE_ENV", "production");
    delete process.env.HOSPIRA_ADMIN_EMAILS;
    delete process.env.NESTIO_ADMIN_EMAILS;
    expect(isPlatformAdminEmail("admin@zalmox.app")).toBe(false);
    vi.unstubAllEnvs();
  });

  it("is case insensitive", () => {
    delete process.env.HOSPIRA_ADMIN_EMAILS;
    delete process.env.NESTIO_ADMIN_EMAILS;
    expect(isPlatformAdminEmail("ADMIN@zalmox.app")).toBe(true);
    expect(isPlatformAdminEmail("Admin@Zalmox.App")).toBe(true);
  });

  it("recognises emails from HOSPIRA_ADMIN_EMAILS", () => {
    process.env.HOSPIRA_ADMIN_EMAILS = "a@b.com, c@d.com";
    expect(isPlatformAdminEmail("a@b.com")).toBe(true);
    expect(isPlatformAdminEmail("c@d.com")).toBe(true);
    expect(isPlatformAdminEmail("admin@zalmox.app")).toBe(false);
  });

  it("falls back to legacy NESTIO_ADMIN_EMAILS", () => {
    process.env.NESTIO_ADMIN_EMAILS = "legacy@hospira.ro";
    expect(isPlatformAdminEmail("legacy@hospira.ro")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// isPlatformAdminEmailEdge
// ---------------------------------------------------------------------------

describe("isPlatformAdminEmailEdge", () => {
  it("returns false for undefined", () => {
    expect(isPlatformAdminEmailEdge(undefined)).toBe(false);
  });

  it("returns true for a valid admin email", () => {
    delete process.env.HOSPIRA_ADMIN_EMAILS;
    delete process.env.NESTIO_ADMIN_EMAILS;
    expect(isPlatformAdminEmailEdge("admin@zalmox.app")).toBe(true);
  });

  it("returns false for an invalid email", () => {
    delete process.env.HOSPIRA_ADMIN_EMAILS;
    delete process.env.NESTIO_ADMIN_EMAILS;
    expect(isPlatformAdminEmailEdge("nobody@example.com")).toBe(false);
  });
});
