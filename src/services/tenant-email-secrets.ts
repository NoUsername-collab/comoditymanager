import {
  decryptTenantSecret,
  encryptTenantSecret,
  getTenantSecretsMasterKey,
  isValidResendApiKey,
  maskResendApiKey,
  TenantVaultUnavailableError,
} from "@/lib/secrets/tenant-vault";
import { readTenantResendApiKey } from "@/domain/email/delivery-policy";
import { createPublicAdminClient } from "@/lib/supabase/admin";

export type TenantResendKeySource = "tenant_vault" | "tenant_env" | "none";

export type TenantResendKeyResolution = {
  apiKey: string | null;
  source: TenantResendKeySource;
  vaultHint: string | null;
  envFallbackPresent: boolean;
};

type SecretRow = {
  tenant_id: string;
  resend_api_key_ciphertext: string | null;
  resend_key_hint: string | null;
};

export async function getTenantResendVaultHint(
  tenantId: string,
): Promise<string | null> {
  const supabase = createPublicAdminClient();
  const { data, error } = await supabase
    .from("tenant_email_secrets")
    .select("resend_key_hint")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (error) {
    if (error.message.includes("tenant_email_secrets")) return null;
    throw new Error(error.message);
  }

  return data?.resend_key_hint ?? null;
}

export async function getTenantResendApiKeyFromVault(
  tenantId: string,
): Promise<string | null> {
  const masterKey = getTenantSecretsMasterKey();
  if (!masterKey) return null;

  const supabase = createPublicAdminClient();
  const { data, error } = await supabase
    .from("tenant_email_secrets")
    .select("resend_api_key_ciphertext")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (error) {
    if (error.message.includes("tenant_email_secrets")) return null;
    throw new Error(error.message);
  }

  const ciphertext = data?.resend_api_key_ciphertext;
  if (!ciphertext) return null;

  try {
    return decryptTenantSecret(ciphertext, masterKey);
  } catch {
    return null;
  }
}

export async function resolveTenantResendApiKeyForTenant(
  tenantId: string,
  slug: string,
): Promise<TenantResendKeyResolution> {
  const [vaultKey, vaultHint] = await Promise.all([
    getTenantResendApiKeyFromVault(tenantId),
    getTenantResendVaultHint(tenantId),
  ]);

  if (vaultKey?.trim()) {
    return {
      apiKey: vaultKey.trim(),
      source: "tenant_vault",
      vaultHint,
      envFallbackPresent: Boolean(readTenantResendApiKey(slug)),
    };
  }

  const envKey = readTenantResendApiKey(slug);
  if (envKey) {
    return {
      apiKey: envKey,
      source: "tenant_env",
      vaultHint: null,
      envFallbackPresent: true,
    };
  }

  return {
    apiKey: null,
    source: "none",
    vaultHint,
    envFallbackPresent: false,
  };
}

export async function saveTenantResendApiKeyToVault(
  tenantId: string,
  apiKey: string,
): Promise<{ success: boolean; error?: string; hint?: string }> {
  const trimmed = apiKey.trim();
  if (!isValidResendApiKey(trimmed)) {
    return { success: false, error: "Cheie Resend invalidă (așteptat re_...)." };
  }

  const masterKey = getTenantSecretsMasterKey();
  if (!masterKey) {
    return {
      success: false,
      error: "TENANT_SECRETS_ENCRYPTION_KEY lipsește sau e prea scurtă (min 32).",
    };
  }

  const ciphertext = encryptTenantSecret(trimmed, masterKey);
  const hint = maskResendApiKey(trimmed);
  const supabase = createPublicAdminClient();

  const { error } = await supabase.from("tenant_email_secrets").upsert(
    {
      tenant_id: tenantId,
      resend_api_key_ciphertext: ciphertext,
      resend_key_hint: hint,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "tenant_id" },
  );

  if (error) return { success: false, error: error.message };
  return { success: true, hint };
}

export async function clearTenantResendApiKeyFromVault(
  tenantId: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = createPublicAdminClient();
  const { error } = await supabase.from("tenant_email_secrets").upsert(
    {
      tenant_id: tenantId,
      resend_api_key_ciphertext: null,
      resend_key_hint: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "tenant_id" },
  );

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export function assertTenantVaultReady(): void {
  if (!getTenantSecretsMasterKey()) {
    throw new TenantVaultUnavailableError(
      "TENANT_SECRETS_ENCRYPTION_KEY is not configured (min 32 chars).",
    );
  }
}
