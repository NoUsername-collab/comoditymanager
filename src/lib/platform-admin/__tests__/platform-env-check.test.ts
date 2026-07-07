import { afterEach, describe, expect, it } from "vitest";
import {
  getPlatformCronStatus,
  getPlatformEnvChecklist,
} from "../platform-env-check";

describe("getPlatformEnvChecklist", () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
  });

  it("marks required Supabase vars as configured when set", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://x.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key-with-enough-length";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key-enough-length";
    process.env.HOSPIRA_ADMIN_EMAILS = "admin@hospira.ro";

    const checklist = getPlatformEnvChecklist();
    const supabaseUrl = checklist.find(
      (item) => item.key === "NEXT_PUBLIC_SUPABASE_URL"
    );
    const adminEmails = checklist.find(
      (item) => item.key === "HOSPIRA_ADMIN_EMAILS"
    );

    expect(supabaseUrl?.configured).toBe(true);
    expect(supabaseUrl?.required).toBe(true);
    expect(adminEmails?.configured).toBe(true);
  });

  it("accepts legacy NESTIO_ADMIN_EMAILS for admin emails check", () => {
    delete process.env.HOSPIRA_ADMIN_EMAILS;
    process.env.NESTIO_ADMIN_EMAILS = "legacy@hospira.ro";

    const adminEmails = getPlatformEnvChecklist().find(
      (item) => item.key === "HOSPIRA_ADMIN_EMAILS"
    );
    expect(adminEmails?.configured).toBe(true);
  });
});

describe("getPlatformCronStatus", () => {
  it("lists known cron endpoints", () => {
    const status = getPlatformCronStatus();
    expect(status.endpoints.length).toBeGreaterThanOrEqual(2);
    expect(status.endpoints.some((e) => e.path.includes("daily-summary"))).toBe(
      true
    );
  });
});
