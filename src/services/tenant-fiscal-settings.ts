import { cache } from "react";
import { createPublicAdminClient } from "@/lib/supabase/admin";
import { resolveTenantIdForData } from "@/lib/tenant/resolve-id";
import type {
  AnafEnvironment,
  FiscalProviderType,
} from "@/domain/fiscal/fiscal-provider";
import type { TenantFiscalSettingsRecord } from "@/lib/fiscal/anaf-config";

const DEFAULT_SETTINGS: Omit<TenantFiscalSettingsRecord, "tenantId"> = {
  provider: "internal_pdf",
  anafEnabled: false,
  anafCif: null,
  anafEnv: "test",
  anafCredentials: null,
};

function parseProvider(value: unknown): FiscalProviderType {
  return value === "anaf" ? "anaf" : "internal_pdf";
}

function parseAnafEnv(value: unknown): AnafEnvironment {
  return value === "prod" ? "prod" : "test";
}

function mapRow(
  tenantId: string,
  row: Record<string, unknown> | null
): TenantFiscalSettingsRecord {
  if (!row) {
    return { tenantId, ...DEFAULT_SETTINGS };
  }
  return {
    tenantId,
    provider: parseProvider(row.provider),
    anafEnabled: Boolean(row.anaf_enabled),
    anafCif: row.anaf_cif != null ? String(row.anaf_cif) : null,
    anafEnv: parseAnafEnv(row.anaf_env),
    anafCredentials:
      row.anaf_credentials && typeof row.anaf_credentials === "object"
        ? (row.anaf_credentials as Record<string, unknown>)
        : null,
  };
}

function isTableMissing(message: string): boolean {
  return message.includes("tenant_fiscal_settings");
}

export const getTenantFiscalSettings = cache(
  async (tenantId?: string): Promise<TenantFiscalSettingsRecord> => {
    const resolvedTenantId = tenantId ?? (await resolveTenantIdForData());
    const supabase = createPublicAdminClient();
    const { data, error } = await supabase
      .from("tenant_fiscal_settings")
      .select("*")
      .eq("tenant_id", resolvedTenantId)
      .maybeSingle();

    if (error) {
      if (isTableMissing(error.message)) {
        return mapRow(resolvedTenantId, null);
      }
      throw new Error(error.message);
    }

    return mapRow(resolvedTenantId, data as Record<string, unknown> | null);
  }
);

export type UpdateTenantFiscalSettingsInput = {
  provider?: FiscalProviderType;
  anafEnabled?: boolean;
  anafCif?: string | null;
  anafEnv?: AnafEnvironment;
};

export async function updateTenantFiscalSettings(
  input: UpdateTenantFiscalSettingsInput,
  tenantId?: string
): Promise<TenantFiscalSettingsRecord> {
  const resolvedTenantId = tenantId ?? (await resolveTenantIdForData());
  const current = await getTenantFiscalSettings(resolvedTenantId);
  const next = {
    tenant_id: resolvedTenantId,
    provider: input.provider ?? current.provider,
    anaf_enabled: input.anafEnabled ?? current.anafEnabled,
    anaf_cif:
      input.anafCif !== undefined
        ? input.anafCif?.trim() || null
        : current.anafCif,
    anaf_env: input.anafEnv ?? current.anafEnv,
    anaf_credentials: current.anafCredentials,
  };

  const supabase = createPublicAdminClient();
  const { data, error } = await supabase
    .from("tenant_fiscal_settings")
    .upsert(next, { onConflict: "tenant_id" })
    .select("*")
    .single();

  if (error) {
    if (isTableMissing(error.message)) {
      throw new Error("fiscal.settings_migration_required");
    }
    throw new Error(error.message);
  }

  return mapRow(resolvedTenantId, data as Record<string, unknown>);
}

export async function getTenantFiscalSettingsForTenant(
  tenantId: string
): Promise<TenantFiscalSettingsRecord> {
  return getTenantFiscalSettings(tenantId);
}
