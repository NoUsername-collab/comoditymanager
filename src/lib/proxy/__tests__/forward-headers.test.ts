import { describe, expect, it } from "vitest";
import { NextResponse } from "next/server";
import {
  requestHeaderOverrides,
  withRequestHeaderOverrides,
} from "@/lib/proxy/forward-headers";

describe("forwarding a middleware's request headers", () => {
  it("reads the headers a response passes on to the page", () => {
    const response = NextResponse.next({
      request: { headers: new Headers({ "X-NEXT-INTL-LOCALE": "en", "x-other": "1" }) },
    });
    expect(Object.fromEntries(requestHeaderOverrides(response.headers))).toEqual({
      "x-next-intl-locale": "en",
      "x-other": "1",
    });
  });

  it("lays them over the proxy's own headers, which stay", () => {
    const base = new Headers({ "x-tenant-slug": "casa-ana", "x-admin-path": "/admin" });
    const intl = NextResponse.next({
      request: { headers: new Headers({ "X-NEXT-INTL-LOCALE": "bg" }) },
    });
    const merged = withRequestHeaderOverrides(base, intl.headers);
    expect(merged.get("x-next-intl-locale")).toBe("bg");
    expect(merged.get("x-tenant-slug")).toBe("casa-ana");
    expect(base.get("x-next-intl-locale")).toBeNull();
  });

  it("passes nothing on from a response without overrides", () => {
    expect(requestHeaderOverrides(NextResponse.next().headers)).toEqual([]);
  });
});
