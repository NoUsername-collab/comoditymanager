import { afterEach, describe, expect, it } from "vitest";
import {
  getEmailDeliveryConfig,
  isEmailDeliveryConfigured,
} from "@/lib/email/provider";

describe("email delivery config", () => {
  const originalKey = process.env.RESEND_API_KEY;

  afterEach(() => {
    if (originalKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = originalKey;
  });

  it("reports unconfigured when RESEND_API_KEY is missing", () => {
    delete process.env.RESEND_API_KEY;
    expect(isEmailDeliveryConfigured()).toBe(false);
    expect(getEmailDeliveryConfig().provider).toBe("noop");
  });

  it("reports configured when RESEND_API_KEY is set", () => {
    process.env.RESEND_API_KEY = "re_test_key";
    expect(isEmailDeliveryConfigured()).toBe(true);
    expect(getEmailDeliveryConfig().provider).toBe("resend");
  });
});
