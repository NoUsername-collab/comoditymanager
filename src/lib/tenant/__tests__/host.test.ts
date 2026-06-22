import { describe, it, expect, vi, beforeEach } from "vitest";

// The module reads process.env at import time, so we stub env before importing.
vi.stubEnv("NEXT_PUBLIC_PLATFORM_DOMAIN", "nestio.ro");
vi.stubEnv("NEXT_PUBLIC_PLATFORM_HOSTS", "");
vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");

const { parseTenantFromHost } = await import("@/lib/tenant/host");

describe("parseTenantFromHost", () => {
  it("returns platform for localhost", () => {
    expect(parseTenantFromHost("localhost")).toEqual({ type: "platform" });
  });

  it("returns platform for localhost with port", () => {
    expect(parseTenantFromHost("localhost:3000")).toEqual({ type: "platform" });
  });

  it("returns platform for 127.0.0.1", () => {
    expect(parseTenantFromHost("127.0.0.1")).toEqual({ type: "platform" });
  });

  it("returns platform for nestio.ro", () => {
    expect(parseTenantFromHost("nestio.ro")).toEqual({ type: "platform" });
  });

  it("returns platform for www.nestio.ro", () => {
    expect(parseTenantFromHost("www.nestio.ro")).toEqual({ type: "platform" });
  });

  it("returns platform for test.nestio.ro (staging apex)", () => {
    expect(parseTenantFromHost("test.nestio.ro")).toEqual({ type: "platform" });
  });

  it("returns tenant with slug for slug.nestio.ro", () => {
    expect(parseTenantFromHost("casa-emil.nestio.ro")).toEqual({
      type: "tenant",
      slug: "casa-emil",
    });
  });

  it("returns tenant with slug for slug.localhost", () => {
    expect(parseTenantFromHost("myhotel.localhost")).toEqual({
      type: "tenant",
      slug: "myhotel",
    });
  });

  it("returns tenant with slug for slug.localhost:3000 (strips port)", () => {
    expect(parseTenantFromHost("myhotel.localhost:3000")).toEqual({
      type: "tenant",
      slug: "myhotel",
    });
  });

  it("returns tenant for hyphenated slug", () => {
    expect(parseTenantFromHost("my-pension.nestio.ro")).toEqual({
      type: "tenant",
      slug: "my-pension",
    });
  });

  it("returns custom for an unrecognized domain", () => {
    expect(parseTenantFromHost("example.com")).toEqual({
      type: "custom",
      domain: "example.com",
    });
  });

  it("returns platform for something.vercel.app", () => {
    expect(parseTenantFromHost("preview-abc.vercel.app")).toEqual({
      type: "platform",
    });
  });

  it("does not treat dotted subdomain as tenant (a.b.nestio.ro)", () => {
    // slug contains a dot, so it should NOT be parsed as tenant
    const result = parseTenantFromHost("a.b.nestio.ro");
    // "a.b" contains a dot, so it won't match as tenant for nestio.ro
    // but "a" might match as tenant for test.nestio.ro since test.nestio.ro is a platform root
    // The function checks platform roots longest first: test.nestio.ro, then nestio.ro
    // For "a.b.nestio.ro" against "test.nestio.ro" — doesn't end with .test.nestio.ro
    // For "a.b.nestio.ro" against "nestio.ro" — slug would be "a.b" which contains "."
    // So it falls through to custom
    expect(result.type).not.toBe("tenant");
  });

  it("returns platform for empty string", () => {
    expect(parseTenantFromHost("")).toEqual({ type: "platform" });
  });
});
