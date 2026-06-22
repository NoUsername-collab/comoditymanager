/**
 * Sursă unică pentru variabile de mediu — folosită de check-env și setup-staff.
 * Nu pune secrete aici; doar metadate și reguli de validare.
 */

/** @typedef {'always' | 'runtime' | 'setup' | 'optional'} EnvRequirement */

/**
 * @typedef {Object} EnvVarDef
 * @property {string} key
 * @property {EnvRequirement} requirement
 * @property {string} description
 * @property {boolean} [public]
 * @property {boolean} [vercelOnly]
 * @property {boolean} [forbiddenInProduction]
 * @property {boolean} [recommendedInProduction]
 */

/** @type {EnvVarDef[]} */
export const ENV_MANIFEST = [
  {
    key: "NEXT_PUBLIC_SUPABASE_URL",
    requirement: "always",
    public: true,
    description: "URL proiect Supabase (Settings → API)",
  },
  {
    key: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    requirement: "always",
    public: true,
    description: "Cheie anon/public Supabase",
  },
  {
    key: "SUPABASE_SERVICE_ROLE_KEY",
    requirement: "runtime",
    description: "Cheie service_role — doar server, niciodată în browser",
  },
  {
    key: "HOSPIRA_ADMIN_EMAILS",
    requirement: "runtime",
    recommendedInProduction: true,
    description:
      "Email-uri platform admin (virgulă) — acces /hospira-admin. Legacy: NESTIO_ADMIN_EMAILS",
  },
  {
    key: "NESTIO_ADMIN_EMAILS",
    requirement: "optional",
    description:
      "Legacy — înlocuit de HOSPIRA_ADMIN_EMAILS; acceptat temporar la tranziție",
  },
  {
    key: "NEXT_PUBLIC_PLATFORM_DOMAIN",
    requirement: "optional",
    public: true,
    recommendedInProduction: true,
    description:
      "Apex platform domain (ex. hospira.ro sau test.hospira.ro pe staging)",
  },
  {
    key: "NEXT_PUBLIC_SITE_URL",
    requirement: "optional",
    public: true,
    recommendedInProduction: true,
    description: "URL public al platformei (ex. https://hospira.ro)",
  },
  {
    key: "RESEND_API_KEY",
    requirement: "optional",
    recommendedInProduction: true,
    description:
      "Cheie API Resend (re_...) — fără ea emailurile sunt noop (dev OK)",
  },
  {
    key: "RESEND_MAIL_DOMAIN",
    requirement: "optional",
    description:
      "Domeniu verificat Resend pentru From implicit (altfel NEXT_PUBLIC_PLATFORM_DOMAIN)",
  },
  {
    key: "CRON_SECRET",
    requirement: "optional",
    recommendedInProduction: true,
    description:
      "Secret pentru /api/cron/* — Vercel Cron îl injectează automat pe Production",
  },
  {
    key: "ADMIN_EMAIL",
    requirement: "runtime",
    description: "Email cont Admin în Supabase Auth (login: Admin)",
  },
  {
    key: "OPERATOR_EMAIL",
    requirement: "runtime",
    description: "Email cont Operator în Supabase Auth (login: Operator)",
  },
  {
    key: "ADMIN_INITIAL_PASSWORD",
    requirement: "setup",
    description: "Parolă inițială Admin — doar npm run setup-staff, NU pe Vercel",
    forbiddenInProduction: true,
  },
  {
    key: "OPERATOR_INITIAL_PASSWORD",
    requirement: "setup",
    description: "Parolă inițială Operator — doar npm run setup-staff, NU pe Vercel",
    forbiddenInProduction: true,
  },
  {
    key: "ADMIN_LOCATION_UNLOCK_SECRET",
    requirement: "optional",
    recommendedInProduction: true,
    description:
      "Secret semnare cookie unlock administrare locație (min 32 caractere). Generează: npm run env:secret",
  },
  {
    key: "ADMIN_FACTORY_RESET_ENABLED",
    requirement: "optional",
    forbiddenInProduction: true,
    description: 'Reset factory în Setări — doar "true" pe staging/dev',
  },
  {
    key: "NEXT_PUBLIC_PENSION_NAME",
    requirement: "optional",
    public: true,
    description: "Nume afișat pensiune (public)",
  },
  {
    key: "NEXT_PUBLIC_RELEASE_CHANNEL",
    requirement: "optional",
    public: true,
    description: "alpha | stable — omit pe producție",
  },
  {
    key: "ALPHA_GATE_PASSWORD",
    requirement: "optional",
    description:
      "Parolă acces site în alpha — dacă e setată, toate paginile publice cer parola",
  },
];

export const PLACEHOLDER_PATTERNS = [
  /^$/,
  /^XXXX/i,
  /YOUR[-_]?STAGING/i,
  /YOUR[-_]?PROJECT/i,
  /changeme/i,
  /replace[-_]?me/i,
  /example\.com$/i,
  /^eyJ\.\.\./,
];

/**
 * @param {string | undefined} value
 */
export function isPlaceholderEnvValue(value) {
  if (value == null) return true;
  const v = value.trim();
  if (!v) return true;
  return PLACEHOLDER_PATTERNS.some((re) => re.test(v));
}

/**
 * @param {string | undefined} value
 */
export function isValidSupabaseUrl(value) {
  if (!value || isPlaceholderEnvValue(value)) return false;
  try {
    const u = new URL(value);
    return u.protocol === "https:" && u.hostname.includes("supabase");
  } catch {
    return false;
  }
}

/**
 * @param {string | undefined} value
 */
export function isValidEmail(value) {
  if (!value || isPlaceholderEnvValue(value)) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/**
 * @param {string | undefined} value
 */
export function isValidJwtLikeKey(value) {
  if (!value || isPlaceholderEnvValue(value)) return false;
  return value.trim().length >= 20;
}

/**
 * @param {'local' | 'staging' | 'production'} profile
 */
export function resolveProfile(profile) {
  if (profile) return profile;
  if (process.env.VERCEL_ENV === "production") return "production";
  if (process.env.VERCEL_ENV === "preview") return "staging";
  return "local";
}
