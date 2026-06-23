import {
  parseTenantFromHost,
  tenantDomainFromHost,
  tenantSlugFromHost,
} from "@/lib/tenant/host";
import { getTenantByDomain, getTenantBySlug } from "@/services/tenants";

const FLOW_CONTROL_MARKERS = [
  "NEXT_REDIRECT",
  "NEXT_NOT_FOUND",
  "Redirect",
] as const;

export function isTenantRequestHost(hostInput: string | null | undefined): boolean {
  if (!hostInput?.trim()) return false;
  const parsed = parseTenantFromHost(hostInput);
  return parsed.type === "tenant" || parsed.type === "custom";
}

export function shouldSkipTenantErrorLog(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message ?? "";
  return FLOW_CONTROL_MARKERS.some((marker) => message.includes(marker));
}

export async function resolveTenantIdFromHost(
  hostInput: string | null | undefined
): Promise<string | null> {
  if (!hostInput?.trim()) return null;
  if (!isTenantRequestHost(hostInput)) return null;

  const slug = tenantSlugFromHost(hostInput);
  if (slug) {
    const tenant = await getTenantBySlug(slug);
    return tenant?.id ?? null;
  }

  const domain = tenantDomainFromHost(hostInput);
  if (domain) {
    const tenant = await getTenantByDomain(domain);
    return tenant?.id ?? null;
  }

  return null;
}

let processHandlersRegistered = false;

export function registerTenantProcessErrorHandlers(): void {
  if (processHandlersRegistered) return;

  // Only run on Node.js server
  if (typeof window !== "undefined") return;

  processHandlersRegistered = true;

  // @ts-ignore - process is only available on Node.js
  const nodeProcess = process as NodeJS.Process;

  nodeProcess.on("unhandledRejection", (reason) => {
    void import("@/services/dev-logs").then(({ captureTenantError }) =>
      captureTenantError(reason, { source: "unhandledRejection" })
    );
  });

  nodeProcess.on("uncaughtException", (error) => {
    void import("@/services/dev-logs").then(({ captureTenantError }) =>
      captureTenantError(error, { source: "uncaughtException" })
    );
  });
}
