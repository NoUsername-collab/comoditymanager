import { describe, it, expect } from "vitest";
import { isValidTenantSlug } from "@/lib/tenant/routing";

describe("isValidTenantSlug", () => {
  describe("valid slugs", () => {
    it("accepts a hyphenated slug", () => {
      expect(isValidTenantSlug("my-pension")).toBe(true);
    });

    it("accepts a short alphanumeric slug (3 chars)", () => {
      expect(isValidTenantSlug("abc")).toBe(true);
    });

    it("accepts a slug with digits", () => {
      expect(isValidTenantSlug("a1b")).toBe(true);
    });

    it("accepts a longer hyphenated slug", () => {
      expect(isValidTenantSlug("pension-casa-emil")).toBe(true);
    });

    it("accepts a slug at max length (50 chars)", () => {
      // regex: ^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$ → min 3, max 50
      const slug = "a" + "b".repeat(48) + "c"; // 50 chars
      expect(isValidTenantSlug(slug)).toBe(true);
    });
  });

  describe("invalid slugs", () => {
    it("rejects null", () => {
      expect(isValidTenantSlug(null)).toBe(false);
    });

    it("rejects undefined", () => {
      expect(isValidTenantSlug(undefined)).toBe(false);
    });

    it("rejects empty string", () => {
      expect(isValidTenantSlug("")).toBe(false);
    });

    it("rejects uppercase characters", () => {
      expect(isValidTenantSlug("MyPension")).toBe(false);
    });

    it("rejects slug starting with hyphen", () => {
      expect(isValidTenantSlug("-start")).toBe(false);
    });

    it("rejects slug ending with hyphen", () => {
      expect(isValidTenantSlug("end-")).toBe(false);
    });

    it("rejects single character (too short)", () => {
      expect(isValidTenantSlug("a")).toBe(false);
    });

    it("rejects two characters (too short)", () => {
      expect(isValidTenantSlug("ab")).toBe(false);
    });

    it("rejects slug with spaces", () => {
      expect(isValidTenantSlug("my pension")).toBe(false);
    });

    it("rejects slug with special characters", () => {
      expect(isValidTenantSlug("my_pension")).toBe(false);
    });

    it("rejects slug with dots", () => {
      expect(isValidTenantSlug("my.pension")).toBe(false);
    });

    it("rejects slug exceeding max length (51 chars)", () => {
      const slug = "a" + "b".repeat(49) + "c"; // 51 chars
      expect(isValidTenantSlug(slug)).toBe(false);
    });
  });
});
