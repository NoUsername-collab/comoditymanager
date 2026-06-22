import { describe, it, expect, vi, beforeEach } from "vitest";

// The module reads process.env at import time, so we stub env before importing.
vi.stubEnv("NEXT_PUBLIC_PLATFORM_DOMAIN", "hospira.ro");
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

  it("returns platform for hospira.ro", () => {
    expect(parseTenantFromHost("hospira.ro")).toEqual({ type: "platform" });
  });

  it("returns platform for www.hospira.ro", () => {
    expect(parseTenantFromHost("www.hospira.ro")).toEqual({ type: "platform" });
  });

  it("returns platform for test.hospira.ro (staging apex)", () => {
    expect(parseTenantFromHost("test.hospira.ro")).toEqual({ type: "platform" });
  });

  it("returns tenant with slug for slug.hospira.ro", () => {
    expect(parseTenantFromHost("casa-emil.hospira.ro")).toEqual({
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
    expect(parseTenantFromHost("my-pension.hospira.ro")).toEqual({
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

  it("does not treat dotted subdomain as tenant (a.b.hospira.ro)", () => {
    const result = parseTenantFromHost("a.b.hospira.ro");
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

  it("returns platform for www.hospira.ro via isPlatformRequestHost", () => {
    expect(isPlatformRequestHost("www.hospira.ro")).toBe(true);
  });
});

describe("parseTenantFromHost legacy nestio.ro hosts", () => {
  it("still parses slug.nestio.ro as tenant", () => {
    expect(parseTenantFromHost("casa-emil.nestio.ro")).toEqual({
      type: "tenant",
      slug: "casa-emil",
    });
  });

  it("still treats nestio.ro as platform", () => {
    expect(parseTenantFromHost("nestio.ro")).toEqual({ type: "platform" });
  });
});

describe("parseTenantFromHost with legacy PLATFORM_DOMAIN env", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_PLATFORM_DOMAIN", "hospira.ro");
    vi.stubEnv("NEXT_PUBLIC_PLATFORM_HOSTS", "");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
  });

  it("still parses slug.nestio.ro as tenant when env says hospira.ro", async () => {
    const { parseTenantFromHost } = await import("@/lib/tenant/host");
    expect(parseTenantFromHost("casa-emil.nestio.ro")).toEqual({
      type: "tenant",
      slug: "casa-emil",
    });
  });

  it("still treats nestio.ro as platform when env says hospira.ro", async () => {
    const { parseTenantFromHost } = await import("@/lib/tenant/host");
    expect(parseTenantFromHost("nestio.ro")).toEqual({ type: "platform" });
  });
});
