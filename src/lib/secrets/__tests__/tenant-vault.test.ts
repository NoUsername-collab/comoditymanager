import { describe, it, expect } from "vitest";
import {
  decryptTenantSecret,
  encryptTenantSecret,
  isValidResendApiKey,
  maskResendApiKey,
} from "@/lib/secrets/tenant-vault";
import { resolveTenantEmailSend } from "@/domain/email/delivery-policy";

describe("tenant-vault", () => {
  const master = "test-master-secret-at-least-32-chars";

  it("round-trips encryption", () => {
    const plain = "re_test_key_abc123";
    const cipher = encryptTenantSecret(plain, master);
    expect(decryptTenantSecret(cipher, master)).toBe(plain);
  });

  it("masks api keys for UI", () => {
    expect(maskResendApiKey("re_abcdefghijklmnop")).toBe("re_…mnop");
  });

  it("validates resend key shape", () => {
    expect(isValidResendApiKey("re_abc123")).toBe(true);
    expect(isValidResendApiKey("sk_bad")).toBe(false);
  });
});

describe("resolveTenantEmailSend vault source", () => {
  it("prefers vault source when key provided", () => {
    const result = resolveTenantEmailSend(
      {
        deliveryMode: "tenant_resend",
        mailDomainOverride: null,
        monthlySendCap: null,
        byokConfigured: true,
        operatorNotes: null,
      },
      { platformResendConfigured: true, platformMailDomain: "zalmox.ro" },
      {
        tenantSlug: "demo",
        tenantResendApiKey: "re_vault_key",
        tenantResendApiKeySource: "tenant_vault",
      },
    );
    expect(result.canSend).toBe(true);
    expect(result.apiKeySource).toBe("tenant_vault");
  });
});
