import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { turnstileAllows, verifyTurnstileToken } from "@/lib/security/turnstile";
import { turnstileCoversHost } from "@/lib/security/turnstile-hosts";

describe("where the anti-bot check runs", () => {
  it("covers the platform and its subdomains, and local hosts", () => {
    expect(turnstileCoversHost("zalmox.app", "zalmox.app")).toBe(true);
    expect(turnstileCoversHost("casa.zalmox.app", "zalmox.app")).toBe(true);
    expect(turnstileCoversHost("hospira.localhost:3030", "zalmox.app")).toBe(true);
  });

  it("leaves out a guesthouse's own domain, where the widget may not load", () => {
    expect(turnstileCoversHost("www.pensiunea-ana.ro", "zalmox.app")).toBe(false);
    expect(turnstileCoversHost("evilzalmox.app", "zalmox.app")).toBe(false);
    expect(turnstileCoversHost(null, "zalmox.app")).toBe(false);
  });
});

describe("checking a form's token", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "secret");
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "site");
    vi.stubEnv("NEXT_PUBLIC_PLATFORM_DOMAIN", "zalmox.app");
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });
  const answer = (body: unknown, ok = true) =>
    fetchMock.mockResolvedValue({ ok, json: async () => body });

  it("is off without keys, or on a host the widget does not cover", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "");
    expect(await verifyTurnstileToken(null, "1.2.3.4", "casa.zalmox.app")).toBe("off");
    vi.stubEnv("TURNSTILE_SECRET_KEY", "secret");
    expect(await verifyTurnstileToken(null, "1.2.3.4", "www.pensiunea-ana.ro")).toBe("off");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuses a form without a token, or with one Cloudflare rejects", async () => {
    expect(await verifyTurnstileToken("", "1.2.3.4", "casa.zalmox.app")).toBe("missing");
    answer({ success: false, "error-codes": ["invalid-input-response"] });
    const outcome = await verifyTurnstileToken("bad", "1.2.3.4", "casa.zalmox.app");
    expect(outcome).toBe("rejected");
    expect(turnstileAllows(outcome)).toBe(false);
    expect(turnstileAllows("missing")).toBe(false);
  });

  it("passes a valid token, sending the secret and the visitor's address", async () => {
    answer({ success: true });
    expect(await verifyTurnstileToken("good", "1.2.3.4", "casa.zalmox.app")).toBe("passed");
    const body = fetchMock.mock.calls[0]![1].body as URLSearchParams;
    expect(body.get("secret")).toBe("secret");
    expect(body.get("response")).toBe("good");
    expect(body.get("remoteip")).toBe("1.2.3.4");
  });

  it("lets the form through when Cloudflare itself does not answer", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    fetchMock.mockRejectedValue(new Error("network"));
    const down = await verifyTurnstileToken("t", null, "zalmox.app");
    expect(down).toBe("unavailable");
    expect(turnstileAllows(down)).toBe(true);
    answer({ success: false, "error-codes": ["internal-error"] });
    expect(await verifyTurnstileToken("t", null, "zalmox.app")).toBe("unavailable");
    error.mockRestore();
  });
});
