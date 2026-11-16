import { beforeEach, describe, expect, it, vi } from "vitest";

const resolve = vi.fn();
const acquire = vi.fn();
const send = vi.fn();

vi.mock("@/services/tenant-email-delivery", () => ({
  resolveTenantEmailSendForTenant: (...args: unknown[]) => resolve(...args),
}));
vi.mock("@/services/tenant-email-usage", () => ({
  acquireTenantEmailSendSlot: (...args: unknown[]) => acquire(...args),
  releaseTenantEmailSendSlot: vi.fn(async () => undefined),
}));
vi.mock("@/lib/email/provider", () => ({
  sendEmail: (...args: unknown[]) => send(...args),
}));

import { sendTenantEmail } from "@/services/email-send";

const message = { from: "a@b.ro", to: "owner@b.ro", subject: "Cerere", html: "<p/>", text: "" };

describe("a notice to the property's team", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    send.mockResolvedValue({ success: true, messageId: "m1" });
    acquire.mockResolvedValue({ allowed: true, sentCount: 0, cap: 0 });
  });

  it("goes out on a plan with no monthly messages, without using the allowance", async () => {
    resolve.mockResolvedValue({ canSend: true, monthlyCap: 0, apiKey: "k" });
    const result = await sendTenantEmail("t1", "casa", message, { countsTowardCap: false });
    expect(result.messageId).toBe("m1");
    expect(acquire).not.toHaveBeenCalled();
  });

  it("goes out when the month's allowance is used up", async () => {
    resolve.mockResolvedValue({
      canSend: false,
      skipReason: "monthly_cap_exceeded",
      monthlyCap: 300,
      apiKey: "k",
    });
    await sendTenantEmail("t1", "casa", message, { countsTowardCap: false });
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("stays off when the property turned email off", async () => {
    resolve.mockResolvedValue({
      canSend: false,
      skipReason: "tenant_email_disabled",
      monthlyCap: 300,
      apiKey: null,
    });
    await sendTenantEmail("t1", "casa", message, { countsTowardCap: false });
    expect(send).not.toHaveBeenCalled();
  });

  it("leaves guest messages bound by the plan's allowance", async () => {
    resolve.mockResolvedValue({ canSend: true, monthlyCap: 0, apiKey: "k" });
    await sendTenantEmail("t1", "casa", message);
    expect(send).not.toHaveBeenCalled();
  });
});
