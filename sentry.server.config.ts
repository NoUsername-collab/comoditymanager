import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // "zalmox@0.9.0+af09b76": which release an error comes from (set in next.config.ts).
  release: process.env.NEXT_PUBLIC_SENTRY_RELEASE,

  // Only enable in production
  enabled: process.env.NODE_ENV === "production",

  // Performance: sample 80% of transactions
  tracesSampleRate: 0.8,

  // Don't send PII
  sendDefaultPii: false,

  // Filter out expected errors
  ignoreErrors: [
    "NEXT_REDIRECT",
    "NEXT_NOT_FOUND",
    // Auth errors (expected flow)
    "auth.login_required",
    "auth.unauthorized_account",
    "auth.role_forbidden",
    // Rate limit errors (expected)
    /^rate_limit\./,
  ],
});
