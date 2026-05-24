import { z } from "zod";

const serverEnvSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .optional()
      .default("development"),
    VERCEL_ENV: z.enum(["development", "preview", "production"]).optional(),
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
    ADMIN_EMAIL: z.string().email(),
    OPERATOR_EMAIL: z.string().email(),
    ADMIN_LOCATION_UNLOCK_SECRET: z.string().min(32).optional(),
    ADMIN_FACTORY_RESET_ENABLED: z.string().optional(),
    NEXT_PUBLIC_PENSION_NAME: z.string().optional(),
    NEXT_PUBLIC_RELEASE_CHANNEL: z.enum(["alpha", "stable"]).optional(),
  })
  .refine(
    (data) =>
      data.ADMIN_EMAIL.toLowerCase() !== data.OPERATOR_EMAIL.toLowerCase(),
    {
      message: "ADMIN_EMAIL și OPERATOR_EMAIL trebuie să fie diferite",
      path: ["OPERATOR_EMAIL"],
    }
  );

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: ServerEnv | null = null;

function isProductionRuntime(): boolean {
  return (
    process.env.VERCEL_ENV === "production" ||
    process.env.NODE_ENV === "production"
  );
}

export function getServerEnv(): ServerEnv {
  if (cached) return cached;

  const parsed = serverEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const lines = parsed.error.issues.map(
      (i) => `${i.path.join(".")}: ${i.message}`
    );
    throw new Error(
      `Configurare env invalidă:\n${lines.join("\n")}\nRulează: npm run env:check`
    );
  }

  if (
    isProductionRuntime() &&
    parsed.data.ADMIN_FACTORY_RESET_ENABLED === "true"
  ) {
    throw new Error(
      "ADMIN_FACTORY_RESET_ENABLED=true este interzis pe producție"
    );
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

export function getStaffEmails() {
  const env = getServerEnv();
  return {
    adminEmail: env.ADMIN_EMAIL.toLowerCase(),
    operatorEmail: env.OPERATOR_EMAIL.toLowerCase(),
  };
}

export function getLocationUnlockSecret(): string {
  const env = getServerEnv();
  return (
    env.ADMIN_LOCATION_UNLOCK_SECRET ??
    env.SUPABASE_SERVICE_ROLE_KEY ??
    "dev-insecure-unlock-secret"
  );
}

export function isFactoryResetEnabled(): boolean {
  if (isProductionRuntime()) return false;
  return getServerEnv().ADMIN_FACTORY_RESET_ENABLED === "true";
}

/** Validează env la pornirea serverului Node (instrumentation). */
export function assertServerEnvAtBoot(): void {
  getServerEnv();
}
