import { describe, it, expect, vi } from "vitest";

// The module reads process.env at import time, so we stub env before importing.
vi.stubEnv("NEXT_PUBLIC_PLATFORM_DOMAIN", "zalmox.app");
vi.stubEnv("NEXT_PUBLIC_PLATFORM_HOSTS", "");
vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");

const {
  parseTenantFromHost,
  isPlatformRequestHost,
} = await import("@/lib/tenant/host");

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

  it("returns platform for zalmox.app", () => {
    expect(parseTenantFromHost("zalmox.app")).toEqual({ type: "platform" });
  });

  it("returns platform for www.zalmox.app", () => {
    expect(parseTenantFromHost("www.zalmox.app")).toEqual({ type: "platform" });
  });

  it("returns platform for test.zalmox.app (staging apex)", () => {
    expect(parseTenantFromHost("test.zalmox.app")).toEqual({ type: "platform" });
  });

  it("returns tenant with slug for slug.zalmox.app", () => {
    expect(parseTenantFromHost("casa-emil.zalmox.app")).toEqual({
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
    expect(parseTenantFromHost("my-pension.zalmox.app")).toEqual({
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

  it("returns custom for casaemil.ro tenant domain", () => {
    expect(parseTenantFromHost("casaemil.ro")).toEqual({
      type: "custom",
      domain: "casaemil.ro",
    });
  });

  it("returns platform for something.vercel.app", () => {
    expect(parseTenantFromHost("preview-abc.vercel.app")).toEqual({
      type: "platform",
    });
  });

  it("does not treat dotted subdomain as tenant (a.b.zalmox.app)", () => {
    const result = parseTenantFromHost("a.b.zalmox.app");
    expect(result.type).not.toBe("tenant");
  });

  it("returns platform for empty string", () => {
    expect(parseTenantFromHost("")).toEqual({ type: "platform" });
  });

  it("strips www from custom domains", () => {
    expect(parseTenantFromHost("www.casaemil.ro")).toEqual({
      type: "custom",
      domain: "casaemil.ro",
    });
  });

  it("returns platform for www.zalmox.app via isPlatformRequestHost", () => {
    expect(isPlatformRequestHost("www.zalmox.app")).toBe(true);
  });
});

describe("retired brands", () => {
  it("treats hospira.ro and nestio.ro hosts as custom domains, not the platform", () => {
    expect(parseTenantFromHost("hospira.ro")).toEqual({ type: "custom", domain: "hospira.ro" });
    expect(parseTenantFromHost("casa-emil.nestio.ro")).toEqual({
      type: "custom",
      domain: "casa-emil.nestio.ro",
    });
  });
});
