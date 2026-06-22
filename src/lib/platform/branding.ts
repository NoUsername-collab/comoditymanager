import { platformDomainFromRequestHost } from "@/lib/tenant/host";

/** Product name shown in UI, emails, and dev fallbacks. */
export const PLATFORM_NAME = "Nestio";

export const PLATFORM_CONTACT_EMAIL = "contact@nestio.ro";

/** Platform apex URL (landing, signup). For tenant pages use resolveTenantPublicSiteUrl(). */
export function platformSiteUrl(requestHost?: string | null): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");

  const domain = platformDomainFromRequestHost(requestHost);
  if (domain === "localhost") {
    const port = process.env.PORT ?? "3000";
    return `http://localhost:${port}`;
  }
  return `https://${domain}`;
}

/** Footer line in transactional emails. */
export function platformPoweredByLabel(): string {
  return `Powered by ${PLATFORM_NAME}`;
}

/** When tenant display name cannot be resolved (last resort). */
export function platformPensionNameFallback(): string {
  return PLATFORM_NAME;
}
