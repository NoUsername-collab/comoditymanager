import { describe, it, expect } from "vitest";
import {
  DEFAULT_TENANT_EMAIL_DELIVERY,
  readTenantResendApiKey,
  resolveTenantEmailSend,
  tenantResendEnvKey,
} from "@/domain/email/delivery-policy";

describe("tenant email delivery policy", () => {
  const slug = "casa-emil";

  it("defaults to platform mode", () => {
    expect(DEFAULT_TENANT_EMAIL_DELIVERY.deliveryMode).toBe("platform");
  });

  it("builds tenant env key from slug", () => {
    expect(tenantResendEnvKey("casa-emil")).toBe("RESEND_API_KEY_TENANT__CASA_EMIL");
  });

  describe("resolveTenantEmailSend", () => {
    it("skips when delivery disabled", () => {
      const result = resolveTenantEmailSend(
        { ...DEFAULT_TENANT_EMAIL_DELIVERY, deliveryMode: "disabled" },
        { platformResendConfigured: true, platformMailDomain: "zalmox.ro" },
        { tenantSlug: slug },
      );
      expect(result.canSend).toBe(false);
      expect(result.skipReason).toBe("disabled");
    });

    it("uses platform key when configured", () => {
      const result = resolveTenantEmailSend(
        DEFAULT_TENANT_EMAIL_DELIVERY,
        { platformResendConfigured: true, platformMailDomain: "zalmox.ro" },
        { tenantSlug: slug },
      );
      expect(result.canSend).toBe(true);
      expect(result.apiKeySource).toBe("platform_env");
    });

    it("requires BYOK key for tenant_resend", () => {
      const result = resolveTenantEmailSend(
        { ...DEFAULT_TENANT_EMAIL_DELIVERY, deliveryMode: "tenant_resend", byokConfigured: true },
        { platformResendConfigured: true, platformMailDomain: "zalmox.ro" },
        { tenantSlug: slug, tenantResendApiKey: null },
      );
      expect(result.canSend).toBe(false);
      expect(result.skipReason).toBe("byok_missing");
    });

    it("reads tenant env key", () => {
      const envKey = tenantResendEnvKey(slug);
      const original = process.env[envKey];
      process.env[envKey] = "re_tenant_test";
      try {
        expect(readTenantResendApiKey(slug)).toBe("re_tenant_test");
      } finally {
        if (original === undefined) delete process.env[envKey];
        else process.env[envKey] = original;
      }
    });
  });
});
