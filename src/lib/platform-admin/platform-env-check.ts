/**
 * Read-only env checklist for platform admin tools.
 * Never exposes secret values — only configured / missing status.
 */

export type EnvCheckItem = {
  key: string;
  configured: boolean;
  required: boolean;
  recommended: boolean;
};

export type PlatformCronStatus = {
  secretConfigured: boolean;
  endpoints: { path: string; schedule: string }[];
};

const CRON_ENDPOINTS = [
  { path: "/api/cron/daily-summary", schedule: "05:00 UTC zilnic" },
  { path: "/api/cron/backup", schedule: "03:00 UTC duminică" },
] as const;

function isSet(key: string): boolean {
  const value = process.env[key]?.trim();
  return Boolean(value && value.length > 0);
}

/** Env vars relevant to platform operations (no values returned). */
export function getPlatformEnvChecklist(): EnvCheckItem[] {
  const adminEmails =
    isSet("ZALMOX_ADMIN_EMAILS") ||
    isSet("HOSPIRA_ADMIN_EMAILS") ||
    isSet("NESTIO_ADMIN_EMAILS");

  return [
    {
      key: "NEXT_PUBLIC_SUPABASE_URL",
      configured: isSet("NEXT_PUBLIC_SUPABASE_URL"),
      required: true,
      recommended: false,
    },
    {
      key: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      configured: isSet("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
      required: true,
      recommended: false,
    },
    {
      key: "SUPABASE_SERVICE_ROLE_KEY",
      configured: isSet("SUPABASE_SERVICE_ROLE_KEY"),
      required: true,
      recommended: false,
    },
    {
      key: "ZALMOX_ADMIN_EMAILS",
      configured: adminEmails,
      required: true,
      recommended: true,
    },
    {
      key: "RESEND_API_KEY",
      configured: isSet("RESEND_API_KEY"),
      required: false,
      recommended: true,
    },
    {
      key: "RESEND_MAIL_DOMAIN",
      configured: isSet("RESEND_MAIL_DOMAIN"),
      required: false,
      recommended: false,
    },
    {
      key: "TENANT_SECRETS_ENCRYPTION_KEY",
      configured: isSet("TENANT_SECRETS_ENCRYPTION_KEY"),
      required: false,
      recommended: true,
    },
    {
      key: "CRON_SECRET",
      configured: isSet("CRON_SECRET"),
      required: false,
      recommended: true,
    },
    {
      key: "NEXT_PUBLIC_PLATFORM_DOMAIN",
      configured: isSet("NEXT_PUBLIC_PLATFORM_DOMAIN"),
      required: false,
      recommended: true,
    },
    {
      key: "NEXT_PUBLIC_SITE_URL",
      configured: isSet("NEXT_PUBLIC_SITE_URL"),
      required: false,
      recommended: true,
    },
    {
      key: "ADMIN_LOCATION_UNLOCK_SECRET",
      configured: isSet("ADMIN_LOCATION_UNLOCK_SECRET"),
      required: false,
      recommended: true,
    },
  ];
}

export function getPlatformCronStatus(): PlatformCronStatus {
  return {
    secretConfigured: isSet("CRON_SECRET"),
    endpoints: [...CRON_ENDPOINTS],
  };
}
