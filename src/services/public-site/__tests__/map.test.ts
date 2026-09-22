import { describe, expect, it } from "vitest";
import {
  isPublicSiteMigrationMissing,
  isPublicSiteRpcMissing,
} from "@/services/public-site/map";

describe("public site write errors", () => {
  it("detects a missing 14-arg RPC without treating it as a missing table", () => {
    const message =
      'Could not find the function public.upsert_public_site_settings_atomic(p_tenant_id, p_chrome, p_pages) in the schema cache';
    expect(isPublicSiteRpcMissing(message)).toBe(true);
    expect(isPublicSiteMigrationMissing(message)).toBe(true);
  });

  it("does not treat a generic constraint error as a missing RPC", () => {
    expect(isPublicSiteRpcMissing("invalid input value for enum")).toBe(false);
  });
});
