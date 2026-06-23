import { z } from "zod";
import { isProductionRuntime } from "@/lib/security/production-runtime";

const serverEnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .optional()
    .default("development"),
  VERCEL_ENV: z.enum(["development", "preview", "production"]).optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  // Platform admin (HOSPIRA_ADMIN_EMAILS preferred; NESTIO_ADMIN_EMAILS legacy)
  HOSPIRA_ADMIN_EMAILS: z.string().optional(),
  NESTIO_ADMIN_EMAILS: z.string().optional(),
  // Resend (optional — read at runtime by lib/email/provider; noop without RESEND_API_KEY)
  // RESEND_API_KEY, RESEND_MAIL_DOMAIN — not validated here; see docs/vercel-env.md
  // Legacy staff emails — optional in multi-tenant (role comes from tenant_members DB).
  ADMIN_EMAIL: z.string().email().optional(),
  OPERATOR_EMAIL: z.string().email().optional(),
  ADMIN_LOCATION_UNLOCK_SECRET: z.string().min(32).optional(),
  ADMIN_FACTORY_RESET_ENABLED: z.string().optional(),
  NEXT_PUBLIC_RELEASE_CHANNEL: z.enum(["alpha", "stable"]).optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: ServerEnv | null = null;

export function getServerEnv(): ServerEnv {
  if (cached) return cached;

  const parsed = serverEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const lines = parsed.error.issues.map(
      (i) => `${i.path.join(".")}: ${i.message}`
    );
    throw new Error(
      `Invalid env configuration:\n${lines.join("\n")}\nRun: npm run env:check`
    );
  }

  if (
    isProductionRuntime() &&
    parsed.data.ADMIN_FACTORY_RESET_ENABLED === "true"
  ) {
    throw new Error(
      "ADMIN_FACTORY_RESET_ENABLED=true is not allowed in production"
    );
  }

  if (isProductionRuntime()) {
    const adminEmails =
      parsed.data.HOSPIRA_ADMIN_EMAILS?.trim() ||
      parsed.data.NESTIO_ADMIN_EMAILS?.trim();
    if (!adminEmails) {
      throw new Error(
        "HOSPIRA_ADMIN_EMAILS must be set in production (comma-separated platform admin emails)"
      );
    }

    const unlockSecret = parsed.data.ADMIN_LOCATION_UNLOCK_SECRET?.trim();
    if (!unlockSecret || unlockSecret.length < 32) {
      throw new Error(
        "ADMIN_LOCATION_UNLOCK_SECRET must be set in production (min 32 chars). Run: npm run env:secret"
      );
    }
  }

  cached = parsed.data;
  return cached;
}

export function getSupabasePublicConfig() {
  const env = getServerEnv();
  return {
    url: env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };
}

export function getSupabaseServiceRoleKey(): string {
  return getServerEnv().SUPABASE_SERVICE_ROLE_KEY;
}

/** @deprecated Legacy — staff role comes from tenant_members table now. */
export function getStaffEmails() {
  const env = getServerEnv();
  return {
    adminEmail: env.ADMIN_EMAIL?.toLowerCase() ?? null,
    operatorEmail: env.OPERATOR_EMAIL?.toLowerCase() ?? null,
  };
}

export function getLocationUnlockSecret(): string {
  const env = getServerEnv();
  const secret = env.ADMIN_LOCATION_UNLOCK_SECRET?.trim();
  if (secret && secret.length >= 32) return secret;

  if (isProductionRuntime()) {
    throw new Error(
      "ADMIN_LOCATION_UNLOCK_SECRET must be set in production (min 32 chars)"
    );
  }

  return secret ?? "dev-insecure-unlock-secret";
}

export function isFactoryResetEnabled(): boolean {
  if (isProductionRuntime()) return false;
  return getServerEnv().ADMIN_FACTORY_RESET_ENABLED === "true";
}

/** Validates env at Node server boot (instrumentation). */
export function assertServerEnvAtBoot(): void {
  getServerEnv();
}
