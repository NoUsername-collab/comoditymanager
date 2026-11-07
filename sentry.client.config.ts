import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // "zalmox@0.9.0+af09b76": which release an error comes from (set in next.config.ts).
  release: process.env.NEXT_PUBLIC_SENTRY_RELEASE,

  // Only enable in production
  enabled: process.env.NODE_ENV === "production",

  // Performance: sample 80% of transactions
  tracesSampleRate: 0.8,

  // Session replay: capture 10% of sessions, 100% of error sessions
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    Sentry.replayIntegration(),
  ],

  // Don't send PII (guest names, phones, emails)
  sendDefaultPii: false,

  // Filter out noisy errors
  ignoreErrors: [
    // Browser extensions
    "ResizeObserver loop",
    // Network failures
    "Failed to fetch",
    "NetworkError",
    "Load failed",
    // Next.js navigation
    "NEXT_REDIRECT",
    "NEXT_NOT_FOUND",
  ],
});
